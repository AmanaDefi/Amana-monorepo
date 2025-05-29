// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import {console} from "forge-std/console.sol";

import {ConvexERC20StrategyArbitrum} from "../contracts/strategies/ConvexERC20StrategyArbitrum.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract DeployStrategyProxy is Script {
    function run() external {
        // 🔐 Load deployer's private key
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

        // 🧱 Deploy implementation logic
        ConvexERC20StrategyArbitrum implementation = new ConvexERC20StrategyArbitrum();
        console.log("Implementation deployed at:", address(implementation));

        // 🧠 Encode call to `initialize(...)`
        bytes memory initData = abi.encodeWithSignature(
            "initialize(string,address,address,address,address,address,address,address,address,uint256,uint256,address,address)",
            "Convex ETH Strategy",
            0xYourAmanaVault,         // vault
            0xYourGateway,            // gateway
            0xYourWithdrawHelper,     // withdrawHelper
            0xYourSwapHelper,         // swapHelper
            0xYourReceiptToken,       // receiptToken
            0xYourInputToken,         // inputToken
            0xYourRewardPool,         // rewardPool
            0xYourCRVToken,           // crvToken
            0,                        // inputTokenIndex
            0,                        // convexPid
            0xYourBooster,            // booster
            0xYourCVXToken            // cvxToken
        );

        // 🚀 Deploy the proxy pointing to the implementation with initializer
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        console.log("Proxy deployed at:", address(proxy));

        vm.stopBroadcast();
    }
}
