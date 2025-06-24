// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {SwapHelperEthereum} from "../contracts/SwapHelperEthereum.sol";

contract DeploySwapHelperProxy is Script {
    function run() external {
        vm.startBroadcast();

        address implementation = 0xEc8461Aa545CAa0e784b395a2569Ca46641ab151;
        address priceOracle = 0xcfc479dC5371D21C52eeAd66290b21CDa2eB0C9f; // 👈 Replace this
        bytes memory initData = abi.encodeWithSignature(
            "initialize(address)",
            priceOracle
        );

        ERC1967Proxy proxy = new ERC1967Proxy(implementation, initData);

        console.log("Proxy deployed to:", address(proxy));

        vm.stopBroadcast();
    }
}
