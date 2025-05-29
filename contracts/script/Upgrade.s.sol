// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import {console} from "forge-std/console.sol";

contract Upgrade is Script {
    function run() external {
        // 🛰️ Proxy address you want to upgrade
        address proxyAddress = 0x022F47Baf18990EF8C1A6fe7e9e9078B2F5D6015;

        // 🆕 New implementation contract address
        address newImpl = 0x50c399BBc0D4AEFe14c61930Bd264729d7618e58;

        // 🔐 Get private key from .env and prefix if needed
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

        // 🚀 Perform upgrade via `upgradeTo`
        (bool success, ) = proxyAddress.call(
            abi.encodeWithSignature("upgradeTo(address)", newImpl)
        );
        require(success, "upgradeTo failed");
        console.log("Proxy successfully upgraded to new implementation.");

        vm.stopBroadcast();
    }
}
