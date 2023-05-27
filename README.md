# Arweave Subaccounts

The Subaccounts Protocol for Arweave allows users to create and manage sub-wallets (subaccounts) under a master wallet, and associate each sub-wallet with the master wallet in a verifiable manner. This opens up new possibilities for dApps built on Arweave, as they can now allow users to create multiple "accounts" while maintaining control over their main wallet.

# Basic Concept

Each subaccount is essentially a new Arweave wallet, but the private key for each sub-wallet is encrypted using the public key of the master wallet. This means that only the holder of the master wallet's private key can decrypt the sub-wallet's private key. The encrypted sub-wallet private key is then stored on the Arweave network.

In addition, the sub-wallet signs a message stating its association with the master wallet, and this signature can be verified using the sub-wallet's public key. This serves as proof that the holder of the sub-wallet's private key is claiming association with the master wallet.

# Installing

## Yarn

```
yarn add arweave-subaccounts
```

## Browser

```
<script src="https://www.unpkg.com/arweave-subaccounts@0.0.2/src/es/index.js"></script>
```

# Docs

## Usage

Here is an example of how to use the library:

```js
const Arweave = require('arweave');
const Subaccounts = require('arweave-subaccounts');

const arweave = Arweave.init({
  host: 'arweave.net',
  port: 443,
  protocol: 'https',
});

// Create a wallet instance
const wallet = {
  /* wallet details */
};

// Create a new instance of Subaccount
const subaccount = new Subaccounts(arweave, wallet);

// Use the subaccount methods
// ! If the address already has one with the same app name it will return the TX
subaccount
  .makeSubaccount('Address', 'AppName')
  .then((transaction) => {
    console.log('Subaccount creation transaction:', transaction);
  })
  .catch((error) => {
    console.error('Error creating subaccount:', error);
  });
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

The `fetchSubaccount` method retrieves and returns the sub accounts encrypted data

```javascript
async fetchSubaccount(address, app);
```

- `address` (required): The address of Subaccount being fetched
- `app` (required): The app name

### fetchMaster

the `fetchMaster` method retrieves the master address of given subaccount

```js
async fetchMaster(pubkey, app);
```

- `pubkey` (required): The Pubkey of Subaccount
- `app` (required): The app name

### makeSubaccount

the `makeSubaccount` method returns the Sub account transaction

```js
async makeSubaccount(address, app);
```

- `address` (required): The address of the master wallet
- `app` (required): The app name

### decrypt

The `decrypt` method decrypts subaccount data.

```js
async decrypt(data, options);
```

- `data` (required): The encrypted sub account data
- `app` (required): The app name
