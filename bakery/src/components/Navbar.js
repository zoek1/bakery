import React, {useState} from 'react';
import ConnectButton, {DisconnectButton} from "./ConnnectButton";
import makeBlockie from "ethereum-blockies-base64";
import {useNavigate} from "react-router-dom";
const chains = require("../info/testnet.json")

export function Navbar (props) {
    const {
        account,
        chain,
        provider,
        setProvider,
        setSigner,
        setAccount,
        setChain,
        setContract,
        setGatewayContract
    } = props;

    const [address, setAddress] = useState("")

    const switchChain = (chainId) => {
        let chain = chains.find(chain => {
            return chain.chainId === parseInt(chainId)
        });

        if (!account) return;

        provider.send('wallet_addEthereumChain', [{
            chainId: `0x${chain.chainId.toString(16)}`,
            rpcUrls: [chain.rpc],
            chainName: chain.name,
            nativeCurrency: {
                name: chain.tokenName,
                symbol: chain.tokenSymbol,
                decimals: 18
            },
            blockExplorerUrls: [chain.blockExplorer]
        }]);
    }
    const navigator = useNavigate();

    const goToAccount = () => {
        if (!address) return;
        navigator(`/${address}`)
    }

    return (<div className="navbar bg-base-100">
  <div className="flex-1">
    <a onClick={() => navigator('/')} className="btn btn-ghost normal-case text-xl">Buy Me a Cookie</a>
  </div>
  <div className="flex-none gap-2">
    <div className="form-control">
      <div className="input-group">
        <input type="text" placeholder="Search…"  onChange={(e) => setAddress(e.target.value)} className="input input-bordered" />
        <button className="btn btn-square" onClick={goToAccount}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </button>
      </div>
    </div>
      <select onChange={(e) => switchChain(e.target.value)}  className="select  max-w-xs">
          {account ? chains.map(bc =>
              <option value={bc.chainId} disabled={bc.chainId === chain.chainId} selected={bc.chainId === chain.chainId}>{bc.name}</option>
          ): <></> }
      </select>
      {!account ? <ConnectButton
              account={account}
              setProvider={setProvider}
              setSigner={setSigner}
              setAccount={setAccount}
              setChain={setChain}
              setContract={setContract}
              setGatewayContract={setGatewayContract}/> :
          <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-ghost">
                  <div className="w-10 mr-2">
                      <img
                          src={makeBlockie(account)} />
                  </div>
                  {`${account.slice(0, 10)}...${account.slice(30)}`}
              </label>
              <ul tabIndex={0}
                  className="mt-3 p-2 shadow menu menu-compact dropdown-content bg-base-100 rounded-box w-52">
                  <li>
                      <a onClick={() => navigator('/profile') } className="justify-between">
                          Profile
                      </a>
                  </li>
                  <li><DisconnectButton
                      account={account}
                      setProvider={setProvider}
                      setSigner={setSigner}
                      setAccount={setAccount}
                      setChain={setChain}
                      setContract={setContract}
                      setGatewayContract={setGatewayContract}/>
                  </li>
              </ul>
          </div>
      }
  </div>
</div>);
}