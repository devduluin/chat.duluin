export function clearStore(storageKey: string) {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(storageKey);
  }
}
