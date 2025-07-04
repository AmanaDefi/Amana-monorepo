// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;
import "./I4626Vault.sol";

interface IAegisStakingVault is I4626Vault {
    function cooldownAssets(
        uint256 assets,
        address owner
    ) external returns (uint256 shares);

    function unstake(address receiver) external;
}
