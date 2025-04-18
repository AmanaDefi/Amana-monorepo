// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IConvexRewardPool {
    function getReward(
        address _account,
        bool _claimExtras
    ) external returns (bool);

    function earned(address _account) external view returns (uint256);

    function withdrawAndUnwrap(
        uint256 _amount,
        bool _claim
    ) external returns (bool);

    function balanceOf(address _account) external view returns (uint256);
}
