import {useEffect} from "react";
import { Contract, ethers, getDefaultProvider, providers } from "ethers";
import {
  AxelarQueryAPI,
  Environment,
  EvmChain,
  GasToken,
} from "@axelar-network/axelarjs-sdk";

const AxelarGatewayContract = require("../artifacts/@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGateway.sol/IAxelarGateway.json");
const BakeryExecutableContract = require("../artifacts/contracts/Bakery.sol/BakeryExecutable.json");
const chains = require("../info/testnet.json")

const moonbeamChain = chains.find(chain => chain.name === "Moonbeam");
const avalancheChain = chains.find(chain => chain.name === "Avalanche");
const fantomChain = chains.find(chain => chain.name === "Fantom");
const polygonChain = chains.find(chain => chain.name === "Polygon");
const binanceChain = chains.find(chain => chain.name === "Binance");

const getChain = (chainId) => chains.find(chain => chain.chainId === chainId)

const moonbeamProvider = () => new providers.Web3Provider(window.ethereum);
const moonbeamConnectedWallet = (moonbeamProvider) => moonbeamProvider.getSigner()
const avalancheProvider = () => new providers.Web3Provider(window.ethereum);
const avalancheConnectedWallet = (avalancheProvider) => avalancheProvider.connect(avalancheProvider);
const fantomProvider = () => new providers.Web3Provider(window.ethereum);
const fantomConnectedWallet = (fantomProvider) => fantomProvider.connect(avalancheProvider);
const polygonProvider = () => new providers.Web3Provider(window.ethereum);
const polygonConnectedWallet = (polygonProvider) => polygonProvider.connect(avalancheProvider);
const binanceProvider = () => new providers.Web3Provider(window.ethereum);
const binanceConnectedWallet = (binanceProvider) => binanceProvider.connect(avalancheProvider);


const gatewayContract = (gateway, connectedWallet) => new Contract(
  gateway,
  AxelarGatewayContract.abi,
  connectedWallet,
);

const bakeryContract = (chain, connectedWallet) => new Contract(
  chain.bakeryExecutable,
  BakeryExecutableContract.abi,
  connectedWallet,
);

export default function ConnectButton(props) {
    const {
        account,
        setProvider,
        setSigner,
        setAccount,
        setChain,
        setContract,
        setGatewayContract
    } = props;

    const connectWallet = async () => {
            if (typeof window.ethereum === 'undefined') {
                console.log('MetaMask is not installed!');
                return;
            }

            const provider = new ethers.providers.Web3Provider(window.ethereum)
            const [account] = await provider.send( 'eth_requestAccounts', []);
            const signer = provider.getSigner()
            const {chainId} = await provider.getNetwork()
            const chain = getChain(chainId)
            const gateway = gatewayContract(chain.gateway, signer)
            const contract = bakeryContract(chain, signer)
            console.log(account)

            setProvider(provider);
            setSigner(signer);
            setChain(chain);
            setAccount(account);
            setContract(contract);
            setGatewayContract(gateway);
    }


    useEffect(() => {
        if (account === null) connectWallet();
    }, [])
    return <button className="btn btn-ghost" onClick={connectWallet}>Connect Wallet</button>;
}

export function DisconnectButton(props) {
    const {
        account,
        setProvider,
        setSigner,
        setAccount,
        setChain,
        setContract,
        setGatewayContract
    } = props;

    const disconnectWallet = async () => {
        setProvider(null);
        setSigner(null);
        setChain(null);
        setAccount("");
        setContract(null);
        setGatewayContract(null);
    }

    return <button className="btn btn-ghost" onClick={disconnectWallet}>Disconnect Wallet</button>
}