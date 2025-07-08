// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract DeployTopUpHandlerProxy is Script {
    function run() external {
        string memory rawPrivateKey = vm.envString("PRIVATE_KEY");
        string memory prefixedPrivateKey = rawPrivateKey;

        // Ensure the private key has the 0x prefix
        if (
            bytes(rawPrivateKey).length < 2 ||
            bytes(rawPrivateKey)[0] != "0" ||
            bytes(rawPrivateKey)[1] != "x"
        ) {
            prefixedPrivateKey = string(abi.encodePacked("0x", rawPrivateKey));
        }

        uint256 deployerPrivateKey = vm.parseUint(prefixedPrivateKey);

        // 👇 Deployed implementation address (ZetaChain mainnet)
        address implementation = 0x2A84671D8f58188Bf7FD55e84f7792B5f59FE90A;

        // 👇 Set these values as needed
        uint256 zetaThreshold = 0.01 ether;
        uint256 zetaTopUpAmount = 0.5 ether;

        // 👇 Encode the initialize() function call
        bytes memory initCalldata = abi.encodeWithSignature(
            "initialize(uint256,uint256)",
            zetaThreshold,
            zetaTopUpAmount
        );

        vm.startBroadcast(deployerPrivateKey);

        // 👇 Deploy the proxy
        ERC1967Proxy proxy = new ERC1967Proxy(implementation, initCalldata);

        vm.stopBroadcast();

        console.log("TopUpHandler proxy deployed at:", address(proxy));
        console.log("Points to implementation:", implementation);
        console.log("Initialized with threshold:", zetaThreshold);
        console.log("Initialized with topUpAmount:", zetaTopUpAmount);
    }
}
