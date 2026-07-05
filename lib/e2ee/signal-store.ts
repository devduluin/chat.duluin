import type { Direction, KeyPairType, StorageType } from "@privacyresearch/libsignal-protocol-typescript";
import { arrayBufferToBase64, base64ToArrayBuffer } from "./buffer-utils";

type StoredKeyPair = { pubKey: string; privKey: string };

function serializeKeyPair(keyPair: KeyPairType): StoredKeyPair {
  return {
    pubKey: arrayBufferToBase64(keyPair.pubKey),
    privKey: arrayBufferToBase64(keyPair.privKey),
  };
}

function deserializeKeyPair(keyPair: StoredKeyPair): KeyPairType {
  return {
    pubKey: base64ToArrayBuffer(keyPair.pubKey),
    privKey: base64ToArrayBuffer(keyPair.privKey),
  };
}

export class LocalSignalStore implements StorageType {
  private prefix: string;

  constructor(userId: string) {
    this.prefix = `e2ee_store_${userId}_`;
  }

  private get<T>(key: string): T | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(this.prefix + key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  private set(key: string, value: unknown) {
    if (typeof window === "undefined") return;
    localStorage.setItem(this.prefix + key, JSON.stringify(value));
  }

  async getIdentityKeyPair(): Promise<KeyPairType | undefined> {
    const stored = this.get<StoredKeyPair>("identityKey");
    return stored ? deserializeKeyPair(stored) : undefined;
  }

  async getLocalRegistrationId(): Promise<number | undefined> {
    return this.get<number>("registrationId") ?? undefined;
  }

  async isTrustedIdentity(
    _identifier: string,
    _identityKey: ArrayBuffer,
    _direction: Direction,
  ): Promise<boolean> {
    return true;
  }

  async saveIdentity(
    encodedAddress: string,
    publicKey: ArrayBuffer,
  ): Promise<boolean> {
    this.set(`identity_${encodedAddress}`, arrayBufferToBase64(publicKey));
    return true;
  }

  async loadPreKey(keyId: string | number): Promise<KeyPairType | undefined> {
    const stored = this.get<StoredKeyPair>(`preKey_${keyId}`);
    return stored ? deserializeKeyPair(stored) : undefined;
  }

  async storePreKey(keyId: string | number, keyPair: KeyPairType): Promise<void> {
    this.set(`preKey_${keyId}`, serializeKeyPair(keyPair));
  }

  async removePreKey(keyId: string | number): Promise<void> {
    if (typeof window !== "undefined") {
      localStorage.removeItem(this.prefix + `preKey_${keyId}`);
    }
  }

  async storeSession(encodedAddress: string, record: string): Promise<void> {
    this.set(`session_${encodedAddress}`, record);
  }

  async loadSession(encodedAddress: string): Promise<string | undefined> {
    return this.get<string>(`session_${encodedAddress}`) ?? undefined;
  }

  async loadSignedPreKey(keyId: string | number): Promise<KeyPairType | undefined> {
    const stored = this.get<StoredKeyPair>(`signedPreKey_${keyId}`);
    return stored ? deserializeKeyPair(stored) : undefined;
  }

  async storeSignedPreKey(keyId: string | number, keyPair: KeyPairType): Promise<void> {
    this.set(`signedPreKey_${keyId}`, serializeKeyPair(keyPair));
  }

  async removeSignedPreKey(keyId: string | number): Promise<void> {
    if (typeof window !== "undefined") {
      localStorage.removeItem(this.prefix + `signedPreKey_${keyId}`);
    }
  }

  setRegistrationId(registrationId: number) {
    this.set("registrationId", registrationId);
  }

  setIdentityKeyPair(keyPair: KeyPairType) {
    this.set("identityKey", serializeKeyPair(keyPair));
  }

  /** Registration id used in an existing outbound/inbound session with a peer. */
  findSessionRegistrationIdForPeer(peerUserId: string): number | null {
    const all = this.findAllSessionRegistrationIdsForPeer(peerUserId);
    return all.length > 0 ? all[all.length - 1] : null;
  }

  findAllSessionRegistrationIdsForPeer(peerUserId: string): number[] {
    if (typeof window === "undefined") return [];

    const sessionKeyPrefix = `${this.prefix}session_${peerUserId}.`;
    const registrationIds: number[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(sessionKeyPrefix)) continue;
      const registrationId = Number.parseInt(
        key.slice(sessionKeyPrefix.length),
        10,
      );
      if (!Number.isNaN(registrationId)) {
        registrationIds.push(registrationId);
      }
    }

    return registrationIds.sort((a, b) => a - b);
  }

  /** Latest sender_registration_id seen from this peer's inbound messages. */
  getLastInboundRegistrationId(peerUserId: string): number | null {
    return this.get<number>(`peerReg_${peerUserId}`);
  }

  setLastInboundRegistrationId(peerUserId: string, registrationId: number): void {
    this.set(`peerReg_${peerUserId}`, registrationId);
  }
}
