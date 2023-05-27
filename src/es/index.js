const webCrypto =
  typeof window == "object"
    ? window?.crypto
    : null || require("crypto")?.webcrypto;
const subtleCrypto =
  typeof window == "object"
    ? window?.crypto?.subtle
    : null || require("crypto")?.webcrypto?.subtle;

export default class Subaccount {
  constructor(
    arweave,
    wallet,
    gqlUrl = `https://prophet.rareweave.store/graphql`,
    gateway = `https://prophet.rareweave.store/`
  ) {
    this.arweave = arweave;
    this.wallet = wallet;
    this.gqlUrl = gqlUrl;
    this.gateway = gateway;
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

  async fetchMaster(pubkey, app) {
    let search = await fetch(this.gqlUrl, {
      method: `POST`,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `query {
          transactions(
            tags: [
              {name: "Pubkey", values: ["${pubkey}"]}
              {name: "Protocol", values: ["Subaccounts"]}
              {name: "App", values: ["${app}"]}
            ]
            sort: HEIGHT_DESC, first: 1) {
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

    let data = search?.data?.transactions?.edges[0];

    let body = await (await fetch(`${this.gateway}/${data.node.id}`)).json();

    let verify = await verifySig(
      pubkey,
      data.node.tags[3].value,
      body.signature
    );

    if (!verify) {
      return false;
    }

    return data.node.tags[3];
  }

  async makeSubaccount(address, app) {
    if (!this.wallet) {
      throw new Error("No wallet");
    }

    // Checks arweave to see if an account already exists
    let existingSubaccount = await this.fetchSubaccount(address, app);
    let jwk;

    if (!existingSubaccount) {
      // Import the main wallet
      let publicKey;

      if (typeof window === "undefined") {
        // Node.js environment
        publicKey = {
          kty: this.wallet.kty,
          n: this.wallet.n,
          e: this.wallet.e,
          alg: "RSA-OAEP-256",
          ext: true,
          key_ops: ["encrypt"],
        };
      } else {
        // Browser environment
        publicKey = await publicKeyToJwk(
          await this.wallet.getActivePublicKey()
        );
      }

      let publicJwk = await importKey(publicKey);

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

      // Final Encryption
      const encryptedAesKey = await subtleCrypto.encrypt(
        {
          name: "RSA-OAEP",
        },
        publicJwk,
        aesKeyRaw
      );

      // Sign the master address so people cant fake the TX
      let message = new TextEncoder().encode(address); // Convert the master wallet address to bytes
      let signature = await subtleCrypto.sign(
        {
          name: "RSASSA-PKCS1-v1_5",
        },
        await subtleCrypto.importKey(
          "jwk",
          jwk,
          {
            name: "RSASSA-PKCS1-v1_5",
            hash: { name: "SHA-256" },
          },
          false, // if the key is not extractable
          ["sign"] // key usages
        ),
        message
      );

      let signatureBase64Url = this.arweave.utils.bufferTob64Url(signature);

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
            value: address,
          },
        ]),
      });

      return tx;
    }

    return existingSubaccount;
  }

  async decrypt(data, options) {
    // Assuming these are in base64 format, convert them back to ArrayBuffers
    let encryptedAesKeyBuffer = Uint8Array.from(
      atob(data.encryptedAesKey),
      (c) => c.charCodeAt(0)
    );
    let encryptedJwkBuffer = Uint8Array.from(atob(data.encryptedJwk), (c) =>
      c.charCodeAt(0)
    );
    let ivBuffer = Uint8Array.from(atob(data.iv), (c) => c.charCodeAt(0));

    let aesKeyBuffer;

    if (typeof window === "undefined") {
      // Node.js environment
      let privateKey = await subtleCrypto.importKey(
        "jwk",
        this.wallet,
        {
          name: "RSA-OAEP",
          hash: { name: "SHA-256" },
        },
        true,
        ["decrypt"]
      );

      aesKeyBuffer = await subtleCrypto.decrypt(
        {
          name: "RSA-OAEP",
        },
        privateKey,
        encryptedAesKeyBuffer
      );
    } else {
      // Browser environment
      aesKeyBuffer = await this.wallet.decrypt(encryptedAesKeyBuffer, {
        name: "RSA-OAEP",
      });
    }

    let aesKey = await subtleCrypto.importKey(
      "raw",
      aesKeyBuffer,
      {
        name: "AES-GCM",
        length: 256,
      },
      true,
      ["decrypt"]
    );

    let jwkBuffer = await subtleCrypto.decrypt(
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

async function importKey(jwk) {
  let publicJwk = await subtleCrypto.importKey(
    "jwk",
    jwk,
    {
      name: "RSA-OAEP",
      hash: { name: "SHA-256" },
    },
    true,
    ["encrypt"]
  );
  return publicJwk;
}

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

async function publicKeyToJwk(publicKey) {
  const jwk = {
    kty: "RSA",
    n: publicKey,
    e: "AQAB", // Default public exponent for RSA keys
    alg: "RSA-OAEP-256",
    ext: true,
  };

  return jwk;
}

async function rsaPublicKeyToJwk(publicKey) {
  const jwk = {
    kty: "RSA",
    n: publicKey,
    e: "AQAB", // Default public exponent for RSA keys
    alg: "RS256",
    ext: true,
  };

  return jwk;
}

async function verifySig(publicKeyJWK, masterAddress, signature) {
  // Convert the master wallet address to bytes
  const message = new TextEncoder().encode(masterAddress);

  // Convert the signature from base64Url to ArrayBuffer
  const signatureBuffer = b64UrlToBuffer(signature);

  // Import the public key
  const importedPublicKey = await subtleCrypto.importKey(
    "jwk",
    await rsaPublicKeyToJwk(publicKeyJWK),
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: { name: "SHA-256" },
    },
    false, // if the key is not extractable
    ["verify"] // key usages
  );

  // Verify the signature

  const isValidSignature = await subtleCrypto.verify(
    {
      name: "RSASSA-PKCS1-v1_5",
    },
    importedPublicKey,
    signatureBuffer,
    message
  );

  return isValidSignature;
}

function b64UrlToBuffer(b64Url) {
  let base64 = b64Url.replace(/-/g, "+").replace(/_/g, "/");
  let raw = atob(base64);
  let rawLength = raw.length;
  let array = new Uint8Array(new ArrayBuffer(rawLength));

  for (let i = 0; i < rawLength; i++) {
    array[i] = raw.charCodeAt(i);
  }

  return array.buffer;
}
