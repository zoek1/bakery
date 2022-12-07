'use strict';
require("dotenv").config();

const { utils: { setJSON } } = require('@axelar-network/axelar-local-dev');
const {  Wallet, constants: { AddressZero } } = require('ethers');
const { getGasPrice, getDepositAddress } = require('./utils.js');
const BakeryTest = require("../contracts/BakeryTest.js");


async function test(env, chains, args, wallet) {
    function wrappedGetGasPrice(source, destination, tokenAddress) {
        return getGasPrice(env, source, destination, tokenAddress);
    }
    function wrappedGetDepositAddress(source, destination, destinationAddress, symbol) {
        return getDepositAddress(env, source, destination, destinationAddress, symbol);
    }

    await BakeryTest.test(chains, wallet, {
        getGasPrice: wrappedGetGasPrice,
        getDepositAddress: wrappedGetDepositAddress,
        args: args
    });
}

module.exports = {
    test,
}

if (require.main === module) {
    const private_key = process.env.EVM_PRIVATE_KEY;
    const wallet = new Wallet(private_key);

    const env = process.argv[2];
    if(env == null || (env !== 'testnet' && env !== 'local')) throw new Error('Need to specify tesntet or local as an argument to this script.');
    const chains = env === 'local' ? require(`../info/local.json`) : require(`../info/testnet.json`);
    const args = process.argv.slice(4);

    test(env, chains, args, wallet);
}