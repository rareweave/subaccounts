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

const publicKeyToJwk = (publicKey) => ({
  kty: 'RSA',
  n: publicKey,
  e: 'AQAB',
  alg: 'RSA-OAEP-256',
  ext: true,
});

const rsaPublicKeyToJwk = (publicKey) => ({
  kty: 'RSA',
  n: publicKey,
  e: 'AQAB',
  alg: 'RSA-PSS',
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
      name: 'RSA-PSS',
      hash: { name: 'SHA-256' },
    },
    false,
    ['verify'],
  );

  return subtleCrypto.verify({ name: 'RSA-PSS' }, importedPublicKey, signatureBuffer, message);
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

    let subaccountTxMeta = subaccountTx?.data?.transactions?.edges[0]
    if (!subaccountTxMeta) {
      return null
    } else {
      let subaccountTxId = subaccountTxMeta?.node?.id
      let subaccountTxTags = subaccountTxMeta?.node?.tags
      return {
        txId: subaccountTxId,
        address: subaccountTxTags.find(tag => tag.name == "Address")?.value,
        pubkey: subaccountTxTags.find(tag => tag.name == "Pubkey")?.value,
        app: subaccountTxTags.find(tag => tag.name == "App")?.value
      }
    }

  }
  async useSubaccount(app) {
    let subaccount = null
    let pubkey = this.wallet.n ? this.wallet.n : await this.wallet.getActivePublicKey()
    let existingSubaccount = await this.fetchSubaccount(await this.arweave.wallets.ownerToAddress(pubkey), app)
    if (existingSubaccount) {
      let sadata = await fetch(this.gateway + existingSubaccount.txId).then(res => res.json())
      subaccount = { txId: existingSubaccount.txId, jwk: await this.decrypt(sadata), address: existingSubaccount.address }

    } else {
      let newSubaccount = await this.makeSubaccount(await this.arweave.wallets.ownerToAddress(pubkey), app)
      await this.post(newSubaccount.transaction)
      subaccount = { txId: newSubaccount.transaction.id, jwk: newSubaccount.jwk, address: await this.arweave.wallets.jwkToAddress(newSubaccount.jwk) }
    }
    return subaccount
  }
  async fetchMaster(address, app) {
    try {
      const response = await fetch(this.gqlUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `query {
          transactions(
            tags: [
              {name: "Address", values: ["${address}"]}
              {name: "Protocol", values: ["Subaccounts"]}
              {name: "App", values: ["${app}"]}
            ]
            sort: HEIGHT_DESC, first: 1) {
            edges {
              node {
                id
                owner {
                  address
                  key
                }
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
        return null;
      }
      let pubkey = data.node.tags.find(t => t.name == "Pubkey")?.value
      if (!pubkey || await this.arweave.wallets.ownerToAddress(pubkey) != address) { return null }
   
      const body = await (await fetch(`${this.gateway}/${data.node.id}`)).json();
      
      const isVerified = await verifySig(pubkey, address, body.signature);
      console.log(data, isVerified, pubkey, address, body.signature)
      return isVerified ? { address: data.node.owner.address, pubkey: data.node.owner.key } : null;
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
      this.wallet.n
        ? publicKeyToJwk(this.wallet.n)
        : publicKeyToJwk(await this.wallet.getActivePublicKey());

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
        name: 'RSA-PSS',
      },
      await subtleCrypto.importKey(
        'jwk',
        jwk,
        {
          name: 'RSA-PSS',
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
          value: await this.arweave.wallets.jwkToAddress(jwk),
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
      // Sign and Post the transaction using the Arweave SDK
      await this.arweave.transactions.sign(tx, this.wallet.p ? this.wallet : "use_wallet");
      let post = await this.arweave.transactions.post(tx);

      return post;
    } else {
      let dispatch = await this.wallet.dispatch(tx);

      return dispatch;
    }
  }
};
