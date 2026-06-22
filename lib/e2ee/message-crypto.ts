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
  const address = new SignalProtocolAddress(bundle.user_id, bundle.registration_id);
  const sessionBuilder = new SessionBuilder(store, address);
  await sessionBuilder.processPreKey(bundleToDeviceType(bundle));
  return address;
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
  for (const bundle of bundles) {
    const address = await ensureSession(store, bundle);
    const cipher = new SessionCipher(store, address);
    const encrypted = await cipher.encrypt(utf8ToArrayBuffer(plaintext));
    deviceMessages.push({
      device_id: bundle.device_id,
      ciphertext: binaryStringToBase64(encrypted.body!),
    });
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

export async function decryptMessage(
  recipientUserId: string,
  senderUserId: string,
  metadata: E2EEMetadata,
  fallbackCiphertext: string,
): Promise<string> {
  const store = new LocalSignalStore(recipientUserId);
  const myDeviceId = getDeviceId(recipientUserId);
  const deviceMessage =
    metadata.device_messages?.find((item) => item.device_id === myDeviceId) ??
    metadata.device_messages?.[0];

  const ciphertextB64 = deviceMessage?.ciphertext ?? fallbackCiphertext;
  const body = base64ToBinaryString(ciphertextB64);

  const address = new SignalProtocolAddress(
    senderUserId,
    metadata.sender_registration_id,
  );
  const cipher = new SessionCipher(store, address);

  const firstByte = body.charCodeAt(0);
  const plaintext =
    firstByte === 0x33
      ? await cipher.decryptPreKeyWhisperMessage(body, "binary")
      : await cipher.decryptWhisperMessage(body, "binary");

  return arrayBufferToUtf8(plaintext);
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
    !looksLikeCiphertext(existing)
  ) {
    cacheReceivedPlaintext(msg.id, existing);
    return { ...msg, content: existing };
  }

  try {
    const metadata =
      typeof msg.metadata === "string"
        ? (JSON.parse(msg.metadata) as E2EEMetadata)
        : (msg.metadata as unknown as E2EEMetadata);

    if (!metadata?.sender_registration_id) {
      throw new Error("Missing E2EE metadata");
    }

    const plaintext = await decryptMessage(
      currentUserId,
      msg.sender_id,
      metadata,
      msg.content,
    );

    cacheReceivedPlaintext(msg.id, plaintext);
    return { ...msg, content: plaintext };
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    const recovered = getReceivedPlaintext(msg.id);
    if (recovered) {
      return { ...msg, content: recovered };
    }
    if (
      existing &&
      !isEncryptedPlaceholder(existing) &&
      !looksLikeCiphertext(existing)
    ) {
      return { ...msg, content: existing };
    }
    if (name === "MessageCounterError") {
      console.warn("E2EE message already decrypted, skipping ratchet advance:", msg.id);
    } else {
      console.error("Failed to decrypt E2EE message:", error);
    }
    return {
      ...msg,
      content: "🔒 Unable to decrypt this message",
    };
  }
}
