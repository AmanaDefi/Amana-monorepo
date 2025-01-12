// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";
import {WithdrawalReceiver} from "../contracts/WithdrawalReceiver.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        WithdrawalReceiver withdrawalReceiver = new WithdrawalReceiver();

        vm.stopBroadcast();
    }
}
