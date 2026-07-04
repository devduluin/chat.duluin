import { KeyHelper } from "@privacyresearch/libsignal-protocol-typescript";
import type { KeyPairType } from "@privacyresearch/libsignal-protocol-typescript";
import { v4 as uuidv4 } from "uuid";
import { arrayBufferToBase64 } from "./buffer-utils";
import { LocalSignalStore } from "./signal-store";
import { registerDevice, listDevices } from "@/services/v1/e2eeService";

const DEVICE_ID_KEY = "e2ee_device_id";

type ServerDevice = {
  id: string;
  platform?: string;
  last_seen_at?: string;
  updated_at?: string;
};

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

function pickServerDevice(devices: ServerDevice[]): ServerDevice | null {
  if (devices.length === 0) return null;
  if (devices.length === 1) return devices[0];

  const webDevices = devices.filter((d) => d.platform === "web");
  const candidates = webDevices.length > 0 ? webDevices : devices;

  return [...candidates].sort((a, b) => {
    const aTime = new Date(a.last_seen_at || a.updated_at || 0).getTime();
    const bTime = new Date(b.last_seen_at || b.updated_at || 0).getTime();
    return bTime - aTime;
  })[0];
}

async function uploadDeviceRegistration(
  userId: string,
  store: LocalSignalStore,
  identityKeyPair: KeyPairType,
  deviceId: string,
): Promise<string> {
  let registrationId = await store.getLocalRegistrationId();
  if (registrationId === undefined) {
    registrationId = KeyHelper.generateRegistrationId();
    store.setRegistrationId(registrationId);
  }

  const signedPreKeyId = 1;
  const signedPreKey = await KeyHelper.generateSignedPreKey(
    identityKeyPair,
    signedPreKeyId,
  );
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

  await registerDevice({
    user_id: userId,
    device_id: deviceId,
    device_name:
      typeof navigator !== "undefined"
        ? navigator.userAgent.slice(0, 120)
        : "web",
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

async function reconcileLostDeviceId(
  userId: string,
  store: LocalSignalStore,
  identityKeyPair: KeyPairType,
): Promise<string> {
  const devices = (await listDevices(userId)) as ServerDevice[];
  const matched = pickServerDevice(devices);

  if (matched) {
    storeDeviceId(userId, matched.id);
    return matched.id;
  }

  // Local keys exist but server has no device — re-register same identity.
  const deviceId = uuidv4();
  return uploadDeviceRegistration(userId, store, identityKeyPair, deviceId);
}

export async function ensureDeviceRegistered(userId: string): Promise<string> {
  const store = new LocalSignalStore(userId);
  const existingDeviceId = getStoredDeviceId(userId);
  const identityKeyPair = await store.getIdentityKeyPair();

  if (existingDeviceId && identityKeyPair) {
    return existingDeviceId;
  }

  if (identityKeyPair && !existingDeviceId) {
    return reconcileLostDeviceId(userId, store, identityKeyPair);
  }

  const registrationId = KeyHelper.generateRegistrationId();
  const newIdentityKeyPair = await KeyHelper.generateIdentityKeyPair();
  store.setRegistrationId(registrationId);
  store.setIdentityKeyPair(newIdentityKeyPair);

  const deviceId = uuidv4();
  return uploadDeviceRegistration(userId, store, newIdentityKeyPair, deviceId);
}
