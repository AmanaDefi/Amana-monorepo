// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ICurveLiquidityGauge {
    /// @notice Deposits `_value` amount of LP tokens into the gauge.
    /// @param _value The amount of LP tokens to deposit.
    function deposit(uint256 _value) external;

    /// @notice Deposits `_value` amount of LP tokens on behalf of `_addr`.
    /// @param _value The amount of LP tokens to deposit.
    /// @param _addr The address on whose behalf to deposit.
    function deposit(uint256 _value, address _addr) external;

    /// @notice Deposits `_value` amount of LP tokens on behalf of `_addr` and claims rewards.
    /// @param _value The amount of LP tokens to deposit.
    /// @param _addr The address on whose behalf to deposit.
    /// @param _claim_rewards Whether to claim rewards after deposit.
    function deposit(
        uint256 _value,
        address _addr,
        bool _claim_rewards
    ) external;

    /// @notice Withdraws `_value` amount of LP tokens from the gauge.
    /// @param _value The amount of LP tokens to withdraw.
    function withdraw(uint256 _value) external;

    /// @notice Withdraws `_value` amount of LP tokens and claims rewards.
    /// @param _value The amount of LP tokens to withdraw.
    /// @param _claim_rewards Whether to claim rewards after withdrawal.
    function withdraw(uint256 _value, bool _claim_rewards) external;

    /// @notice Claims rewards for the caller.
    function claim_rewards() external;

    /// @notice Claims rewards for a specific address.
    /// @param _addr The address for which to claim rewards.
    function claim_rewards(address _addr) external;

    /// @notice Claims rewards for `_addr` and sends them to `_receiver`.
    /// @param _addr The address for which to claim rewards.
    /// @param _receiver The address that will receive the claimed rewards.
    function claim_rewards(address _addr, address _receiver) external;

    /// @notice Gets the amount of claimable reward tokens for a user.
    /// @param _user The user's address.
    /// @param _reward_token The address of the reward token.
    /// @return The amount of claimable rewards.
    function claimable_reward(
        address _user,
        address _reward_token
    ) external view returns (uint256);

    /// @notice Gets the amount of LP tokens deposited by a user.
    /// @param _user The user's address.
    /// @return The amount of LP tokens deposited.
    function balanceOf(address _user) external view returns (uint256);

    /// @notice Gets the total supply of LP tokens staked in the gauge.
    /// @return The total supply of LP tokens staked.
    function totalSupply() external view returns (uint256);
}
