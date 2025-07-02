// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import {FluidErc20Strategy} from "../contracts/strategies/FluidErc20Strategy.sol";
import {console} from "forge-std/console.sol";

contract DeployImplementation is Script {
    function run() external {
        // ✅ Fetch the PRIVATE_KEY from environment and ensure it starts with "0x"
        string memory rawPrivateKey = vm.envString("PRIVATE_KEY");
        string memory prefixedPrivateKey = rawPrivateKey;

        if (
            bytes(rawPrivateKey).length < 2 ||
            bytes(rawPrivateKey)[0] != "0" ||
            bytes(rawPrivateKey)[1] != "x"
        ) {
            prefixedPrivateKey = string(abi.encodePacked("0x", rawPrivateKey));
        }

        uint256 deployerPrivateKey = vm.parseUint(prefixedPrivateKey);
        vm.startBroadcast(deployerPrivateKey);

        // ✅ Deploy the new implementation
        FluidErc20Strategy newImpl = new FluidErc20Strategy();
        console.log(" New implementation deployed at:", address(newImpl));
        vm.stopBroadcast();
    }
}
