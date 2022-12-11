//SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import { AxelarExecutable } from '@axelar-network/axelar-gmp-sdk-solidity/contracts/executables/AxelarExecutable.sol';
import { IAxelarGateway } from '@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGateway.sol';
import { IERC20 } from '@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IERC20.sol';
import { IAxelarGasService } from '@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGasService.sol';
import { StringToAddress, AddressToString } from '@axelar-network/axelar-gmp-sdk-solidity/contracts/StringAddressUtils.sol';

contract BakeryExecutable is AxelarExecutable {
    using StringToAddress for string;
    using AddressToString for address;

    IAxelarGasService public immutable gasReceiver;
    mapping (address => string) public bios;
    event Sponsor(string chain, address indexed sponsor, address indexed recipient, string tokenSymbol, uint256 amount, string payload);
    event Pending(string chain, address indexed sponsor, address indexed recipient, string tokenSymbol, uint256 amount, string payload);

    constructor(address gateway_, address gasReceiver_) AxelarExecutable(gateway_) {
        gasReceiver = IAxelarGasService(gasReceiver_);
    }

    function send(
        string calldata destinationChain,
        string memory destinationContract,
        address destinationAddress,
        string memory symbol,
        uint256 amount,
        string memory message
    ) external payable {
        address tokenAddress = gateway.tokenAddresses(symbol);
        IERC20(tokenAddress).transferFrom(msg.sender, address(this), amount);
        IERC20(tokenAddress).approve(address(gateway), amount);
        bytes memory payload = abi.encode(destinationAddress, address(msg.sender), message);
        if (msg.value > 0) {
            gasReceiver.payNativeGasForContractCallWithToken{ value: msg.value }(
                address(this),
                destinationChain,
                destinationContract,
                payload,
                symbol,
                amount,
                msg.sender
            );
        }
        gateway.callContractWithToken(destinationChain, destinationContract, payload, symbol, amount);
        emit Pending(destinationChain, address(msg.sender), destinationAddress, symbol, amount, message);
        // emit Sponsor(destinationChain, destinationContract, destinationAddress, symbol, amount, message);
    }

    function setBio(
        string calldata destinationChain,
        string calldata destinationContract,
        address destinationAddress,
        string memory message
    ) external payable {
        bytes memory payload = abi.encode(destinationAddress, message);
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
    }


    function _execute(
        string calldata,
        string calldata,
        bytes calldata payload_
    ) internal override {
        (address recipient, string memory message) = abi.decode(payload_, (address, string));

        bios[recipient] = message;
    }

    function _executeWithToken(
        string calldata chainName,
        string calldata,
        bytes calldata payload,
        string calldata tokenSymbol,
        uint256 amount
    ) internal override {
        (address recipient, address sender, string memory message) = abi.decode(payload, (address, address, string));
        address tokenAddress = gateway.tokenAddresses(tokenSymbol);
        IERC20(tokenAddress).transfer(recipient, amount);
        emit Sponsor(chainName, sender, recipient, tokenSymbol, amount, message);

    }
}
