# README

## Prerequisites

1. Node.js (>= v22.0.0) and npm

## Installation

In terminal, type the following command.

```
npm install
```

## Test

In terminal, type the following command.

```
npx hardhat test
```

## Deployment

First, copy `.env_example` to `.env`. And then replace `DEPLOYER'S_PRIVATE_KEY` with your private key. This account will be the contract's owner

In terminal, type the following command.

```
npx hardhat run scripts/deploy.ts --network testnet
```

Or, if you want to deploy the contract to the mainnet

```
npx hardhat run scripts/deploy.ts --network mainnet
```

This will output the deployed contract address. Make sure to write this down. Set this address as the `evm_program_address` in the [collateral_sdk](https://github.com/taoshidev/collateral_sdk)

## Upgrade

In terminal, type the following command.

```
PROXY_ADDRESS=<REPLACE_WITH_PREVIOUSLY_DEPLOYTED_CONTRACT_ADDRESS> npx hardhat run scripts/upgrade.ts --network testnet
```

Or, if you want to upgrade the contract in the mainnet

```
PROXY_ADDRESS=<REPLACE_WITH_PREVIOUSLY_DEPLOYTED_CONTRACT_ADDRESS> npx hardhat run scripts/upgrade.ts --network mainnet
```
