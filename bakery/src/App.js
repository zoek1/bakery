import './App.css';
import {useState} from "react";
import {Navbar} from "./components/Navbar";
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import Profile from "./pages/Profile";
import Tip from "./pages/Tip";
import Landing from "./pages/Landing";


function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [chain, setChain] = useState(null);
  const [contract, setContract] = useState(null);
  const [gatewayContract, setGatewayContract] = useState(null);

  const navbar = <Navbar account={account} chain={chain} provider={provider}
          setProvider={setProvider}
          setSigner={setSigner}
          setAccount={setAccount}
          setChain={setChain}
          setContract={setContract}
          setGatewayContract={setGatewayContract}  />;

  const router = createBrowserRouter([
    {
      path: "/",
      element: <Landing navbar={navbar} account={account} chain={chain} contract={contract} gatewayContract={gatewayContract} signer={signer} />,
    },
    {
      path: "/profile",
      element: <Profile navbar={navbar} account={account} chain={chain} contract={contract} gatewayContract={gatewayContract} signer={signer} />,
    },
    {
      path: "/:_address",
      element: <Tip navbar={navbar} account={account} chain={chain} contract={contract} provider={provider}
                    gatewayContract={gatewayContract} signer={signer} />,
    },
  ]);

  return (
    <div className="App">
      <RouterProvider router={router} />
    </div>
  );
}

export default App;
