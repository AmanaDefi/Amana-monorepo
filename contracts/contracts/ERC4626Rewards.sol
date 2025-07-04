// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

/// @title ERC4626RewardsUpgradeable
/// @notice Extends ERC4626Upgradeable with a reward system for token holders.
abstract contract ERC4626Rewards is ERC4626, Ownable2Step {
    using SafeERC20 for IERC20;

    /// @notice Emitted when rewards are set.
    /// @param start Start time of the rewards schedule.
    /// @param end End time of the rewards schedule.
    /// @param rate Wei rewarded per second among all token holders.
    event RewardsSet(uint32 start, uint32 end, uint256 rate);

    /// @notice Emitted when the rewards per token are updated.
    /// @param accumulated The updated accumulated rewards per token.
    event RewardsPerTokenUpdated(uint256 accumulated);

    /// @notice Emitted when user rewards are updated.
    /// @param user Address of the user.
    /// @param userRewards Updated rewards accumulated by the user.
    /// @param paidRewardPerToken Reward per token checkpoint for the user.
    event UserRewardsUpdated(
        address user,
        uint256 userRewards,
        uint256 paidRewardPerToken
    );

    /// @notice Emitted when rewards are claimed.
    /// @param user Address of the user claiming rewards.
    /// @param receiver Address receiving the rewards.
    /// @param claimed Amount of rewards claimed.
    event Claimed(address user, address receiver, uint256 claimed);

    /// @dev Struct representing the rewards interval.
    struct RewardsInterval {
        uint32 start; // Start time for the rewards schedule.
        uint32 end; // End time for the rewards schedule.
        uint96 rate; // Wei rewarded per second among all token holders.
    }

    /// @dev Struct representing the rewards per token.
    struct RewardsPerToken {
        uint128 accumulated; // Accumulated rewards per token, scaled up by 1e18.
        uint32 lastUpdated; // Last time the rewards per token were updated.
    }

    /// @dev Struct representing user-specific rewards.
    struct UserRewards {
        uint128 accumulated; // Accumulated rewards for the user.
        uint128 checkpoint; // RewardsPerToken checkpoint for the user.
    }

    IERC20 public rewardToken; // ERC20 token used for rewards.
    RewardsInterval public rewardsInterval; // Active rewards interval.
    RewardsPerToken public rewardsPerToken; // Accumulated rewards per token.
    mapping(address => UserRewards) public accumulatedRewards; // User-specific rewards data.

    /// @notice Sets the reward token.
    /// @param _rewardToken Address of the reward token.
    function setRewardToken(address _rewardToken) external onlyOwner {
        rewardToken = IERC20(_rewardToken);
    }

    /// @notice Sets a rewards interval with a fixed total rewards amount.
    /// @param start Start time of the rewards interval.
    /// @param end End time of the rewards interval.
    /// @param totalRewards Total amount of rewards to distribute.
    function setRewardsInterval(
        uint256 start,
        uint256 end,
        uint256 totalRewards
    ) external onlyOwner {
        require(start < end, "Invalid interval");
        require(
            block.timestamp < rewardsInterval.start ||
                block.timestamp > rewardsInterval.end,
            "Rewards ongoing"
        );

        _updateRewardsPerToken();

        uint256 rate = totalRewards / (end - start);
        rewardsInterval = RewardsInterval({
            start: uint32(start),
            end: uint32(end),
            rate: uint96(rate)
        });

        rewardsPerToken.lastUpdated = uint32(start);

        emit RewardsSet(uint32(start), uint32(end), rate);
    }

    /// @notice Updates the accumulated rewards per token.
    function _updateRewardsPerToken() internal {
        if (block.timestamp < rewardsInterval.start) return;

        uint256 elapsed = block.timestamp < rewardsInterval.end
            ? block.timestamp - rewardsPerToken.lastUpdated
            : rewardsInterval.end - rewardsPerToken.lastUpdated;

        if (elapsed == 0 || totalSupply() == 0) return;

        rewardsPerToken.accumulated += uint128(
            (elapsed * rewardsInterval.rate * 1e18) / totalSupply()
        );
        rewardsPerToken.lastUpdated = uint32(block.timestamp);

        emit RewardsPerTokenUpdated(rewardsPerToken.accumulated);
    }

    /// @notice Updates the rewards for a specific user.
    /// @param user Address of the user to update rewards for.
    function _updateUserRewards(address user) internal {
        _updateRewardsPerToken();
        UserRewards memory userRewards_ = accumulatedRewards[user];

        if (userRewards_.checkpoint == rewardsPerToken.accumulated) return;

        userRewards_.accumulated += uint128(
            (balanceOf(user) *
                (rewardsPerToken.accumulated - userRewards_.checkpoint)) / 1e18
        );
        userRewards_.checkpoint = rewardsPerToken.accumulated;

        accumulatedRewards[user] = userRewards_;
        emit UserRewardsUpdated(
            user,
            userRewards_.accumulated,
            userRewards_.checkpoint
        );
    }

    /// @notice Allows a user to claim their accumulated rewards.
    /// @param to Address to send the claimed rewards.
    function claimRewards(address to) public {
        _updateUserRewards(msg.sender);
        uint256 reward = accumulatedRewards[msg.sender].accumulated;
        require(reward > 0, "No rewards to claim");

        accumulatedRewards[msg.sender].accumulated = 0;
        rewardToken.safeTransfer(to, reward);

        emit Claimed(msg.sender, to, reward);
    }

    /// @notice Updates rewards during token transfers.
    /// @param from Sender of the tokens.
    /// @param to Receiver of the tokens.
    /// @param value Amount of tokens transferred.
    function _update(
        address from,
        address to,
        uint256 value
    ) internal virtual override {
        if (from != address(0)) {
            _updateUserRewards(from);
        }

        if (to != address(0)) {
            _updateUserRewards(to);
        }

        super._update(from, to, value);
    }
}
