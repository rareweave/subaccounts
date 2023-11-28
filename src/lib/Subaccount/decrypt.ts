import { JWKInterface } from "arweave/node/lib/wallet";
import { subtleCrypto } from "../utils/cryptoUtils";

export async function decrypt(data: any, wallet: any): Promise<JWKInterface> {
  const encryptedAesKeyBuffer = Uint8Array.from(
    atob(data.encryptedAesKey),
    (c) => c.charCodeAt(0),
  );
  const encryptedJwkBuffer = Uint8Array.from(atob(data.encryptedJwk), (c) =>
    c.charCodeAt(0),
  );
  const ivBuffer = Uint8Array.from(atob(data.iv), (c) => c.charCodeAt(0));

  let aesKeyBuffer;

  if (typeof window === "undefined") {
    const privateKey = await subtleCrypto.importKey(
      "jwk",
      wallet,
      { name: "RSA-OAEP", hash: { name: "SHA-256" } },
      true,
      ["decrypt"],
    );

    aesKeyBuffer = await subtleCrypto.decrypt(
      { name: "RSA-OAEP" },
      privateKey,
      encryptedAesKeyBuffer,
    );
  } else {
    aesKeyBuffer = await wallet.decrypt(encryptedAesKeyBuffer, {
      name: "RSA-OAEP",
    });
  }

  const aesKey = await subtleCrypto.importKey(
    "raw",
    aesKeyBuffer,
    { name: "AES-GCM", length: 256 },
    true,
    ["decrypt"],
  );

  const jwkBuffer = await subtleCrypto.decrypt(
    { name: "AES-GCM", iv: ivBuffer },
    aesKey,
    encryptedJwkBuffer,
  );

  const jwk = JSON.parse(new TextDecoder().decode(jwkBuffer));

  return jwk;
}
