// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import {console} from "forge-std/console.sol";

contract Upgrade is Script {
    function run() external {
        // 🛰️ Proxy address you want to upgrade
        address proxyAddress = 0x74fCAd57C966cAB6fa02a0A5425b1c76DcaFe9A0;

        // 🆕 New implementation contract address
        address newImpl = 0x731396D5c1E5F04316ed1aaa5dc357B5a10bdAa9;

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

        // 🚀 Perform upgrade via `upgradeToAndCall`
        (bool success, ) = proxyAddress.call(
            abi.encodeWithSignature(
                "upgradeToAndCall(address,bytes)",
                address(newImpl),
                ""
            )
        );
        require(success, "upgradeToAndCall failed");

        console.log("Proxy successfully upgraded to new implementation.");

        vm.stopBroadcast();
    }
}
