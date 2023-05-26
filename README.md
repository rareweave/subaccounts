# Arweave Subaccounts

The Subaccounts Protocol for Arweave allows users to create and manage sub-wallets (subaccounts) under a master wallet, and associate each sub-wallet with the master wallet in a verifiable manner. This opens up new possibilities for dApps built on Arweave, as they can now allow users to create multiple "accounts" while maintaining control over their main wallet.

# Basic Concept

Each subaccount is essentially a new Arweave wallet, but the private key for each sub-wallet is encrypted using the public key of the master wallet. This means that only the holder of the master wallet's private key can decrypt the sub-wallet's private key. The encrypted sub-wallet private key is then stored on the Arweave network.

In addition, the sub-wallet signs a message stating its association with the master wallet, and this signature can be verified using the sub-wallet's public key. This serves as proof that the holder of the sub-wallet's private key is claiming association with the master wallet.

# Installing

to-do

# Docs
