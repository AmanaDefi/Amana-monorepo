// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IConvexRewardPoolArbitrum {
    function balanceOf(address) external view returns (uint256);

    function withdraw(uint256, bool) external;

    function withdrawAll(bool) external;

    function getReward(address, address) external;

    function stakeFor(address, uint256) external;

    function stakingToken() external view returns (address);
}
