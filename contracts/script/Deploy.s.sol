// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script} from "../lib/forge-std/src/Script.sol";
import {WithdrawalReceiver} from "../contracts/WithdrawalReceiver.sol";
import {console} from "../lib/forge-std/src/console.sol";

contract Deploy is Script {
    function run() external {
        // Fetch the private key from the environment
        string memory rawPrivateKey = vm.envString("PRIVATE_KEY");

        // Ensure the private key starts with "0x"
        string memory prefixedPrivateKey = rawPrivateKey;
        if (bytes(rawPrivateKey)[0] != "0" || bytes(rawPrivateKey)[1] != "x") {
            prefixedPrivateKey = string(abi.encodePacked("0x", rawPrivateKey));
        }

        // Convert the private key to uint256
        uint256 deployerPrivateKey = vm.parseUint(prefixedPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // Define a unique salt for deterministic deployment
        bytes32 salt = keccak256(abi.encodePacked("WithdrawalReceiver123"));

        // Deploy the WithdrawalReceiver contract using CREATE2
        WithdrawalReceiver withdrawalReceiver = new WithdrawalReceiver{
            salt: salt
        }();

        // Log the deployed contract's address
        console.log(
            "Deployed WithdrawalReceiver at:",
            address(withdrawalReceiver)
        );

        vm.stopBroadcast();
    }
}
