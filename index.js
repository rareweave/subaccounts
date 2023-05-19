const fetch = typeof window != "object" ? require("undici").fetch : fetch
const webCrypto = (typeof window == "object" ? window?.crypto : null || require("crypto")?.webcrypto)
const subtleCrypto = (typeof window == "object" ? window?.crypto?.subtle : null || require("crypto")?.webcrypto?.subtle)
module.exports = class Subaccount {
    constructor(arweave, signer = null, gqlUrl = `https://arweave-search.goldsky.com/graphql`) {
        this.arweave = arweave
        this.signer = signer
        this.gqlUrl = gqlUrl
        if (!this.signer.decrypt && this.signer.n) {

            this.importedSignerKey = subtleCrypto.importKey('jwk', this.signer, { name: 'RSA-PSS', hash: "SHA-256" }, false, ['sign'])
            this.importedDecryptKey = subtleCrypto.importKey('jwk', this.signer, { name: 'RSA-OAEP', hash: "SHA-256" }, false, ['decrypt'])
            this.importedEncryptKey = subtleCrypto.importKey('jwk', { kty: "RSA", e: "AQAB", n: this.signer.n, alg: "RSA-OAEP-256", ext: true }, { name: 'RSA-OAEP', hash: "SHA-256" }, false, ['encrypt'])
        }
    }
    async fetchSubaccount(address, app) {
        let subaccountTx = await fetch(this.gqlUrl, {
            method: `POST`, headers: { "Content-Type": "application/json" }, body: JSON.stringify({

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
            }`
            })
        }).then(res => res.json()).catch(e => null)

        return subaccountTx?.data?.transactions?.edges[0]
    }
    async makeSubaccount(address, app) {
        if (!this.signer) {
            throw new Error("No signer")
        }
        let existingSubaccount = await this.fetchSubaccount(address, app)
        let jwk
        if (!existingSubaccount) {
            jwk = await this.arweave.wallets.generate()

            let address = await this.arweave.wallets.jwkToAddress(jwk)
            console.log((new TextEncoder()).encode(JSON.stringify(jwk)))
            let tx = await this.arweave.createTransaction({
                data: await this.encrypt(new Uint8Array([1, 2, 3, 4, 5, 6, 7]), { name: "RSA-OAEP" })
            })
            console.log(tx, TextEncoder)
        }

    }

    async sign(tx) {
        if (this.signer?.sign) {
            return this.signer.sign(tx)
        } else {
            return await this.arweave.transactions.sign(tx, this.importedSignerKey)
        }

    }
    async decrypt(data, options) {
        if (this.signer?.decrypt) {
            return this.signer.decrypt(tx)
        } else {
            return await subtleCrypto.decrypt(options, await this.importedDecryptKey, data)

        }

    }
    async encrypt(data, options) {
        if (this.signer?.decrypt) {
            return this.signer.decrypt(tx)
        } else {
            return await subtleCrypto.encrypt(options, await this.importedEncryptKey, data)

        }

    }
}
async function encryptMessage(data) {
    const iv = webCrypto.getRandomValues(new Uint8Array(12));
    let key = await subtleCrypto.generateKey({ name: 'AES-GCM', length: 256 }, true, ['decrypt', 'encrypt'])
    return {
        key: await stringToUint8Array((await subtleCrypto.exportKey('jwk', key)).k),
        iv, encrypted: await webCrypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            key,
            (new TextEncoder()).encode(data)
        )
    }
};
function stringToUint8Array(base64) {
    var dataUrl = "data:application/octet-binary;utf8," + base64;

    return fetch(dataUrl)
        .then(res => res.arrayBuffer())
        .then(buffer => {
            return new Uint8Array(buffer);
        })
}
(async () => {
    let encrypted = (await encryptMessage("hey"))
    console.log(Buffer.from(encrypted.key).toString())
})()