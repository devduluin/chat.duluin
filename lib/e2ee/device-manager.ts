import {
  KeyHelper,
} from "@privacyresearch/libsignal-protocol-typescript";
import { v4 as uuidv4 } from "uuid";
import { arrayBufferToBase64 } from "./buffer-utils";
import { LocalSignalStore } from "./signal-store";
import { registerDevice } from "@/services/v1/e2eeService";

const DEVICE_ID_KEY = "e2ee_device_id";

function getStoredDeviceId(userId: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(`${DEVICE_ID_KEY}_${userId}`);
}

function storeDeviceId(userId: string, deviceId: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${DEVICE_ID_KEY}_${userId}`, deviceId);
}

export function getDeviceId(userId: string): string {
  return getStoredDeviceId(userId) || "";
}

export async function ensureDeviceRegistered(userId: string): Promise<string> {
  const existing = getStoredDeviceId(userId);
  if (existing) return existing;

  const store = new LocalSignalStore(userId);
  const registrationId = KeyHelper.generateRegistrationId();
  const identityKeyPair = await KeyHelper.generateIdentityKeyPair();
  store.setRegistrationId(registrationId);
  store.setIdentityKeyPair(identityKeyPair);

  const signedPreKeyId = 1;
  const signedPreKey = await KeyHelper.generateSignedPreKey(identityKeyPair, signedPreKeyId);
  await store.storeSignedPreKey(signedPreKeyId, signedPreKey.keyPair);

  const oneTimePreKeys = [] as Array<{ prekey_id: number; prekey_pub: string }>;
  for (let i = 1; i <= 20; i++) {
    const preKey = await KeyHelper.generatePreKey(i);
    await store.storePreKey(i, preKey.keyPair);
    oneTimePreKeys.push({
      prekey_id: i,
      prekey_pub: arrayBufferToBase64(preKey.keyPair.pubKey),
    });
  }

  const deviceId = uuidv4();
  await registerDevice({
    user_id: userId,
    device_id: deviceId,
    device_name: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 120) : "web",
    platform: "web",
    identity_pub: arrayBufferToBase64(identityKeyPair.pubKey),
    signed_prekey_id: signedPreKeyId,
    signed_prekey_pub: arrayBufferToBase64(signedPreKey.keyPair.pubKey),
    signed_prekey_sig: arrayBufferToBase64(signedPreKey.signature),
    registration_id: registrationId,
    one_time_prekeys: oneTimePreKeys,
  });

  storeDeviceId(userId, deviceId);
  return deviceId;
}
