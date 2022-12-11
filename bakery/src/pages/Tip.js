import React, {useEffect, useState} from "react";
import {getCidFrom, getFile, getJSON, upload, uploadJSON} from "../utils/ipfs";
import {AxelarQueryAPI, Environment, EvmChain, GasToken} from "@axelar-network/axelarjs-sdk";
import {ethers, BigNumber, Contract} from "ethers"
import {useNavigate, useParams} from "react-router-dom";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";

import IERC20 from "../artifacts/@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IERC20.sol/IERC20.json";
import makeBlockie from "ethereum-blockies-base64";

const BakeryExecutableContract = require("../artifacts/contracts/Bakery.sol/BakeryExecutable.json");
const chains = require("../info/testnet.json")

export const estimateGasFee = async (srcChain, destChain, symbol) => {
    const axelarQueryApi = new AxelarQueryAPI({ environment: Environment.TESTNET})
    return await axelarQueryApi.estimateGasFee(
    EvmChain[srcChain],
    EvmChain[destChain],
    GasToken[symbol],
    400000,
    2
  );
}

const getName = async (address) => {
    const provider = new ethers.providers.JsonRpcProvider("https://mainnet.infura.io/v3/2913dca9d6d54e4e85a3235a96ecc29c");
    return await provider.lookupAddress(address);
}

const Activity = (props) => {
    const {event, selectedChain} = props
    const [name, setName] = useState(event.args.sponsor);

    useEffect(() => {
        const _ = async () => setName(await getName(event.args.sponsor) || event.args.sponsor)
        _();
    }, [])

    return <div className="card mt-5 shadow-xl">
        <div className="card-body">
            <div className="flex">
                <div style={{ width: "4em" }} className="mr-2">
                    <img src={makeBlockie(event.args.sponsor)} />
                </div>
                <div>
                    <label style={{fontWeight: "bold"}} className="label">{name}</label>
                    <label>sponsored you  {  event.args.amount.div(1e6).toString() } cookies. ({event.args.amount.div(1e6).toString()} aUSDC)</label>
                </div>
            </div>
          <p style={{fontSize: "1.3em", marginTop: "1em"}}>{event.args.payload}</p>
          <div className="card-actions justify-end">
            <button className="btn btn-ghost" onClick={() => window.open(`${selectedChain.blockExplorer}tx/${event.transactionHash}`, '_blank').focus()}>See TX</button>
          </div>
        </div>
      </div>
}


export default function Tip(props) {
    let { address } = useParams();

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
    const [name, setName] = useState("");
    const [selectedChain, setSelectedChain] = useState({});
    const [loading, setLoading] = useState(false);
    const [thumbnail, setThumbnail] = useState("")
    const [cookies, setCookies] = useState(6)
    const [quote, setQuote] = useState("")
    const [message, setMessage] = useState({visible: false, success: true})
    const [tx, setTx] = useState("")
    const [events, setEvents] = useState([])
    const moonbeam = chains.find(chain => chain.chainId === 1287)
    const cookiePrice = 0.20;

    const navigator = useNavigate();

    const getName = async (address) => {
        console.log(address)
        const provider = new ethers.providers.JsonRpcProvider("https://mainnet.infura.io/v3/2913dca9d6d54e4e85a3235a96ecc29c");
        return await provider.lookupAddress(address);
    }

    const resolveENS = async (ens) => {
        const provider = new ethers.providers.JsonRpcProvider("https://mainnet.infura.io/v3/2913dca9d6d54e4e85a3235a96ecc29c");
        return await provider.resolveName(ens);
    }

    const getEvents = async (chain, address) => {
        try {
            const userSelectedProvider = new ethers.providers.JsonRpcProvider(chain.rpc);
            const userSelectedContract = new ethers.Contract(chain.bakeryExecutable, BakeryExecutableContract.abi, userSelectedProvider);
            const filterFrom = userSelectedContract.filters.Sponsor(null, null, address)
            const events = await userSelectedContract.queryFilter(filterFrom, -4999, "latest");
            return events
        } catch (e) {
            return []
        }
    }

    useEffect(() => {
        const _ = async () =>
        {
            if (!address) return;

            const resolvedAddress = ethers.utils.isAddress(address) ? address : await resolveENS(address);
            const provider = new ethers.providers.JsonRpcProvider(moonbeam.rpc);
            const moonbeamConntract = new ethers.Contract(moonbeam.bakeryExecutable, BakeryExecutableContract.abi, provider);
            const res = await moonbeamConntract.bios(resolvedAddress);
            const cid = getCidFrom(res);

            if (!cid) {
                const name = await getName(resolvedAddress)
                setBio(`# Sponsor me
                
My profile isn't verified but you still can contribute.

**Address**: ${address}

**Note**: All contributions will be redirected to the moonbase chain.
                `);
                setThumbnail(makeBlockie(resolvedAddress));
                setSelectedChain(chain)
                setName((await name));

                return;
            }
            const data = await getJSON(cid);

            const selectedChain = chains.find(chain => chain.chainId === data.chain)

            setName(data.name);
            setBio(data.bio);
            setThumbnail(data.thumbnail);
            setSelectedChain(selectedChain)
            const eventArrayPromises = await Promise.all(chains.map(chain => getEvents(chain, address)))
            console.log(eventArrayPromises)
            const events = [].concat(...eventArrayPromises);
            console.log(selectedChain)
            setEvents(events)
            console.log(events)
        }
        _();
    }, [address])

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
            const gasPrice = await estimateGasFee(
                chain.denomination.toUpperCase(),
                selectedChain.denomination.toUpperCase(),
                chain.tokenSymbol);
            console.log(gasPrice)
            const tx = await contract.send(selectedChain.denomination, selectedChain.bakeryExecutable, address,
                "aUSDC", cookiesUSDC, quote, {
                    value: gasPrice,
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
                    return <Activity event={event} selectedChain={selectedChain} />
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
                        <button className="btn btn-secondary" disabled={!account} onClick={onClick}>Buy Now</button>
                        : <progress style={{marginTop: "50px"}} className="progress progress-secondary w-56"></progress>
                    }
                </div>
                <label style={{ marginTop: '30px', fontWeight: 'bold' }}>{cookies} Cookies for ${(cookies).toFixed(2)} aUSDC</label>
          </div>
        </div>
    </div>
        </>
}