// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface ICometRewards {
    function getRewardOwed(
        address comet,
        address account
    ) external view returns (uint256, uint256);

    function claimTo(
        address comet,
        address src,
        address to,
        bool shouldAccrue
    ) external;
}

interface IStrategy {
    function totalShares() external view returns (uint256);

    function userShares(address user) external view returns (uint256);
}

contract RewardsClaimer is Ownable {
    IERC20 public immutable rewardToken;
    IStrategy public immutable strategy;
    ICometRewards public immutable cometRewards;
    address public immutable comet; // Compound Comet pool

    struct UserCheckpoint {
        uint256 blockNumber;
        uint256 userShares;
        uint256 totalSharesAtCheckpoint;
        uint256 rewardsAtCheckpoint;
    }

    mapping(address => UserCheckpoint[]) public userCheckpoints;
    mapping(address => uint256) public unclaimedRewards;
    uint256 public lastRecordedRewards;

    event RewardsAccrued(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event DepositRecorded(
        address indexed user,
        uint256 shares,
        uint256 totalShares
    );
    event WithdrawalRecorded(
        address indexed user,
        uint256 shares,
        uint256 totalShares,
        uint256 rewardsAccrued
    );

    constructor(
        address _rewardToken,
        address _strategy,
        address _cometRewards,
        address _comet
    ) Ownable(msg.sender) {
        rewardToken = IERC20(_rewardToken);
        strategy = IStrategy(_strategy);
        cometRewards = ICometRewards(_cometRewards);
        comet = _comet;
    }

    /**
     * @dev Called by the strategy when a user deposits.
     * Stores a checkpoint of their shares relative to the strategy’s TVL.
     */
    function recordDeposit(address user) external onlyStrategy {
        uint256 userShares = strategy.userShares(user);
        uint256 totalShares = strategy.totalShares();
        uint256 newRewards = _updateRewards();

        userCheckpoints[user].push(
            UserCheckpoint(block.number, userShares, totalShares, newRewards)
        );

        emit DepositRecorded(user, userShares, totalShares);
    }

    /**
     * @dev Called by the strategy when a user withdraws.
     * Accrues their rewards before removing them from tracking.
     */
    function recordWithdrawal(address user) external onlyStrategy {
        uint256 newRewards = _updateRewards();
        uint256 owedRewards = _calculateUserRewards(user, newRewards);

        unclaimedRewards[user] += owedRewards;

        // Remove user checkpoints
        delete userCheckpoints[user];

        emit WithdrawalRecorded(
            user,
            strategy.userShares(user),
            strategy.totalShares(),
            owedRewards
        );
    }

    /**
     * @dev Users can claim their accumulated rewards.
     */
    function claimRewards() external {
        uint256 totalRewards = unclaimedRewards[msg.sender] +
            _calculateUserRewards(msg.sender, _updateRewards());
        require(totalRewards > 0, "No rewards available");

        // Claim from Compound CometRewards contract
        cometRewards.claimTo(comet, address(strategy), address(this), true);

        // Transfer to user
        require(
            rewardToken.transfer(msg.sender, totalRewards),
            "Transfer failed"
        );

        unclaimedRewards[msg.sender] = 0;

        emit RewardsClaimed(msg.sender, totalRewards);
    }

    /**
     * @dev Fetches the latest rewards from Compound and updates the global rewards tracker.
     */
    function _updateRewards() internal returns (uint256) {
        (uint256 rewardsOwed, ) = cometRewards.getRewardOwed(
            comet,
            address(strategy)
        );
        uint256 newRewards = rewardsOwed - lastRecordedRewards;
        lastRecordedRewards = rewardsOwed;
        return newRewards;
    }

    /**
     * @dev Calculates the share of the strategy’s rewards for a given user.
     */
    function _calculateUserRewards(
        address user,
        uint256 newRewards
    ) internal view returns (uint256) {
        uint256 totalRewardsOwed = 0;
        uint256 numCheckpoints = userCheckpoints[user].length;

        for (uint256 i = 0; i < numCheckpoints; i++) {
            UserCheckpoint storage checkpoint = userCheckpoints[user][i];

            // User’s proportional share of rewards
            uint256 userReward = (checkpoint.userShares * newRewards) /
                checkpoint.totalSharesAtCheckpoint;
            totalRewardsOwed += userReward;
        }

        return totalRewardsOwed;
    }

    modifier onlyStrategy() {
        require(msg.sender == address(strategy), "Only strategy can call");
        _;
    }
}
