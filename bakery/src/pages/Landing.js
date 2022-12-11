import {useNavigate} from "react-router-dom";
import React, {useState} from "react";

export default function Landing(props) {
    const navigator = useNavigate();
    const [address, setAddress] = useState("")

    const goToAccount = () => {
        if (!address) return;
        navigator(`/${address}`)
    }

    return <div className="hero min-h-screen" style={{ backgroundImage: `url("https://hips.hearstapps.com/hmg-prod.s3.amazonaws.com/images/180906-delish-seo-00017-1537277923.jpg")` }}>
  <div style={{backgroundColor: "hsl(var(--n) / var(--tw-bg-opacity))"}} className="hero-overlay bg-opacity-60"></div>
  <div className="hero-content text-center text-neutral-content">
    <div className="">
      <h1 style={{ fontSize: "6em", color: "white"}} className="mb-5 font-bold">Buy Me a Cookie!</h1>
      <p style={{ fontSize: "2em" }} className="mb-5">Make your favorite people happy today.</p>
      <div className="form-control items-center">
        <div style={{ width: '80%', marginTop: "2em" }} className="input-group justify-center align-center">
          <input style={{ width: '100%', height: "80px", justifyContent: 'center', fontSize: "1.3em" }} type="text" placeholder="0x7a457659d83E2dBcbE2fD7Bfa0dbab9b898F0A37"  onChange={(e) => setAddress(e.target.value)} className="input input-bordered" />
          <button style={{ height: "80px", width: "5em" }} className="btn btn-square" onClick={goToAccount}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</div>
}