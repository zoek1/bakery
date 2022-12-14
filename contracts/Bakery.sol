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
    event Pending(uint256 tokenId, string chain, address indexed sponsor, address indexed recipient);
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
        dataNFT[1000000] = "ipfs://";
        dataNFT[6000000] = "ipfs://";
        dataNFT[12000000] = "ipfs://";
        dataNFT[24000000] = "ipfs://";
        dataNFT[48000000] = "ipfs://";
        dataNFT[96000000] = "ipfs://";
        dataNFT[192000000] = "ipfs://";
        dataNFT[384000000] = "ipfs://";
        dataNFT[768000000] = "ipfs://";
        dataNFT[1536000000] = "ipfs://";

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
            emit DoneBio(timestamp, recipient);
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
        emit Pending(newTokenId, destinationChain, address(msg.sender), destinationAddress);
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
