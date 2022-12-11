'use strict';

const {
    getDefaultProvider,
    Contract,
    constants: { AddressZero },
} = require('ethers');
const {
    utils: { deployContract },
} = require('@axelar-network/axelar-local-dev');


const BakeryExecutable = require('../artifacts/contracts/Bakery.sol/BakeryExecutable.json');
const Gateway = require('../artifacts/@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGateway.sol/IAxelarGateway.json');
const IERC20 = require('../artifacts/@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IERC20.sol/IERC20.json');


async function test(chains, wallet, options) {
    const args = options.args || [];
    const getGasPrice = options.getGasPrice;
    const source = chains.find((chain) => chain.name === (args[0] || 'Avalanche'));
    const destination = chains.find((chain) => chain.name === (args[1] || 'Fantom'));
    const amount = Math.floor(parseFloat(args[2])) * 1e6 || 10e6;
    const account = wallet.address;


    for (const chain of [source, destination]) {
        const provider = getDefaultProvider(chain.rpc);
        chain.wallet = wallet.connect(provider);
        chain.contract = new Contract(chain.distributionExecutable, BakeryExecutable.abi, chain.wallet);
        chain.gateway = new Contract(chain.gateway, Gateway.abi, chain.wallet);
        const usdcAddress = chain.gateway.tokenAddresses('aUSDC');
        chain.usdc = new Contract(usdcAddress, IERC20.abi, chain.wallet);
    }

    async function logAccountBalances() {
        console.log(`${account} has ${(await destination.usdc.balanceOf(account)) / 1e6} aUSDC`);
    }

    console.log('--- Initially ---');
    await logAccountBalances();

    const gasLimit = 3e6;
    const gasPrice = await getGasPrice(source, destination, AddressZero);

    const balance = BigInt(await destination.usdc.balanceOf(account));

    const approveTx = await source.usdc.approve(source.contract.address, amount);
    await approveTx.wait();

    const sendTx = await source.contract.send(destination.name, destination.bakeryExecutable, account, 'aUSDC', amount, "Thanks", {
        value: BigInt(Math.floor(gasLimit * gasPrice)),
    });


    const tx =await sendTx.wait();
    tx.events.forEach((event) => console.log(event));

    while (BigInt(await destination.usdc.balanceOf(account)) === balance) {
        await sleep(2000);
    }

    console.log('--- After ---');
    await logAccountBalances();
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, ms);
    });
}


module.exports = {
    test
}