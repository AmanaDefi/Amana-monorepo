// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IYieldModule {
    /// @notice Deposits the input token into the yield source.
    /// @param inputToken Address of the token to deposit
    /// @param amount Amount of inputToken to deposit
    function deposit(address inputToken, uint256 amount) external;

    /// @notice Withdraws the input token from the yield source.
    /// @param inputToken Address of the token to withdraw
    /// @param minOut Minimum amount expected back
    /// @return actualOut Amount of inputToken actually withdrawn
    function withdraw(
        address inputToken,
        uint256 minOut
    ) external returns (uint256 actualOut);

    /// @notice Claims all rewards and sends them to the caller (strategy)
    function claimRewards() external;

    /// @notice Returns the total amount of assets under management by this module
    ///         (usually the value of receipt tokens staked or deposited in the protocol)
    function totalAssets() external view returns (uint256);
}
