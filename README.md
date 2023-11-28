# Arweave Subaccounts

The Subaccounts Protocol for Arweave allows users to create and manage sub-wallets (subaccounts) under a master wallet, with accociation of each sub-wallet with the master wallet in a verifiable manner.

This opens up new possibilities for dApps built on the top of Arweave, as they can have full control over wallet for themselves (which means much better UX, no requirement for user confirmation for actions, more flexibility, etc), while maintaining almost full isolation from main account, resulting in flexible, UX firendly and very secure way of interacting with keys.

# Basic Concept

Each subaccount is essentially a new Arweave wallet, but the private key for each sub-wallet is encrypted using the public key of the master wallet. This means that only the owner of the master wallet's private key can decrypt the sub-wallet's private key. The encrypted sub-wallet private key is then stored on the Arweave network.

In addition, the sub-wallet signs a message stating its association with the master wallet, and this signature can be verified using the sub-wallet's public key. This serves as proof that the real owner of the sub-wallet's private key is claiming association with the master wallet.

# Installing

## Yarn

```
yarn add https://arweave.net/zXnMIZiiUEhKRcT1NqIKnDG26ZJX3Vt2tQU95XUNFsc
```

## Importing

```js
const Subaccounts = require("arweave-subaccounts");
```

# Docs

## Usage

Here is an example of how to use the library:

```js
const Arweave = require("arweave");
const ArSubaccounts = require("arweave-subaccounts");

const arweave = Arweave.init({
  host: "g8way.io",
  port: 443,
  protocol: "https",
});

// Create a wallet instance
// Or just use wallet instance of another provider
const wallet = {
  /* wallet details */
};

// Create a new instance of Subaccount
const subaccounts = new ArSubaccounts(arweave, wallet);

// Use the subaccount methods
// useSubaccount() is probably the only function you'll ever need. It returns JWK and address
let subaccount = await subaccounts.useSubaccount("Test"); //"Test" is app name
subaccount.jwk; // is Arweave JWK key
subaccount.address; // is subaccount's address
subaccount.txId; // is subaccount's record txid
```

## API

### Class: SubAccount

The `SubAccount` class provides methods for interacting with subaccounts.

#### Constructor

The `SubAccount` class constructor accepts the following parameters:

- `arweave` (required): An instance of the Arweave client.
- `wallet` (required): The wallet object containing the necessary keys for creating and decrypting subaccounts. (Typicaly JWK, or web wallet like arweave.app)
- `gqlUrl` (optional): The GraphQL API URL. Default: `https://prophet.rareweave.store/graphql`.
- `gateway` (optional): The gateway URL. Default: `https://prophet.rareweave.store/`.

#### fetchSubaccount

The `fetchSubaccount` method fetches user's subaccount for given app. Subaccount info includes pubkey and encrypted privkey

```javascript
async fetchSubaccount(address, app);
```

- `address` (required): The address of Subaccount being fetched
- `app` (required): The app name

### fetchMaster

the `fetchMaster` method retrieves the master address of given subaccount

```js
async fetchMaster(address, app);
```

- `address` (required): The address of Subaccount
- `app` (required): The app name

### makeSubaccount

the `makeSubaccount` method returns the JWK of the subwallet, and the tx needed to store on Arweave

```js
async makeSubaccount(address, app);
```

- `address` (required): The address of the master wallet
- `app` (required): The app name

### post

the `post` method essentially is a helper function for posting the tx

```js
async post(tx)
```

- `tx` (required): The Transaction object returned from makeSubaccount()

### decrypt

The `decrypt` method decrypts subaccount data.

```js
async decrypt(data, options);
```

- `data` (required): The encrypted sub account data
- `app` (required): The app name
