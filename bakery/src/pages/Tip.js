import React, {useEffect, useState} from "react";
import {getCidFrom, getFile, getJSON, upload, uploadJSON} from "../utils/ipfs";
import {AxelarQueryAPI, Environment, EvmChain, GasToken} from "@axelar-network/axelarjs-sdk";
import {ethers, BigNumber, Contract} from "ethers"
import {useNavigate, useParams} from "react-router-dom";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";

import IERC20 from "../artifacts/@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IERC20.sol/IERC20.json";
import makeBlockie from "ethereum-blockies-base64";
import {parseEther} from "ethers/lib/utils";

const BakeryExecutableContract = require("../artifacts/contracts/Bakery.sol/BakeryExecutable.json");
const chains = require("../info/testnet.json")

export const estimateGasFee = async (srcChain, destChain, symbol, gasPrice=0) => {
    const axelarQueryApi = new AxelarQueryAPI({ environment: Environment.TESTNET})
    const sourceChainName = EvmChain[srcChain]
    const destinationChainName = EvmChain[destChain]
    const sourceChainTokenSymbol = GasToken[symbol]
    const gasLimit = 7000;
    const gasMultiplier = 2;
    const response = await axelarQueryApi.getNativeGasBaseFee(
      sourceChainName,
      destinationChainName,
      sourceChainTokenSymbol
    ).catch(() => undefined);

    if (!response) return "0";

    const { baseFee, sourceToken, success } = response;

    if (!success || !baseFee || !sourceToken) return "0";
    const gasInfo = await axelarQueryApi.getGasInfo(sourceChainName, destinationChainName, sourceChainTokenSymbol);
    console.log(gasInfo)

    const { gas_price } = sourceToken;

    const destTxFee = parseEther(gas_price || gasPrice).mul(gasLimit);
    if (gasMultiplier > 1) {
      return [destTxFee
        .add(baseFee)
        .mul(gasMultiplier * 10000)
        .div(10000)
        .toString(), gas_price]
    }

    return [destTxFee.add(baseFee).toString(), gas_price];
}


const getName = async (address) => {
    const provider = new ethers.providers.JsonRpcProvider("https://mainnet.infura.io/v3/2913dca9d6d54e4e85a3235a96ecc29c");
    return await provider.lookupAddress(address);
}

const Activity = (props) => {
    const {event, done, invoice} = props
    const [name, setName] = useState(event.args.sponsor);

    useEffect(() => {
        const _ = async () => setName(await getName(event.args.sponsor) || event.args.sponsor)
        _();
    }, [])
    // console.log(event.args[0])
    // const chain = chains.find(chain => event.args[0].match(new RegExp(chain.denomination, "i")))
    // console.log(chains)

    return <div className="card mt-5 shadow-xl">
        <div className="card-body">
            <div className="flex">
                <div style={{ width: "4em", marginTop: "14px" }} className="mr-2">
                    <img src={makeBlockie(event.args.sponsor)} />
                </div>
                <div>
                    <label style={{fontWeight: "bold"}} className="label">{name} <br />{event.chain.name}</label>
                    <label>sponsored you  {  event.args.amount.div(1e6).toString() } cookies. ({event.args.amount.div(1e6).toString()} aUSDC)</label>
                </div>
            </div>
          <p style={{fontSize: "1.3em", marginTop: "1em"}}>{event.args.message}</p>
          <div className="card-actions justify-end">
            <button className="btn btn-ghost" onClick={() => window.open(`${event.chain.blockExplorer}tx/${event.transactionHash}`, '_blank').focus()}>See TX</button>
            { /* <button className={`btn ${done ? "btn-success": "btn-ghost"}`} disabled={true}>{done ? "Done" : "Sync..."}</button> */ }
            <button className={`btn ${invoice ? "btn-success": "btn-ghost"}`} onClick={() => window.open(`${event.chain.blockExplorer}token/${event.chain.bakeryExecutable}?a=${event.args.tokenId}`, '_blank').focus()} disabled={invoice}>Invoice</button>
          </div>
        </div>
      </div>
}

const getProviders = () => {
    const instances = chains.map((chain) => {
        const provider = new ethers.providers.JsonRpcProvider(chain.rpc);
        const contract = new ethers.Contract(chain.bakeryExecutable, BakeryExecutableContract.abi, provider);

        return [chain.chainId, {
            provider,
            contract
        }]
    })

    return Object.fromEntries(instances);
}


export default function Tip(props) {
    let { _address } = useParams();

    const {
        contract,
        account,
        gatewayContract,
        chain,
        provider,
        signer,
        navbar
    } = props;
    const [bio, setBio] = useState("");
    const [providers, _] = useState(getProviders())
    const [address, setAddress] = useState(_address);
    const [name, setName] = useState("");
    const [selectedChain, setSelectedChain] = useState({});
    const [loading, setLoading] = useState(false);
    const [thumbnail, setThumbnail] = useState("")
    const [cookies, setCookies] = useState(6)
    const [quote, setQuote] = useState("")
    const [message, setMessage] = useState({visible: false, success: true})
    const [tx, setTx] = useState("")
    const [events, setEvents] = useState([])
    const [done, setDone] = useState([])
    const [invoice, setInvoice] = useState([])
    const moonbeam = chains.find(chain => chain.chainId === 80001)
    const cookiePrice = 0.20;

    const navigator = useNavigate();
    const getName = async (address) => {
        console.log(address)
        const provider = new ethers.providers.JsonRpcProvider("https://mainnet.infura.io/v3/2913dca9d6d54e4e85a3235a96ecc29c");
        return await provider.lookupAddress(address);
    }

    const resolveENS = async (ens) => {
        console.log(ens)
        const provider = new ethers.providers.JsonRpcProvider("https://mainnet.infura.io/v3/2913dca9d6d54e4e85a3235a96ecc29c");
        return await provider.resolveName(ens);
    }

    const getEvents = async (chain, address) => {
        const fromBlock = [80001, 43113, 4002].indexOf(chain.chainId) !== -1 ? -999 : -4900;
        if (!ethers.utils.isAddress(address)) return [];
        try {
            const userSelectedContract = providers[chain.chainId].contract;
            const filterFrom = userSelectedContract.filters.Pending(null, null, null, address)
            const events = await userSelectedContract.queryFilter(filterFrom, fromBlock, "latest");
            // const filterDoneFrom = userSelectedContract.filters.Done()
            // const doneEvents = await userSelectedContract.queryFilter(filterDoneFrom, fromBlock, "latest");
            const filterInvoiceFrom = userSelectedContract.filters.Invoice(null, null, null, address)
            const invoiceEvents = await userSelectedContract.queryFilter(filterInvoiceFrom, fromBlock, "latest");
            // setDone([...done, ...doneEvents.map(event => event.args.tokenId)])
            setInvoice([...invoice, ...invoiceEvents.map(event => event.args.tokenId)])
            return events.map(event => {event.chain = chain; return event});
        } catch (e) {
            console.log(e)
            return []
        }
    }

    const updateLogs = async (address) => {
        const eventArrayPromises = await Promise.all(chains.map(chain => getEvents(chain, address)))
            console.log(eventArrayPromises)
            const events = [].concat(...eventArrayPromises);
            setEvents(events)

    }

    useEffect(() => {
        const _ = async () =>
        {
            if (!_address) return;
            setEvents([])

            const resolvedAddress = ethers.utils.isAddress(_address) ? _address : await resolveENS(_address);
            if (!resolvedAddress) {
                setBio("# 203 Invalid User or Address format")
                return
            }
            setAddress(resolvedAddress)
            console.log(resolvedAddress)
            const provider = new ethers.providers.JsonRpcProvider(moonbeam.rpc);
            const moonbeamConntract = new ethers.Contract(moonbeam.bakeryExecutable, BakeryExecutableContract.abi, provider);


            const res = await moonbeamConntract.bios(resolvedAddress);
            const cid = getCidFrom(res);


            if (!cid) {
                const name = ethers.utils.isAddress(_address) ? await getName(_address) : _address;
                setBio(`# Sponsor me
                
My profile isn't verified but you still can contribute.

**Address**: ${resolvedAddress}

**Note**: All contributions will be redirected to the moonbase chain.
                `);
                setThumbnail(makeBlockie(resolvedAddress));
                setSelectedChain(moonbeam)
                setName(name);
                await updateLogs(resolvedAddress);

                return;
            }
            const data = await getJSON(cid);

            const selectedChain = chains.find(chain => chain.chainId === data.chain)

            setName(data.name);
            setBio(data.bio);
            setThumbnail(data.thumbnail);
            setSelectedChain(selectedChain)
            await updateLogs(resolvedAddress);
        }
        _();
    }, [_address])

    const openTx = () => {
        window.open(`${chain.blockExplorer}tx/${tx}`, '_blank').focus();
    }


    const onClick = async () => {
        setLoading(true);
        try {
            const cookiesUSDC = ethers.utils.parseUnits((cookies).toString(), 6 )   // BigNumber.from(cookies).mul(1e6);
            console.log(cookiesUSDC);

            const tokenAddress = await gatewayContract.tokenAddresses("aUSDC");

            const erc20 = new Contract(
              tokenAddress,
              IERC20.abi,
              signer
            );

            const txApprove = await erc20.approve(chain.bakeryExecutable, cookiesUSDC);
            await txApprove.wait(1);

            // const gasLimit = 3e6;
            const [gasPrice, savePrice] = await estimateGasFee(
                chain.denomination.toUpperCase(),
                selectedChain.denomination.toUpperCase(),
                chain.tokenSymbol);

            const [gasPriceRemote, _] = await estimateGasFee(
                selectedChain.denomination.toUpperCase(),
                chain.denomination.toUpperCase(),
                chain.tokenSymbol, savePrice);
            console.log(gasPrice)
            const tx = await contract.send(selectedChain.denomination, selectedChain.bakeryExecutable, address,
                "aUSDC", cookiesUSDC, quote, gasPrice, {
                    value: BigNumber.from(gasPrice).add(BigNumber.from(gasPriceRemote)),
            });
            setTx(tx.hash)

            setMessage({
                title: `Thank you for contribute to ${name}!`,
                desc: "Wait a few minutes until the chains syncs.",
                visible: true,
                success: true
            })
            await tx.wait(2);
            console.log(tx);
        } catch (e) {
            setMessage({
                title: "Transaction failed!",
                desc: "Something was wrong, check the tx logs.",
                visible: true,
                success: false
            })
            console.log(e)
        }
        setLoading(false);
    }

        const alert = <div className={`alert  ${message.success ?  "alert-success" : " alert-error"} shadow-lg`} style={{width: "60%", marginTop: "30px"}}>
          <div>
              { message.success
                  ? <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none"
                         viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  : <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none"
                         viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
              }
            <div>
              <h3 className="font-bold">{message.title}</h3>
              <div className="text-xs">{message.desc}</div>
            </div>
          </div>
          <div className="flex-none">
            <button className="btn btn-sm btn-accent" onClick={openTx}>See transaction</button>
            <button className="btn btn-sm btn-ghost" onClick={() => setMessage({...message, visible: false})}>Dismiss</button>
          </div>
        </div>;

    return <>
        {navbar}
        <div className="flex justify-center">
            { message.visible ? alert : <></> }
        </div>
        <div className="flex justify-center">
        <div style={{minWidth: "45%", maxWidth: "45%", marginTop: "60px", marginRight: "4em"}} >
            <div className="card shadow-xl flex flex-col items-center">
            {
                thumbnail
                    ? <figure style={{maxHeight: '270px'}}><img src={thumbnail} alt="Shoes" /></figure>
                    : <></>
            }

            <div style={{minWidth: "90%", marginTop: "30px"}} className="form-control max-w-xs">
                <article className="prose">
                    <h1 style={{marginTop: "30px"}} >{name}</h1>
                    <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{bio}</ReactMarkdown>,
                </article>
            </div>
        </div>
            <div style={{width: "100%", marginTop: "60px"}}>
                { events.map((event) => {
                    return <Activity event={event}
                                     invoice={invoice.indexOf(event.args.tokenId) !== -1}
                                     done={done.indexOf(event.args.tokenId) !== -1}
                                     selectedChain={selectedChain} />
                  })
                }
            </div>
        </div>
        <div className="card w-96 shadow-xl" style={{marginTop: "60px", maxHeight: '580px'}}>
            <div className="card-body items-center text-center">
                <img className="w-24" src="/logo192.png" />
                <h2 style={{marginTop: "30px"}} className="card-title">How many cookies?</h2>
                <div className="mt-4 mb-5 justify-around flex" style={{width: "100%", }}>
                    { [1,6,12].map((value) => <button
                        onClick={() => setCookies(value)}
                        className={`btn btn-primary btn-outline ${value === cookies ? "btn-active" : ""} btn-square`}>
                        {value}
                      </button>)
                    }
                    <input type="number"
                           value={cookies}
                           onChange={e => setCookies(parseInt(e.target.value || 1)) }
                           style={{ width: '80px' }}
                           className="input input-bordered" />
                </div>
                <div style={{width: "100%", marginBottom: "30px"}} className="form-control max-w-xs">
                  <label className="label">
                    <span className="label-text">Say something nice! (optional)</span>
                  </label>
                  <textarea
                         disabled={loading}
                         value={quote}
                         onChange={e => setQuote(e.target.value)}
                         className="textarea textarea-bordered w-full max-w-xs" />
                </div>
                <div className="card-actions">
                    {!loading ?
                        <button className="btn btn-secondary" disabled={!account || !chain.denomination} onClick={onClick}>Buy Now</button>
                        : <progress style={{marginTop: "50px"}} className="progress progress-secondary w-56"></progress>
                    }
                </div>
                <label style={{ marginTop: '30px', fontWeight: 'bold' }}>{cookies} Cookies for ${(cookies).toFixed(2)} aUSDC</label>
          </div>
        </div>
    </div>
        </>
}