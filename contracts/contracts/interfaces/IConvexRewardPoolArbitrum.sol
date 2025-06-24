// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IConvexRewardPoolArbitrum {
    struct EarnedData {
        address token;
        uint256 amount;
    }

    struct RewardType {
        address reward_token;
        uint256 reward_integral;
        uint256 reward_remaining;
    }

    // ✅ Returns the reward info at a given index
    function rewards(
        uint256 index
    )
        external
        view
        returns (
            address reward_token,
            uint256 reward_integral,
            uint256 reward_remaining
        );

    // ✅ Returns the number of active rewards (e.g., CRV, ARB, etc.)
    function rewardLength() external view returns (uint256);

    function balanceOf(address) external view returns (uint256);

    function withdraw(uint256, bool) external;

    function withdrawAll(bool) external;

    function getReward(address, address) external;

    function claimable_reward(
        address _token,
        address _account
    ) external view returns (uint256);

    function earned(address _account) external returns (EarnedData[] memory);
}
