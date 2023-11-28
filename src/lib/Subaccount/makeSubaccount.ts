import { makeSubaccount } from "../../types/Subaccount/makeSubaccount";
import {
  publicKeyToJwk,
  importKey,
  arrayBufferToBase64,
  encodeTags,
} from "../utils/cryptoUtils";
import { subtleCrypto, webCrypto } from "../utils/cryptoUtils";
import { arweave } from "../utils/arweave";

export async function makeSubaccount(
  address: string,
  app: string,
  wallet: any,
): Promise<makeSubaccount> {
  if (!wallet) {
    throw new Error("No wallet");
  }

  const publicKey = wallet.n
    ? publicKeyToJwk(wallet.n)
    : publicKeyToJwk(await wallet.getActivePublicKey());

  const publicJwk = await importKey(publicKey);
  const jwk = await arweave.wallets.generate();
  const jwkBuffer = new TextEncoder().encode(JSON.stringify(jwk));

  const aesKey = await subtleCrypto.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"],
  );

  const iv = webCrypto.getRandomValues(new Uint8Array(12));
  const encryptedJwk = await subtleCrypto.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    aesKey,
    jwkBuffer,
  );

  const aesKeyRaw = await subtleCrypto.exportKey("raw", aesKey);
  const encryptedAesKey = await subtleCrypto.encrypt(
    {
      name: "RSA-OAEP",
    },
    publicJwk,
    aesKeyRaw,
  );

  const message = new TextEncoder().encode(address);
  const signature = await arweave.crypto.sign(jwk, message);

  const signatureBase64Url = arweave.utils.bufferTob64Url(signature);

  const tx = await arweave.createTransaction({
    data: JSON.stringify({
      encryptedAesKey: arrayBufferToBase64(encryptedAesKey),
      encryptedJwk: arrayBufferToBase64(encryptedJwk),
      iv: arrayBufferToBase64(iv),
      signature: signatureBase64Url,
    }),
    tags: encodeTags([
      {
        name: "Protocol",
        value: "Subaccounts-v1.1",
      },
      {
        name: "App",
        value: app,
      },
      {
        name: "Pubkey",
        value: jwk.n,
      },
      {
        name: "Address",
        value: await arweave.wallets.jwkToAddress(jwk),
      },
    ]),
  });

  return {
    jwk: jwk,
    transaction: tx,
  };
}
