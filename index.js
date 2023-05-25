const fetch = typeof window != "object" ? require("undici").fetch : fetch;
const webCrypto =
  typeof window == "object"
    ? window?.crypto
    : null || require("crypto")?.webcrypto;
const subtleCrypto =
  typeof window == "object"
    ? window?.crypto?.subtle
    : null || require("crypto")?.webcrypto?.subtle;

module.exports = class Subaccount {
  constructor(
    arweave,
    signer = null,
    gqlUrl = `https://arweave-search.goldsky.com/graphql`
  ) {
    this.arweave = arweave;
    this.signer = signer;
    this.gqlUrl = gqlUrl;
    this.publicKeyJWK = {
      kty: signer.kty,
      n: signer.n,
      e: signer.e,
      alg: "RSA-OAEP-256",
      ext: true,
      key_ops: ["encrypt"],
    };
    if (!this.signer.decrypt && this.signer.n) {
      this.importedSignerKey = subtleCrypto.importKey(
        "jwk",
        this.signer,
        { name: "RSA-PSS", hash: "SHA-256" },
        false,
        ["sign"]
      );
      this.importedDecryptKey = subtleCrypto.importKey(
        "jwk",
        this.signer,
        { name: "RSA-OAEP", hash: "SHA-256" },
        false,
        ["decrypt"]
      );
      this.importedEncryptKey = subtleCrypto.importKey(
        "jwk",
        {
          kty: "RSA",
          e: "AQAB",
          n: this.signer.n,
          alg: "RSA-OAEP-256",
          ext: true,
        },
        { name: "RSA-OAEP", hash: "SHA-256" },
        false,
        ["encrypt"]
      );
    }
  }

  async fetchSubaccount(address, app) {
    let subaccountTx = await fetch(this.gqlUrl, {
      method: `POST`,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `query {
                        transactions(sort:HEIGHT_DESC,owners:["${address}"], 
                        tags:[{ name: "Protocol", values: ["Subaccounts"] },{name:"App",values:["${app}"]}], first:1) {
                            edges {
                                node {
                                    id
                                    tags {
                                        name
                                        value
                            }
                        }
                    }
                }
            }`,
      }),
    })
      .then((res) => res.json())
      .catch((e) => null);

    return subaccountTx?.data?.transactions?.edges[0];
  }

  async makeSubaccount(address, app) {
    if (!this.signer) {
      throw new Error("No signer");
    }

    // Checks arweave to see if an account already exists
    let existingSubaccount = await this.fetchSubaccount(address, app);
    let jwk;

    if (!existingSubaccount) {
      // Import the main wallet
      let publicJwk = await subtleCrypto.importKey(
        "jwk",
        this.publicKeyJWK,
        {
          name: "RSA-OAEP",
          hash: { name: "SHA-256" },
        },
        true,
        ["encrypt"]
      );

      // Generate the new Sub wallet
      jwk = await this.arweave.wallets.generate();

      // Encoode the key
      const jwkBuffer = new TextEncoder().encode(JSON.stringify(jwk));

      // Generate a random AES key
      let aesKey = await subtleCrypto.generateKey(
        {
          name: "AES-GCM",
          length: 256,
        },
        true,
        ["encrypt", "decrypt"]
      );

      // Encrypt the JWK with the AES key
      let iv = webCrypto.getRandomValues(new Uint8Array(12)); // Initialization vector.
      let encryptedJwk = await subtleCrypto.encrypt(
        {
          name: "AES-GCM",
          iv: iv,
        },
        aesKey,
        jwkBuffer
      );

      // Export the AES key as raw, so it can be encrypted with RSA
      let aesKeyRaw = await subtleCrypto.exportKey("raw", aesKey);

      // Finaly Encryption
      const encryptedAesKey = await subtleCrypto.encrypt(
        {
          name: "RSA-OAEP",
        },
        publicJwk,
        aesKeyRaw
      );

      let mainAddress = await this.arweave.wallets.ownerToAddress(jwk.n);

      let message = new TextEncoder().encode(mainAddress); // Convert the master wallet address to bytes
      let signature = await this.arweave.crypto.sign(jwk, message);

      let signatureBase64Url = this.arweave.utils.bufferTob64Url(signature);
      console.log(signatureBase64Url);
      let tx = await this.arweave.createTransaction({
        data: JSON.stringify({
          encryptedAesKey: arrayBufferToBase64(encryptedAesKey),
          encryptedJwk: arrayBufferToBase64(encryptedJwk),
          iv: arrayBufferToBase64(iv),
          signature: signatureBase64Url,
        }),
        tags: encodeTags([
          {
            name: "Protocol",
            value: "Subaccounts",
          },
          {
            name: "App",
            value: `${app}`,
          },
          {
            name: "Pubkey",
            value: `${jwk.n}`,
          },
          {
            name: "Address",
            value: mainAddress,
          },
        ]),
      });

      return tx;
    }
  }

  async post(tx) {
    await this.arweave.transactions.sign(tx, this.signer);

    let response = await this.arweave.transactions.post(tx);

    return response;
  }

  async decrypt(data, options) {
    if (this.signer?.decrypt) {
      return this.signer.decrypt(tx);
    } else {
      let privateJWK = await webCrypto.subtle.importKey(
        "jwk",
        this.signer,
        {
          name: "RSA-OAEP",
          hash: { name: "SHA-256" },
        },
        true,
        ["decrypt"]
      );

      // Assuming these are in base64 format, convert them back to ArrayBuffers
      let encryptedAesKeyBuffer = Uint8Array.from(
        atob(data.encryptedAesKey),
        (c) => c.charCodeAt(0)
      );
      let encryptedJwkBuffer = Uint8Array.from(atob(data.encryptedJwk), (c) =>
        c.charCodeAt(0)
      );
      let ivBuffer = Uint8Array.from(atob(data.iv), (c) => c.charCodeAt(0));

      let aesKeyBuffer = await webCrypto.subtle.decrypt(
        {
          name: "RSA-OAEP",
        },
        privateJWK,
        encryptedAesKeyBuffer
      );

      let aesKey = await webCrypto.subtle.importKey(
        "raw",
        aesKeyBuffer,
        {
          name: "AES-GCM",
          length: 256,
        },
        true,
        ["decrypt"]
      );

      let jwkBuffer = await webCrypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: ivBuffer,
        },
        aesKey,
        encryptedJwkBuffer
      );

      let jwkStr = new TextDecoder().decode(jwkBuffer);
      let jwk = JSON.parse(jwkStr);

      return jwk;
    }
  }

  async encrypt(data, options) {
    if (this.signer?.decrypt) {
      return this.signer.decrypt(tx);
    } else {
      return await subtleCrypto.encrypt(
        options,
        await this.importedEncryptKey,
        data
      );
    }
  }

  async encodeTags(tags) {
    return tags.map((tag) => ({
      name: btoa(tag.name),
      value: btoa(tag.value),
    }));
  }
};

function encodeTags(tags) {
  return tags.map((tag) => ({
    name: btoa(tag.name),
    value: btoa(tag.value),
  }));
}

function arrayBufferToBase64(buffer) {
  var binary = "";
  var bytes = new Uint8Array(buffer);
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
