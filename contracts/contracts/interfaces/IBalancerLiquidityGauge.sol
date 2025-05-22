// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IBalancerLiquidityGauge {
    function deposit(uint256 amount) external;

    function deposit(uint256 amount, address user) external;

    function withdraw(uint256 amount) external;

    function withdraw(uint256 amount, address user) external;

    function claim_rewards() external;

    function claim_rewards(address user) external;

    function claim_rewards(address user, address receiver) external;

    function claim_rewards(
        address user,
        address receiver,
        uint256[] calldata rewardIndexes
    ) external;

    function reward_tokens(uint256 index) external view returns (address);

    function reward_count() external view returns (uint256);

    function balanceOf(address user) external view returns (uint256);

    function totalSupply() external view returns (uint256);

    function lp_token() external view returns (address);

    function claimed_reward(
        address user,
        address token
    ) external view returns (uint256);

    function claimable_reward(
        address user,
        address token
    ) external view returns (uint256);

    function reward_data(
        address token
    )
        external
        view
        returns (
            address distributor,
            uint256 period_finish,
            uint256 rate,
            uint256 last_update,
            uint256 integral
        );
}
