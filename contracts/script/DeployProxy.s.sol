// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {YieldFiERC20Strategy} from "../contracts/strategies/YieldFiERC20Strategy.sol";

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

        address implementation = 0xC975E2eD37D6020Fb8a68E631e7dd93B64122dE0;

        // ✅ Encode initialize function call with arguments
        bytes memory initCalldata = abi.encodeWithSelector(
            YieldFiERC20Strategy.initialize.selector,
            "YieldFiUSDC",
            0x48B9AACC350b20147001f88821d31731Ba4C30ed, // gateway
            0x86351CA28FfADC520c940FA6b5DbE441289b55CB, // vault
            0xd435B3d2b7497c359beF43F99c42eF6D91f40831, // withdraw helper
            0x74fCAd57C966cAB6fa02a0A5425b1c76DcaFe9A0, // swap helper
            0x2e3C5e514EEf46727DE1FE44618027A9b70D92FC, // receipt token (sUSN)
            0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48, // input token (USDC)
            address(0), // _liquidityGaugeAddress not needed
            address(0), // _rewardsTokenAddress not needed
            0 // _inputTokenIndex not needed
        );

        vm.startBroadcast(deployerPrivateKey);

        ERC1967Proxy proxy = new ERC1967Proxy(implementation, initCalldata);

        vm.stopBroadcast();

        console.log("Proxy deployed at:", address(proxy));
        console.log("Points to implementation:", implementation);
    }
}
