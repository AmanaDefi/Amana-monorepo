// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {ConvexERC20StrategyStableSwapNG} from "../contracts/strategies/ConvexERC20StrategyStableSwapNG.sol";

contract DeployProxy is Script {
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

        address implementation = 0x57238234C6A0fD5E800e7AA9C0269253f03aCA12;

        // ✅ Encode initialize function call with arguments
        bytes memory initCalldata = abi.encodeWithSelector(
            ConvexERC20StrategyStableSwapNG.initialize.selector,
            "NoonUSDC",
            0x48B9AACC350b20147001f88821d31731Ba4C30ed, // gateway
            0x5e3AdC840b55Fe0B99c0418aC69113E1F0296992, // vault
            0xd435B3d2b7497c359beF43F99c42eF6D91f40831, // withdraw helper
            0x7bF6F5964998d4541A078Aa328F62D5C23E371E7, // swap helper
            0xFfF8634dE89271b6075C55FA89B4E9A087Fdb9FE, // receipt token
            0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf, // input token
            0xca55D40f6703a5FcC46d8277D1D78751acCe9305, // _liquidityGaugeAddress not needed
            0xD533a949740bb3306d119CC777fa900bA034cd52, // _rewardsTokenAddress not needed
            1, // _inputTokenIndex not needed
            454, // _convexPoolId
            0xF403C135812408BFbE8713b5A23a04b3D48AAE31, // _convexBooster
            0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B // _cvxTokenAddress
        );

        vm.startBroadcast(deployerPrivateKey);

        ERC1967Proxy proxy = new ERC1967Proxy(implementation, initCalldata);

        vm.stopBroadcast();

        console.log("Proxy deployed at:", address(proxy));
        console.log("Points to implementation:", implementation);
    }
}
