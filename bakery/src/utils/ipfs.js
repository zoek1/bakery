import {Web3Storage} from "web3.storage";

export const uploadJSON = async (data) => {
  const endpoint = 'https://api.web3.storage/upload';
  const headers = {
        'Authorization': `Bearer ${process.env.REACT_APP_STORAGE}`,
        'Content-Type': 'application/json'
  }

  const response = await fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      headers,
  })

  return await response.json();

}


export const upload = async (file) => {
  const client = new Web3Storage({ token: process.env.REACT_APP_STORAGE })
  const cid = await client.put([file])
  console.log('stored files with cid:', cid)
  return cid
}

export const getFile = async (cid) => {
  const client = new Web3Storage({ token: process.env.REACT_APP_STORAGE })
  const res = await client.get(cid); // Web3Response
  return await res.files(); // Web3File[]
}

export const getCidFrom = (url) => url.replace('ipfs://', '')

export const getJSON = async (url) => {
    const cid = getCidFrom(url);
    const res = await fetch(`https://${cid}.ipfs.w3s.link`);

    return res.json();
}

function ab2str(buf) {
    return String.fromCharCode.apply(null, new Uint8Array(buf));
}