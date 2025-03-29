// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import {AmanaConnectedChainVault} from "../contracts/AmanaConnectedChainVault.sol";
import {console} from "forge-std/console.sol";

contract UpgradeVault is Script {
    function run() external {
        // ✅ Hardcoded proxy address to upgrade
        address proxyAddress = 0x48CAD47d5F0211c6610754F511d3A75eCd7c3084;

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
        AmanaConnectedChainVault newImpl = new AmanaConnectedChainVault();
        console.log(" New implementation deployed at:", address(newImpl));

        // ✅ Upgrade the proxy via `upgradeToAndCall`
        (bool success, ) = proxyAddress.call(
            abi.encodeWithSignature(
                "upgradeToAndCall(address,bytes)",
                address(newImpl),
                ""
            )
        );
        require(success, " upgradeToAndCall failed");
        console.log(" Proxy successfully upgraded");

        vm.stopBroadcast();
    }
}
