const webCrypto = typeof window == 'object' ? window?.crypto : null || require('crypto')?.webcrypto;
const subtleCrypto = typeof window == 'object' ? window?.crypto?.subtle : null || require('crypto')?.webcrypto?.subtle;

const encodeTags = (tags) => tags.map((tag) => ({ name: btoa(tag.name), value: btoa(tag.value) }));

const arrayBufferToBase64 = (buffer) => btoa([...new Uint8Array(buffer)].map((b) => String.fromCharCode(b)).join(''));

const b64UrlToBuffer = (b64Url) =>
  new Uint8Array(
    atob(b64Url.replace(/-/g, '+').replace(/_/g, '/'))
      .split('')
      .map((c) => c.charCodeAt(0)),
  ).buffer;

const publicKeyToJwk = async (publicKey) => ({
  kty: 'RSA',
  n: publicKey,
  e: 'AQAB',
  alg: 'RSA-OAEP-256',
  ext: true,
});

const rsaPublicKeyToJwk = async (publicKey) => ({
  kty: 'RSA',
  n: publicKey,
  e: 'AQAB',
  alg: 'RS256',
  ext: true,
});

const importKey = async (jwk) =>
  subtleCrypto.importKey('jwk', jwk, { name: 'RSA-OAEP', hash: { name: 'SHA-256' } }, true, ['encrypt']);

const verifySig = async (publicKeyJWK, masterAddress, signature) => {
  const message = new TextEncoder().encode(masterAddress);
  const signatureBuffer = b64UrlToBuffer(signature);

  const importedPublicKey = await subtleCrypto.importKey(
    'jwk',
    await rsaPublicKeyToJwk(publicKeyJWK),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: { name: 'SHA-256' },
    },
    false,
    ['verify'],
  );

  return subtleCrypto.verify({ name: 'RSASSA-PKCS1-v1_5' }, importedPublicKey, signatureBuffer, message);
};

module.exports = class SubAccount {
  constructor(
    arweave,
    wallet,
    gqlUrl = `https://prophet.rareweave.store/graphql`,
    gateway = `https://prophet.rareweave.store/`,
  ) {
    this.arweave = arweave;
    this.wallet = wallet;
    this.gqlUrl = gqlUrl;
    this.gateway = gateway;
  }

  async fetchSubaccount(address, app) {
    let subaccountTx = await fetch(this.gqlUrl, {
      method: `POST`,
      headers: { 'Content-Type': 'application/json' },
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
    try {
      const response = await fetch(this.gqlUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      });

      const search = await response.json();
      const data = search?.data?.transactions?.edges[0];

      if (!data) {
        throw new Error('Data not found');
      }

      const body = await (await fetch(`${this.gateway}/${data.node.id}`)).json();
      const isVerified = await verifySig(pubkey, data.node.tags[3].value, body.signature);

      return isVerified ? data.node.tags[3] : false;
    } catch (error) {
      console.error(error);
      // throw error;
      return false;
    }
  }

  async makeSubaccount(address, app) {
    if (!this.wallet) {
      throw new Error('No wallet');
    }

    // Determine environment and set publicKey accordingly
    const publicKey =
      typeof window === 'undefined'
        ? {
            kty: this.wallet.kty,
            n: this.wallet.n,
            e: this.wallet.e,
            alg: 'RSA-OAEP-256',
            ext: true,
            key_ops: ['encrypt'],
          }
        : await publicKeyToJwk(await this.wallet.getActivePublicKey());

    const publicJwk = await importKey(publicKey);
    const jwk = await this.arweave.wallets.generate();
    const jwkBuffer = new TextEncoder().encode(JSON.stringify(jwk));

    // Generate a random AES key
    const aesKey = await subtleCrypto.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true,
      ['encrypt', 'decrypt'],
    );

    // Encrypt the JWK with the AES key
    const iv = webCrypto.getRandomValues(new Uint8Array(12));
    const encryptedJwk = await subtleCrypto.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      aesKey,
      jwkBuffer,
    );

    const aesKeyRaw = await subtleCrypto.exportKey('raw', aesKey);
    const encryptedAesKey = await subtleCrypto.encrypt(
      {
        name: 'RSA-OAEP',
      },
      publicJwk,
      aesKeyRaw,
    );

    // Sign the master address to prevent fake transactions
    const message = new TextEncoder().encode(address);
    const signature = await subtleCrypto.sign(
      {
        name: 'RSASSA-PKCS1-v1_5',
      },
      await subtleCrypto.importKey(
        'jwk',
        jwk,
        {
          name: 'RSASSA-PKCS1-v1_5',
          hash: { name: 'SHA-256' },
        },
        false,
        ['sign'],
      ),
      message,
    );

    const signatureBase64Url = this.arweave.utils.bufferTob64Url(signature);

    const tx = await this.arweave.createTransaction({
      data: JSON.stringify({
        encryptedAesKey: arrayBufferToBase64(encryptedAesKey),
        encryptedJwk: arrayBufferToBase64(encryptedJwk),
        iv: arrayBufferToBase64(iv),
        signature: signatureBase64Url,
      }),
      tags: encodeTags([
        {
          name: 'Protocol',
          value: 'Subaccounts',
        },
        {
          name: 'App',
          value: app,
        },
        {
          name: 'Pubkey',
          value: jwk.n,
        },
        {
          name: 'Address',
          value: address,
        },
      ]),
    });

    return {
      jwk: jwk,
      transaction: tx,
    };
  }

  async decrypt(data, options) {
    // Convert base64 format back to ArrayBuffers
    const encryptedAesKeyBuffer = Uint8Array.from(atob(data.encryptedAesKey), (c) => c.charCodeAt(0));
    const encryptedJwkBuffer = Uint8Array.from(atob(data.encryptedJwk), (c) => c.charCodeAt(0));
    const ivBuffer = Uint8Array.from(atob(data.iv), (c) => c.charCodeAt(0));

    let aesKeyBuffer;

    // Different handling for Node.js and Browser environments
    if (typeof window === 'undefined') {
      const privateKey = await subtleCrypto.importKey(
        'jwk',
        this.wallet,
        { name: 'RSA-OAEP', hash: { name: 'SHA-256' } },
        true,
        ['decrypt'],
      );

      aesKeyBuffer = await subtleCrypto.decrypt({ name: 'RSA-OAEP' }, privateKey, encryptedAesKeyBuffer);
    } else {
      aesKeyBuffer = await this.wallet.decrypt(encryptedAesKeyBuffer, { name: 'RSA-OAEP' });
    }

    const aesKey = await subtleCrypto.importKey('raw', aesKeyBuffer, { name: 'AES-GCM', length: 256 }, true, [
      'decrypt',
    ]);

    const jwkBuffer = await subtleCrypto.decrypt({ name: 'AES-GCM', iv: ivBuffer }, aesKey, encryptedJwkBuffer);

    // Convert buffer back to JSON web key
    const jwk = JSON.parse(new TextDecoder().decode(jwkBuffer));

    return jwk;
  }

  async post(tx) {
    // Determine environment
    if (typeof window === 'undefined') {
      // Node.js environment
      const Arweave = require('arweave');
      const arweave = Arweave.init();

      // Sign and Post the transaction using the Arweave SDK
      await this.arweave.transactions.sign(tx, this.wallet);
      let post = await this.arweave.transactions.post(tx);

      return post;

      // Return the response
      return response;
    } else {
      let dispatch = await this.wallet.dispatch(tx);

      return dispatch;
    }
  }
};
