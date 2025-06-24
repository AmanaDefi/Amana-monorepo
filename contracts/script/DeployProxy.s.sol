// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract DeployProxy is Script {
    function run() external {
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

        // Replace with your deployed implementation address
        address implementation = 0x21e92Bc73c0215Dbb695fba5654C2331044DbBD7;

        // No need to call initialize again — already done via block explorer
        bytes memory initCalldata = ""; // same as hex"00" or 0x

        vm.startBroadcast(deployerPrivateKey);

        ERC1967Proxy proxy = new ERC1967Proxy(implementation, initCalldata);

        vm.stopBroadcast();

        console.log("Proxy deployed at:", address(proxy));
        console.log("Points to implementation:", implementation);
    }
}
