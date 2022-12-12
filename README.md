# Buy me a cookie (Bakery)

Give your audience an easy way to say thanks.

## Setup
```
yarn
```

## Generate new address
Save the private and public key
```
node scripts/generator.js
```
**Note**: Add funds from faucets of your favorite projects. (Polygon, Moonbase, BSC, ETH Goerli, Fantom, Avax).
Also some aUSDC will be required.

## Compile and Deploy Contracts

```
yarn exec hardhat compile
node scripts/deploy.js testnet <EVM_ADDRESS>
```

## Deploy contracts
Contract is deployed to following networks, so user can recive and transfer fund in any chain,
and it will be forwarded to the corresponding chain:
- Polygon
- Moonbase
- BSC
- ETH Goerli
- Fantom
- Avax

```
export EVM_PRIVATE_KEY=<private key>
node scripts/deploy.js testnet <public key>
```

## Start Server
```
yarn start
```

## Backlog
**Phase 1**
- [X] As user I can create a profile from any chain (using Axelars GMP)
- [X] As user I can set my preferred chain to receive tips (using Axelars GMP)
- [X] As user I can receive tips even if i'm not registered but with a warning 
- [X] As user I can see my profile page if i'm registered (quering deployed contracts)
- [X] As user I can see all tips i received across all blockchains (quering deployed contracts)
- [X] As sponsor I tip with aUSDC any valid address or ENS name using Axelars GMP
- [X] As user I get the profile page when i paste one address or ENS name in the searchbar
- [X] As user I get a badge to include in my repository

**Phase 2**
- [ ] As sponsor I receive one NFT for contribute to X profile using Axelars GMP
- [ ] As user I can configure reward and memberships for certain contributions using Axelars GMP
- [ ] As sponsor I can set recurrent contributions