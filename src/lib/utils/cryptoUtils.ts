export const webCrypto =
  typeof window == "object"
    ? window?.crypto
    : null || require("crypto")?.webcrypto;

export const subtleCrypto =
  typeof window == "object"
    ? window?.crypto?.subtle
    : null || require("crypto")?.webcrypto?.subtle;

export function publicKeyToJwk(publicKey: string): any {
  return {
    kty: "RSA",
    n: publicKey,
    e: "AQAB",
    alg: "RSA-OAEP-256",
    ext: true,
  };
}

export function encodeTags(tags: any[]): any[] {
  return tags.map((tag) => ({ name: btoa(tag.name), value: btoa(tag.value) }));
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return btoa(
    [...new Uint8Array(buffer)].map((b) => String.fromCharCode(b)).join(""),
  );
}

export function importKey(jwk: string): Promise<any> {
  return subtleCrypto.importKey(
    "jwk",
    jwk,
    { name: "RSA-OAEP", hash: { name: "SHA-256" } },
    true,
    ["encrypt"],
  );
}
