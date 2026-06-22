import {
  KeyHelper,
} from "@privacyresearch/libsignal-protocol-typescript";
import { v4 as uuidv4 } from "uuid";
import { arrayBufferToBase64 } from "./buffer-utils";
import { LocalSignalStore } from "./signal-store";
import { registerDevice, listDevices } from "@/services/v1/e2eeService";

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
  const store = new LocalSignalStore(userId);
  const existingDeviceId = getStoredDeviceId(userId);
  const identityKeyPair = await store.getIdentityKeyPair();

  // Reuse keys already on this browser — do not register a second device identity.
  if (existingDeviceId && identityKeyPair) {
    return existingDeviceId;
  }

  // Device id was lost but Signal keys remain (e.g. partial storage wipe).
  if (identityKeyPair && !existingDeviceId) {
    const devices = await listDevices(userId);
    if (devices.length === 1) {
      storeDeviceId(userId, devices[0].id);
      return devices[0].id;
    }
    throw new Error(
      "Kunci enkripsi ada di browser ini tetapi perangkat tidak dikenali. Gunakan browser yang sama saat pertama kali mengaktifkan obrolan terenkripsi.",
    );
  }

  const registrationId = KeyHelper.generateRegistrationId();
  const newIdentityKeyPair = await KeyHelper.generateIdentityKeyPair();
  store.setRegistrationId(registrationId);
  store.setIdentityKeyPair(newIdentityKeyPair);

  const signedPreKeyId = 1;
  const signedPreKey = await KeyHelper.generateSignedPreKey(newIdentityKeyPair, signedPreKeyId);
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
    identity_pub: arrayBufferToBase64(newIdentityKeyPair.pubKey),
    signed_prekey_id: signedPreKeyId,
    signed_prekey_pub: arrayBufferToBase64(signedPreKey.keyPair.pubKey),
    signed_prekey_sig: arrayBufferToBase64(signedPreKey.signature),
    registration_id: registrationId,
    one_time_prekeys: oneTimePreKeys,
  });

  storeDeviceId(userId, deviceId);
  return deviceId;
}
