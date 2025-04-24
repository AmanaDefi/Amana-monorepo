// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IConvexRewardPool {
    function rewardToken() external view returns (address);

    function earned(address account) external view returns (uint256);

    function getReward(
        address account,
        bool claimExtras
    ) external returns (bool);

    function extraRewardsLength() external view returns (uint256);

    function extraRewards(uint256 index) external view returns (address);

    function withdrawAndUnwrap(
        uint256 amount,
        bool claim
    ) external returns (bool);

    function withdrawAllAndUnwrap(bool claim) external;

    function withdraw(uint256 amount, bool claim) external returns (bool);

    function withdrawAll(bool claim) external;

    function balanceOf(address account) external view returns (uint256);

    function stakingToken() external view returns (address);

    function stakeFor(address account, uint256 amount) external returns (bool);
}
