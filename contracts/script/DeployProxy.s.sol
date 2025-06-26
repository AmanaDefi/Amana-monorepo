// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {NoonERC20Strategy} from "../contracts/strategies/NoonERC20Strategy.sol";

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

        address implementation = 0x74D8De227791a6678720d7f6d77435da9cAB48d6;

        // ✅ Encode initialize function call with arguments
        bytes memory initCalldata = abi.encodeWithSelector(
            NoonERC20Strategy.initialize.selector,
            "NoonUSDC",
            0x48B9AACC350b20147001f88821d31731Ba4C30ed, // gateway
            0x98fEc66c0892B67760F60DB42757BA462086B67a, // vault
            0xd435B3d2b7497c359beF43F99c42eF6D91f40831, // withdraw helper
            0x74fCAd57C966cAB6fa02a0A5425b1c76DcaFe9A0, // swap helper
            0xE24a3DC889621612422A64E6388927901608B91D, // receipt token (sUSN)
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
