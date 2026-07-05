import {
  SessionBuilder,
  SessionCipher,
  SignalProtocolAddress,
} from "@privacyresearch/libsignal-protocol-typescript";
import type { DeviceType } from "@privacyresearch/libsignal-protocol-typescript/lib/session-types";
import { getUserKeyBundles } from "@/services/v1/e2eeService";
import { arrayBufferToUtf8, base64ToArrayBuffer, base64ToBinaryString, binaryStringToBase64, utf8ToArrayBuffer } from "./buffer-utils";
import { getDeviceId } from "./device-manager";
import {
  cacheSentPlaintext,
  getSentPlaintext,
  isEncryptedPlaceholder,
  looksLikeCiphertext,
} from "./sent-plaintext-cache";
import {
  cacheReceivedPlaintext,
  getReceivedPlaintext,
} from "./decrypted-plaintext-cache";
import { LocalSignalStore } from "./signal-store";
import type { E2EEMetadata, PreKeyBundle } from "./types";
import { serializePeerDecrypt } from "./decrypt-queue";

function resolveSessionRegistrationId(
  store: LocalSignalStore,
  peerUserId: string,
  bundles: PreKeyBundle[],
): number | null {
  const lastInbound = store.getLastInboundRegistrationId(peerUserId);
  if (lastInbound != null) {
    const hasSession = store
      .findAllSessionRegistrationIdsForPeer(peerUserId)
      .includes(lastInbound);
    if (hasSession) {
      return lastInbound;
    }
  }

  const existing = store.findAllSessionRegistrationIdsForPeer(peerUserId);
  if (existing.length === 0) return null;

  const bundleRegIds = new Set(bundles.map((bundle) => bundle.registration_id));
  const orphanSessions = existing.filter((id) => !bundleRegIds.has(id));
  if (orphanSessions.length > 0) {
    return orphanSessions[orphanSessions.length - 1];
  }

  return existing[existing.length - 1];
}

function bundleToDeviceType(bundle: PreKeyBundle): DeviceType {
  const device: DeviceType = {
    identityKey: base64ToArrayBuffer(bundle.identity_pub),
    signedPreKey: {
      keyId: bundle.signed_prekey_id,
      publicKey: base64ToArrayBuffer(bundle.signed_prekey_pub),
      signature: base64ToArrayBuffer(bundle.signed_prekey_sig),
    },
    registrationId: bundle.registration_id,
  };

  if (bundle.prekey_id != null && bundle.prekey_pub) {
    device.preKey = {
      keyId: bundle.prekey_id,
      publicKey: base64ToArrayBuffer(bundle.prekey_pub),
    };
  }

  return device;
}

async function ensureSession(store: LocalSignalStore, bundle: PreKeyBundle) {
  const address = new SignalProtocolAddress(
    bundle.user_id,
    bundle.registration_id,
  );
  const existing = await store.loadSession(address.toString());
  if (!existing) {
    const sessionBuilder = new SessionBuilder(store, address);
    await sessionBuilder.processPreKey(bundleToDeviceType(bundle));
  }
  return address;
}

async function encryptForAddress(
  store: LocalSignalStore,
  address: SignalProtocolAddress,
  plaintext: string,
): Promise<string> {
  const cipher = new SessionCipher(store, address);
  const encrypted = await cipher.encrypt(utf8ToArrayBuffer(plaintext));
  return binaryStringToBase64(encrypted.body!);
}

export async function encryptMessageForUser(
  senderUserId: string,
  recipientUserId: string,
  plaintext: string,
): Promise<{ ciphertext: string; e2ee: E2EEMetadata }> {
  const store = new LocalSignalStore(senderUserId);
  const senderDeviceId = getDeviceId(senderUserId);
  const senderRegistrationId = (await store.getLocalRegistrationId()) || 1;
  const bundles = await getUserKeyBundles(recipientUserId);
  if (!bundles.length) {
    throw new Error("No key bundles available for recipient");
  }

  const deviceMessages: Array<{ device_id: string; ciphertext: string }> = [];
  const existingRegistrationId = resolveSessionRegistrationId(
    store,
    recipientUserId,
    bundles,
  );

  if (existingRegistrationId != null) {
    const address = new SignalProtocolAddress(
      recipientUserId,
      existingRegistrationId,
    );
    const ciphertext = await encryptForAddress(store, address, plaintext);
    const bundle =
      bundles.find((item) => item.registration_id === existingRegistrationId) ??
      bundles.find((item) => item.device_id === getDeviceId(recipientUserId)) ??
      bundles[0];
    deviceMessages.push({
      device_id: bundle.device_id,
      ciphertext,
    });
  } else {
    for (const bundle of bundles) {
      const address = await ensureSession(store, bundle);
      const ciphertext = await encryptForAddress(store, address, plaintext);
      deviceMessages.push({
        device_id: bundle.device_id,
        ciphertext,
      });
    }
  }

  return {
    ciphertext: deviceMessages[0].ciphertext,
    e2ee: {
      v: 1,
      suite: "signal-v1",
      sender_device_id: senderDeviceId,
      sender_registration_id: senderRegistrationId,
      device_messages: deviceMessages,
    },
  };
}

function isSignalCiphertextBody(body: string): boolean {
  if (!body || body.length < 2) return false;
  const firstByte = body.charCodeAt(0);
  return firstByte === 0x32 || firstByte === 0x33;
}

function isMessageCounterError(error: unknown): boolean {
  return error instanceof Error && error.name === "MessageCounterError";
}

async function decryptSignalBody(
  cipher: SessionCipher,
  body: string,
): Promise<ArrayBuffer> {
  const firstByte = body.charCodeAt(0);
  if (firstByte !== 0x32 && firstByte !== 0x33) {
    throw new Error("Unrecognized Signal message type");
  }

  // libsignal-typescript prefixes both WhisperMessage (session follow-ups) and
  // PreKeyWhisperMessage (initial) with 0x33. PreKeyWhisperMessage first causes
  // protobuf RangeError on normal follow-up ciphertext (~66 bytes).
  if (firstByte === 0x32) {
    return cipher.decryptWhisperMessage(body, "binary");
  }

  try {
    return await cipher.decryptWhisperMessage(body, "binary");
  } catch (error) {
    if (isMessageCounterError(error)) {
      throw error;
    }
    return cipher.decryptPreKeyWhisperMessage(body, "binary");
  }
}

export async function decryptMessage(
  recipientUserId: string,
  senderUserId: string,
  metadata: E2EEMetadata,
  fallbackCiphertext: string,
): Promise<string> {
  const store = new LocalSignalStore(recipientUserId);
  const myDeviceId = getDeviceId(recipientUserId);
  const deviceMessages = metadata.device_messages ?? [];

  const ciphertextCandidates: string[] = [];
  if (myDeviceId) {
    const exact = deviceMessages.find(
      (item) => item.device_id === myDeviceId && item.ciphertext,
    );
    if (exact?.ciphertext) {
      ciphertextCandidates.push(exact.ciphertext);
    }
  }
  for (const item of deviceMessages) {
    if (item.ciphertext && !ciphertextCandidates.includes(item.ciphertext)) {
      ciphertextCandidates.push(item.ciphertext);
    }
  }
  if (
    deviceMessages.length === 0 &&
    fallbackCiphertext &&
    looksLikeCiphertext(fallbackCiphertext) &&
    !ciphertextCandidates.includes(fallbackCiphertext)
  ) {
    ciphertextCandidates.push(fallbackCiphertext);
  }

  if (ciphertextCandidates.length === 0) {
    throw new Error("No ciphertext available for this device");
  }

  const registrationIds = [
    metadata.sender_registration_id,
    ...store.findAllSessionRegistrationIdsForPeer(senderUserId),
  ].filter((id, index, arr) => id != null && arr.indexOf(id) === index);

  let lastError: unknown;
  for (const registrationId of registrationIds) {
    const address = new SignalProtocolAddress(senderUserId, registrationId);
    const cipher = new SessionCipher(store, address);

    for (const ciphertextB64 of ciphertextCandidates) {
      try {
        const body = base64ToBinaryString(ciphertextB64);
        if (!isSignalCiphertextBody(body)) {
          continue;
        }
        const plaintext = await decryptSignalBody(cipher, body);
        store.setLastInboundRegistrationId(senderUserId, registrationId);
        return arrayBufferToUtf8(plaintext);
      } catch (error) {
        lastError = error;
      }
    }
  }

  throw lastError ?? new Error("No ciphertext available for this device");
}

function resolveSenderPlaintext(
  msg: Message,
  options?: { senderPlaintext?: string },
): string {
  const candidates = [options?.senderPlaintext, getSentPlaintext(msg.id), msg.content];

  for (const candidate of candidates) {
    if (!candidate || isEncryptedPlaceholder(candidate) || looksLikeCiphertext(candidate)) {
      continue;
    }
    cacheSentPlaintext(msg.id, candidate);
    return candidate;
  }

  return "🔒 Encrypted message";
}

function isDecryptFailureMessage(content: string): boolean {
  return (
    content === "🔒 Unable to decrypt this message" ||
    content === "Bad MAC" ||
    content === "Error: Bad MAC" ||
    content.startsWith("Error: Bad") ||
    content.includes("invalid wire type") ||
    content.includes("Unrecognized Signal message type")
  );
}

function isRecoverableDecryptError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : "";
  return (
    name === "RangeError" ||
    message.includes("index out of range") ||
    message.includes("Bad MAC") ||
    message.includes("MessageCounter") ||
    message.includes("invalid wire type") ||
    message.includes("No ciphertext available") ||
    message.includes("Unrecognized Signal message type")
  );
}

export async function processIncomingE2EEMessage(
  msg: Message,
  currentUserId: string,
  options?: { senderPlaintext?: string; existingPlaintext?: string },
): Promise<Message> {
  if (msg.message_type !== "e2ee_text") {
    return msg;
  }

  // Ciphertext is encrypted for recipient devices; only the sender client knows plaintext.
  if (msg.sender_id === currentUserId) {
    return {
      ...msg,
      content: resolveSenderPlaintext(msg, options),
    };
  }

  const cached = getReceivedPlaintext(msg.id);
  if (cached) {
    return { ...msg, content: cached };
  }

  const existing = options?.existingPlaintext;
  if (
    existing &&
    !isEncryptedPlaceholder(existing) &&
    !looksLikeCiphertext(existing) &&
    !isDecryptFailureMessage(existing)
  ) {
    cacheReceivedPlaintext(msg.id, existing);
    return { ...msg, content: existing };
  }

  if (
    msg.content &&
    !looksLikeCiphertext(msg.content) &&
    !isEncryptedPlaceholder(msg.content) &&
    !isDecryptFailureMessage(msg.content)
  ) {
    cacheReceivedPlaintext(msg.id, msg.content);
    return msg;
  }

  try {
    const metadata =
      typeof msg.metadata === "string"
        ? (JSON.parse(msg.metadata) as E2EEMetadata)
        : (msg.metadata as unknown as E2EEMetadata);

    if (!metadata?.sender_registration_id) {
      throw new Error("Missing E2EE metadata");
    }

    const plaintext = await serializePeerDecrypt(
      msg.conversation_id,
      msg.sender_id,
      () =>
        decryptMessage(
          currentUserId,
          msg.sender_id,
          metadata,
          looksLikeCiphertext(msg.content) ? msg.content : "",
        ),
    );

    cacheReceivedPlaintext(msg.id, plaintext);
    return { ...msg, content: plaintext };
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    const message = error instanceof Error ? error.message : "";
    const recovered = getReceivedPlaintext(msg.id);
    if (recovered) {
      return { ...msg, content: recovered };
    }
    if (
      existing &&
      !isEncryptedPlaceholder(existing) &&
      !looksLikeCiphertext(existing) &&
      !isDecryptFailureMessage(existing)
    ) {
      return { ...msg, content: existing };
    }
    if (name === "MessageCounterError") {
      console.warn("E2EE message already decrypted, skipping ratchet advance:", msg.id);
    } else if (isRecoverableDecryptError(error)) {
      console.warn("E2EE decrypt failed:", msg.id, message || name);
    } else {
      console.warn("Failed to decrypt E2EE message:", msg.id, error);
    }
    return {
      ...msg,
      content: "🔒 Unable to decrypt this message",
    };
  }
}
