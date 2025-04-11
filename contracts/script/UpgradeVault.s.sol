// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import {AmanaConnectedChainVaultV1} from "../contracts/AmanaConnectedChainVaultV1.sol";
import {console} from "forge-std/console.sol";

contract UpgradeVault is Script {
    function run() external {
        // ✅ Hardcoded proxy address to upgrade
        address proxyAddress = 0x5cD6e196CA1D85B8edFDf162d3A0C77268F42C69;
        // address newImpl = 0x1a4810A0Dc61FF4d3D46Cb8Ac89612Cc286Ca11C; // <- older version with old switchStrategy function
        // address newImpl = 0x198938Cb9429D35562569AC567f063654166c636; // <- final version with updated switchStrategy function and toggleDepositFeePaidFromGasTank
        // address newImpl = 0xcB4b1936df6B44967Ca44A28BbC63cF1e886d06D;
        address newImpl = 0x70774742d4065792AFeb16709acaD3a1630f3141;

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
        address registryAddress = 0x57981bb54a488861EB4f155e5001a0825D86Ff86; // <- Replace with actual address

        (bool ok, ) = proxyAddress.call(
            abi.encodeWithSignature("setRegistry(address)", registryAddress)
        );
        require(ok, "setRegistry call failed");
        console.log("Registry successfully set via setRegistry()");
        vm.stopBroadcast();
    }
}
