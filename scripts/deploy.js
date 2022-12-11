'use strict';

require("dotenv").config();
const { utils: { setJSON}, testnetInfo } = require('@axelar-network/axelar-local-dev');
const {  Wallet, getDefaultProvider } = require('ethers');
const { utils: { deployContract } } = require('@axelar-network/axelar-local-dev');
const BakeryExecutable = require('../artifacts/contracts/Bakery.sol/BakeryExecutable.json');


async function deployBakery(chain, wallet) {
    console.log(`Deploying DistributionExecutable for ${chain.name}.`);
    const contract = await deployContract(wallet, BakeryExecutable, [chain.gateway, chain.gasReceiver]);
    chain.bakeryExecutable = contract.address;
    console.log(`Deployed DistributionExecutable for ${chain.name} at ${chain.bakeryExecutable}.`);
}

async function deploy(env, chains, wallet, example) {
    const promises = [];
    for(const chain of chains) {
        const rpc = chain.rpc;
        const provider = getDefaultProvider(rpc);
        promises.push(deployBakery(chain, wallet.connect(provider)));
    }
    await Promise.all(promises);

    setJSON(chains, `./info/${env}.json`);
}

module.exports = {
    deploy,
}

if (require.main === module) {
    const env = process.argv[2];
    if(env == null || (env !== 'testnet' && env !== 'local')) throw new Error('Need to specify tesntet or local as an argument to this script.');
    const chains = env === 'local'
                   ? require(`../info/local.json`)
                   : require(`../info/testnet.json`);

    const private_key = process.env.EVM_PRIVATE_KEY;
    const wallet = new Wallet(private_key);

    deploy(env, chains, wallet);
}