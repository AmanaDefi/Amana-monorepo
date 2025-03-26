// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.0;

import "./ERC4626Bytes.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

/// @title ERC4626Rewards
/// @notice Extends ERC4626Bytes with a reward system for token holders.
abstract contract ERC4626BytesRewards is ERC4626Bytes, Ownable2Step {
    using SafeERC20 for IERC20;

    /// @notice Emitted when rewards are set.
    event RewardsSet(uint32 start, uint32 end, uint256 rate);
    event RewardsPerTokenUpdated(uint256 accumulated);
    event UserRewardsUpdated(
        bytes user,
        uint256 userRewards,
        uint256 paidRewardPerToken
    );
    event Claimed(bytes user, bytes receiver, uint256 claimed);

    struct RewardsInterval {
        uint32 start;
        uint32 end;
        uint96 rate;
    }

    struct RewardsPerToken {
        uint128 accumulated;
        uint32 lastUpdated;
    }

    struct UserRewards {
        uint128 accumulated;
        uint128 checkpoint;
    }

    IERC20 public rewardToken;
    RewardsInterval public rewardsInterval;
    RewardsPerToken public rewardsPerToken;
    mapping(bytes => UserRewards) public accumulatedRewards;

    function setRewardToken(address _rewardToken) external onlyOwner {
        rewardToken = IERC20(_rewardToken);
    }

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

    function _updateRewardsPerToken() internal {
        if (block.timestamp < rewardsInterval.start) return;

        uint256 elapsed = block.timestamp < rewardsInterval.end
            ? block.timestamp - rewardsPerToken.lastUpdated
            : rewardsInterval.end - rewardsPerToken.lastUpdated;

        if (elapsed == 0 || totalSupply == 0) return;

        rewardsPerToken.accumulated += uint128(
            (elapsed * rewardsInterval.rate * 1e18) / totalSupply
        );
        rewardsPerToken.lastUpdated = uint32(block.timestamp);

        emit RewardsPerTokenUpdated(rewardsPerToken.accumulated);
    }

    function _updateUserRewards(bytes memory user) internal {
        _updateRewardsPerToken();
        UserRewards memory userRewards_ = accumulatedRewards[user];

        if (userRewards_.checkpoint == rewardsPerToken.accumulated) return;

        userRewards_.accumulated += uint128(
            (_balances[user] *
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

    function claimRewards(bytes memory to) public {
        bytes memory sender = abi.encodePacked(msg.sender);
        _updateUserRewards(sender);
        uint256 reward = accumulatedRewards[sender].accumulated;
        require(reward > 0, "No rewards to claim");

        accumulatedRewards[sender].accumulated = 0;
        rewardToken.safeTransfer(toAddress(to), reward);

        emit Claimed(sender, to, reward);
    }

    function claimRewards(address to) public {
        claimRewards(abi.encodePacked(to));
    }

    function _update(
        bytes memory from,
        bytes memory to,
        uint256 value
    ) internal virtual {
        if (!equals(from, "")) {
            _updateUserRewards(from);
        }
        if (!equals(to, "")) {
            _updateUserRewards(to);
        }
        _transfer(from, to, value);
    }
}
