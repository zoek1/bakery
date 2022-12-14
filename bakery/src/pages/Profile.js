import React, {useEffect, useState} from "react";
import MDEditor from '@uiw/react-md-editor';
import rehypeSanitize from "rehype-sanitize";
import {getCidFrom, getFile, getJSON, upload, uploadJSON} from "../utils/ipfs";
import {AxelarQueryAPI, Environment, EvmChain, GasToken} from "@axelar-network/axelarjs-sdk";
import {ethers, BigNumber} from "ethers"
import {useNavigate} from "react-router-dom";

const BakeryExecutableContract = require("../artifacts/contracts/Bakery.sol/BakeryExecutable.json");
const chains = require("../info/testnet.json")

export const getTransferFee = async (srcChain, destChain, symbol, amount) => {
    const axelarQueryApi = new AxelarQueryAPI({ environment: Environment.TESTNET})
    const denom = axelarQueryApi.getDenomFromSymbol(symbol, srcChain);
    const feeResponse = await axelarQueryApi.getTransferFee(srcChain, destChain, denom, ethers.utils.parseUnits(amount, 6).toNumber());
    return +ethers.utils.formatUnits(feeResponse.fee.amount, 6);
}

export const estimateGasFee = async (srcChain, destChain, symbol) => {
    const axelarQueryApi = new AxelarQueryAPI({ environment: Environment.TESTNET})
    return await axelarQueryApi.estimateGasFee(
    EvmChain[srcChain],
    EvmChain[destChain],
    GasToken[symbol],
    700000,
    5
  );
}


export default function Profile(props) {
    const {
        contract,
        account,
        gatewayContract,
        chain,
        navbar
    } = props;
    const [bio, setBio] = useState("");
    const [name, setName] = useState("");
    const [cid, setCid] = useState(null);
    const [loading, setLoading] = useState(false);
    const [thumbnail, setThumbnail] = useState("")
    const [selectedChain, setChain] = useState(80001)
    const [message, setMessage] = useState({visible: false, success: true})
    const [retrieving, setRetrieving] = useState(false)

    const [tx, setTx] = useState("")
    const defaultChain = chains.find(chain => chain.chainId === 80001)

    const navigator = useNavigate();


    const getEvents = async (chain, address) => {
        const fromBlock = -999;

        try {
            const userSelectedProvider = new ethers.providers.JsonRpcProvider(chain.rpc);
            const userSelectedContract = new ethers.Contract(chain.bakeryExecutable, BakeryExecutableContract.abi, userSelectedProvider);
            const filterPendingFrom = userSelectedContract.filters.PendingBio(null, address)
            const pendingEvents = await userSelectedContract.queryFilter(filterPendingFrom, fromBlock, "latest");
            let events;
            if (defaultChain.chainId === chain.chainId) {
                const filterFrom = userSelectedContract.filters.DoneBio(null, address)
                events = await userSelectedContract.queryFilter(filterFrom, fromBlock, "latest");
            } else { events = []}

            return [pendingEvents, events]
        } catch (e) {
            console.log(e)
            return [[], []]
        }
    }

    const listenEvents = async (timeout=true) => {
        console.log("Retrieving events")

        if (!account || retrieving) {
            setTimeout(listenEvents, 60000)
            return;
        }
        setRetrieving(true);
        const eventArrayPromises = await Promise.all(chains.map(chain => getEvents(chain, account)))
        const pending = eventArrayPromises
            .map(entry => entry[0])
            .reduce((prev, current) => [...prev, ...current], [])
            .map(event => event.args.timestamp.toNumber())
        const done = eventArrayPromises
            .map(entry => entry[1])
            .reduce((prev, current) => [...prev, ...current], [])
            .map(event => event.args.timestamp.toNumber())
        console.log(pending, done)
        if (Math.max(...pending) > Math.max(...done) && !loading ) {
            setMessage("Wait a few minutes while transaction is mined in destination blockchain")
            setLoading(true)
        } else if (Math.max(...pending) <= Math.max(...done) && loading) {
            setLoading(false)
        }

        if (timeout) {
            setTimeout(listenEvents, 60000)
        }

        setRetrieving(false);
    }

    useEffect(() => {
        setTimeout(listenEvents, 600)
    }, []);

    useEffect(() => {
        const _ = async () =>
        {
            if (!account) {
                setName("");
                setBio("");
                setThumbnail("");
                return;
            }


            const provider = new ethers.providers.JsonRpcProvider(defaultChain.rpc);
            const moonbeamConntract = new ethers.Contract(defaultChain.bakeryExecutable, BakeryExecutableContract.abi, provider);
            const res = await moonbeamConntract.bios(account);
            const cid = getCidFrom(res);
            setCid(cid);
            if (!cid) return;
            const data = await getJSON(cid);

            setName(data.name);
            setBio(data.bio);
            setThumbnail(data.thumbnail);
            setChain(data.chain || 80001)
        }
        _();
    }, [account])

    const onChangeFile = (file) => {
      const reader = new FileReader();

      reader.addEventListener("load", () => {
        const data = reader.result;
        setThumbnail(data);
      }, false);

      reader.readAsDataURL(file);
    }

    const saveIPFS = async () => {
        setLoading(true);
        try {
            const body = {
                name,
                bio,
                thumbnail,
                chain: selectedChain
            }

            const resp = await uploadJSON(body);

            const bioCid = resp["cid"]
            // const gasLimit = 3e6;
            const gasPrice = await estimateGasFee(
                chain.denomination.toUpperCase(),
                defaultChain.denomination.toUpperCase(),
                chain.tokenSymbol);
            console.log(gasPrice)
            const tx = await contract.setBio(defaultChain.denomination, defaultChain.bakeryExecutable, account, `ipfs://${bioCid}`, {
                value: gasPrice,
            });
            setTx(tx.hash)
            setMessage({
                title: "Transaction being processed!",
                desc: "Wait a few minutes until the chains syncs.",
                visible: true,
                success: true
            })
            await tx.wait(2);
            console.log(tx);
            await listenEvents(false);
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

    const openTx = () => {
        window.open(`${chain.blockExplorer}tx/${tx}`, '_blank').focus();
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
        <div className="flex flex-col items-center">
        { message.visible ? alert : <></> }
        <div style={{minWidth: "60%", marginTop: "30px"}} className="flex">
            {
                thumbnail ? <div style={{marginRight: "2em", marginTop: "30px"}}  className="avatar">
                          <div className="w-32 rounded">
                            <img src={thumbnail} />
                          </div>
                        </div> : <></>
            }
            <div style={{minWidth: "60%", marginTop: "30px"}} className="form-control max-w-xs">
              <label className="label">
                <span className="label-text">What is your name?</span>
              </label>
              <input type="text"
                     disabled={loading}
                     value={name}
                     onChange={e => setName(e.target.value)}
                     className="input input-bordered w-full max-w-xs" />
            </div>
        </div>
        <div style={{minWidth: "60%", marginTop: "30px"}} className="form-control max-w-xs">
          <label className="label">
            <span className="label-text">Inspire your audience (description)</span>
          </label>
          <MDEditor
            value={bio}
            onChange={setBio}
            previewOptions={{
              rehypePlugins: [[rehypeSanitize]],
            }}
          />
        </div>
        <div  style={{minWidth: "60%",}}  className="flex flex-column justify-around">
            <div style={{ marginTop: "30px"}} className="form-control max-w-xs">
              <label className="label">
                <span className="label-text">Choose a good picture!</span>
              </label>
              <input type="file"
                   disabled={loading}
                   style={{minWidth: "60%"}}
                   onChange={e => onChangeFile(e.target.files[0])}
                   className="file-input file-input-bordered file-input-md w-full max-w-xs" />
            </div>
            <div style={{ marginTop: "30px"}} className="form-control max-w-xs">
          <label className="label">
            <span className="label-text">Choose Preferred Network</span>
          </label>
          <select onChange={(e) => setChain(parseInt(e.target.value))}
                  value={selectedChain}
                  className="select  max-w-xs">
              { chains.map(bc =>
                  <option value={bc.chainId}
                          disabled={bc.chainId === chain?.chainId}
                          selected={bc.chainId === chain?.chainId}>{bc.name}</option>
              )}
          </select>
        </div>
        </div>
        <div>
            { cid
                ? <button onClick={() => navigator(`/${account}`)}
                        className="btn btn-outline btn-secondary btn-xs sm:btn-sm md:btn-md lg:btn-lg"
                        style={{marginTop: "50px", marginRight: "2em"}}>See Cookie Page</button>
                : <></>
            }
            { !loading
                ? <button onClick={saveIPFS}
                        disabled={loading}
                        className="btn btn-primary btn-xs sm:btn-sm md:btn-md lg:btn-lg"
                        style={{marginTop: "50px"}}>Save Profile</button>
                : <progress style={{marginTop: "50px"}} className="progress progress-secondary w-56"></progress>
            }
        </div>

    </div>
    </>;
}