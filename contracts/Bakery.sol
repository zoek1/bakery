//SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import '@openzeppelin/contracts/utils/Counters.sol';

import { AxelarExecutable } from '@axelar-network/axelar-gmp-sdk-solidity/contracts/executables/AxelarExecutable.sol';
import { IAxelarGateway } from '@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGateway.sol';
import { IERC20 } from '@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IERC20.sol';
import { IAxelarGasService } from '@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGasService.sol';
import { StringToAddress, AddressToString } from '@axelar-network/axelar-gmp-sdk-solidity/contracts/StringAddressUtils.sol';

contract BakeryExecutable is ERC721URIStorage, AxelarExecutable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    using StringToAddress for string;
    using AddressToString for address;

    // Actions
    uint8 BIO = 0;
    uint8 MINT = 1;

    string public thisChain;

    struct Receipt {
        bytes data;
        bool active;
        bool valid;
    }

    mapping(uint256 => Receipt) public receipt;
    mapping(address => string) public bios;
    mapping(uint256 => string) public dataNFT;

    IAxelarGasService public immutable gasReceiver;

    error NotEnoughValueForGas();

    // event Sponsor(string chain, address indexed sponsor, address indexed recipient, string tokenSymbol, uint256 amount, string payload);
    event Pending(uint256 tokenId, string chain, address indexed sponsor, address indexed recipient, string tokenSymbol, uint256 amount, string message);
    event Done(uint256 tokenId, string chain, address indexed sponsor, address indexed recipient);
    event Invoice(uint256 tokenId, string chain, address indexed sponsor, address indexed recipient);

    event PendingBio(uint256 timestamp, address indexed user);
    event DoneBio(uint256 timestamp, address indexed user);

    constructor(
            address gateway_,
            address gasReceiver_,
            string memory thisChain_
    )  ERC721('Cookie Monster NFT', 'QKY') AxelarExecutable(gateway_) {
        gasReceiver = IAxelarGasService(gasReceiver_);
        dataNFT[1000000] = "https://bafybeibs6mruwygyt5mlgyggch2ei2crldrpaxu3u22tkz2rt5ksgam6vq.ipfs.w3s.link/1.json";
        dataNFT[6000000] = "https://bafybeidjsdayqwwbikt5xv2cu2fxgk3y5kfu5hwa3a3zvicf2zh76pzk4q.ipfs.w3s.link/2.json";
        dataNFT[12000000] = "https://bafybeid7ec2tyx6jw2p3abpbjeshwkix7fg7pmqjduqy2sbvpjtryxigjm.ipfs.w3s.link/3.json";
        dataNFT[24000000] = "https://bafybeihfxq7ehvswdtg4ivserfwiptzf6ttr5aldfwqd5avmoabkczp2je.ipfs.w3s.link/4.json";
        dataNFT[48000000] = "https://bafybeibysf7rtblveccmkl6fnau7ct7vjbovehaas262azhpyetpmq5noa.ipfs.w3s.link/5.json";
        dataNFT[96000000] = "https://bafybeig7apy5lsy4lptuuume4lfg77iad5k4edwylkk6yqkhzp2w2f5nde.ipfs.w3s.link/6.json";
        dataNFT[192000000] = "https://bafybeidiokbp6bni7ea2cffsg6jt6fjll5hh7ymegnwbcp4ynhioegrc5y.ipfs.w3s.link/7.json";
        dataNFT[384000000] = "https://bafybeihlfdskoy6itssngwo2e5nhj5gdhz4yxvphls2pwdffksyxgqx7va.ipfs.w3s.link/8.json";
        dataNFT[768000000] = "https://bafybeiewd3db6ebjmus5lyrs4rtcqf5jeuhl753uc7dxnp4rd3p7dcv7xu.ipfs.w3s.link/9.json";
        dataNFT[1536000000] = "https://bafybeichuqo56666gpe42xuqcgm5wnq2sc4dsgajmeqg6r2cjozdcnzfiu.ipfs.w3s.link/10.json";

        thisChain = thisChain_;
    }

    function _execute(
        string calldata chainName,
        string calldata,
        bytes calldata payload_
    ) internal override {
        (uint8 action, address recipient, uint256 timestamp, string memory message) = abi.decode(payload_,
            (uint8, address, uint256, string));

        if (action == BIO) {
            bios[recipient] = message;
            emit DoneBio(block.timestamp, recipient);
        } else if (action == MINT) {
            if(receipt[timestamp].active) {
                (string memory tChain, address sender, string memory destinationChain, address destinationAddress,
                uint256 tT, string memory symbol, uint256 amount, uint256 tokenId) = abi.decode(receipt[timestamp].data,
                    (string, address, string, address, uint256, string, uint256, uint256));

                uint256 newTokenId = timestamp;
                _safeMint(sender, newTokenId);
                if (amount <= 1000000 ) {
                    _setTokenURI(newTokenId, dataNFT[1000000]);
                } else if (amount <= 6000000 ) {
                    _setTokenURI(newTokenId, dataNFT[6000000]);
                } else if (amount <= 12000000 ) {
                    _setTokenURI(newTokenId, dataNFT[12000000]);
                } else if (amount <= 24000000 ) {
                    _setTokenURI(newTokenId, dataNFT[24000000]);
                } else if (amount <= 48000000 ) {
                    _setTokenURI(newTokenId, dataNFT[48000000]);
                } else if (amount <= 96000000 ) {
                    _setTokenURI(newTokenId, dataNFT[96000000]);
                } else if (amount <= 192000000 ) {
                    _setTokenURI(newTokenId, dataNFT[192000000]);
                } else if (amount <= 384000000 ) {
                    _setTokenURI(newTokenId, dataNFT[384000000]);
                } else if (amount <= 768000000 ) {
                    _setTokenURI(newTokenId, dataNFT[768000000]);
                } else {
                    _setTokenURI(newTokenId, dataNFT[1536000000]);
                }
                receipt[timestamp].valid = true;
                emit Invoice(timestamp, destinationChain, sender, destinationAddress);
            }
        }
    }

    function _executeWithToken(
        string calldata chainName,
        string calldata chainAddress,
        bytes calldata payload,
        string calldata tokenSymbol,
        uint256 amount
    ) internal override {
        (uint256 newTokenId, address recipient, address sender, string memory message) = abi.decode(payload, (uint256, address, address, string));
        address tokenAddress = gateway.tokenAddresses(tokenSymbol);
        IERC20(tokenAddress).transfer(recipient, amount);
        // emit Sponsor(chainName, sender, recipient, tokenSymbol, amount, message);

        // emit Sponsor(chainName, sender, recipient, tokenSymbol, amount, message);
        // bytes memory _payload = abi.encode(MINT, recipient, tokenId, "");
        gateway.callContract(chainName, chainAddress, abi.encode(MINT, recipient, newTokenId, ""));
        string memory chain_ = chainName;
        emit Done(newTokenId, chain_, sender, recipient);
    }

    function contractId() external pure returns (bytes32) {
        return keccak256('Buy me a Cookie');
    }

        function send(
        string memory destinationChain,
        string memory destinationContract,
        address destinationAddress,
        string memory symbol,
        uint256 amount,
        string memory message,
        uint256 gasForRemote
    ) external payable {
        address tokenAddress = gateway.tokenAddresses(symbol);
        IERC20(tokenAddress).transferFrom(msg.sender, address(this), amount);
        IERC20(tokenAddress).approve(address(gateway), amount);
        _tokenIds.increment();

        bytes memory originalData = abi.encode(thisChain, address(msg.sender), destinationChain, destinationAddress,
            block.timestamp, symbol, amount, _tokenIds.current());
        //Avoids tokenId collisions.
        uint256 newTokenId = uint256(keccak256(originalData));
        receipt[newTokenId] = Receipt(originalData, true, false);

        // bytes memory payload = abi.encode(destinationAddress, address(msg.sender), newTokenId, message);
        bytes memory payload = abi.encode(newTokenId, destinationAddress, address(msg.sender), message);

        if (gasForRemote > 0) {
            if (gasForRemote > msg.value) revert NotEnoughValueForGas();
            gasReceiver.payNativeGasForContractCallWithToken{ value: gasForRemote }(
                address(this),
                destinationChain,
                destinationContract,
                payload,
                symbol,
                amount,
                msg.sender
            );
            if (msg.value > gasForRemote) {
                gasReceiver.payNativeGasForContractCall{ value: msg.value - gasForRemote }(
                    destinationContract.toAddress(),
                    thisChain,
                    address(this).toString(),
                    abi.encode(MINT, destinationAddress, block.timestamp, ""),
                    msg.sender
                );
            }
        }
        gateway.callContractWithToken(destinationChain, destinationContract, payload, symbol, amount);
        emit Pending(newTokenId, destinationChain, address(msg.sender), destinationAddress, symbol, amount, message);
    }

    function setBio(
        string calldata destinationChain,
        string calldata destinationContract,
        address destinationAddress,
        string memory message
    ) external payable {
        uint256 timestamp = block.timestamp;
        bytes memory payload = abi.encode(BIO, destinationAddress, timestamp, message);
        if (msg.value > 0) {
            gasReceiver.payNativeGasForContractCall{ value: msg.value }(
                address(this),
                destinationChain,
                destinationContract,
                payload,
                msg.sender
            );
        }
        gateway.callContract(destinationChain, destinationContract, payload);
        emit PendingBio(timestamp, destinationAddress);
    }
}
