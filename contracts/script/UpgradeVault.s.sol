// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import {AmanaConnectedChainVault} from "../contracts/AmanaConnectedChainVault.sol";
import {console} from "forge-std/console.sol";

contract UpgradeVault is Script {
    function run() external {
        // ✅ Hardcoded proxy address to upgrade
        address proxyAddress = 0x0F6514E3e4760eFc8f34fc67a05c4987367aF14e;
        // address newImpl = 0x1a4810A0Dc61FF4d3D46Cb8Ac89612Cc286Ca11C; // <- older version with old switchStrategy function
        // address newImpl = 0x198938Cb9429D35562569AC567f063654166c636; // <- final version with updated switchStrategy function and toggleDepositFeePaidFromGasTank
        // address newImpl = 0xcB4b1936df6B44967Ca44A28BbC63cF1e886d06D;
        // address newImpl = 0xBDC27D4Bd051b774fB33AEFae10Bb6D698bAcEA6; // AmanaConnectedChainVault: 0x502881c6f25340e62757a7be556b0e8ccbdb195d
        // address newImpl = 0x6fE22F986797F16aabb461df546ed3317932213f; // V1 vault (old version)

        address newImpl = 0xC926Dc6E7c98ac943017D256203A3D258a6CD421; // vault: 0x83dE171743d0fE5898a19c45CfefDA1099DA9B17; //0x93F66cBdC03c15E1Ce55E2620c6592333BbF5F06; // V1 vault (older version)

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

        // ✅ Call setRegistry() on the proxy to fix the registry value
        address registryAddress = 0x3d60ddc6C6c1dc697e9c5086cd481E52aAe27705; // <- Replace with actual address

        (bool ok, ) = proxyAddress.call(
            abi.encodeWithSignature("setRegistry(address)", registryAddress)
        );
        require(ok, "setRegistry call failed");
        console.log("Registry successfully set via setRegistry()");
        vm.stopBroadcast();
    }
}
