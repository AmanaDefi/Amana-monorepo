// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {SwapHelperEthereum} from "../contracts/SwapHelperEthereum.sol";

contract DeploySwapHelperProxy is Script {
    function run() external {
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

        address implementation = 0x30f3ff06d32f46D1D4C35d7A10Ad4fea1f0bbAef;
        address priceOracle = 0x2e3Cc0a2955Ff73388bDeEB898851D17Cfbd651E; // 👈 Replace this
        bytes memory initData = abi.encodeWithSignature(
            "initialize(address)",
            priceOracle
        );
        vm.startBroadcast(deployerPrivateKey);

        ERC1967Proxy proxy = new ERC1967Proxy(implementation, initData);

        console.log("Proxy deployed to:", address(proxy));
        console.log("Points to implementation:", implementation);
        vm.stopBroadcast();
    }
}
