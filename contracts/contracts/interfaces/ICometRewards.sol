// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface ICometRewards {
    struct RewardOwed {
        address token;
        uint owed;
    }

    function claim(
        address receiptToken,
        address src,
        bool shouldAccrue
    ) external;

    function claimTo(
        address receiptToken,
        address src,
        address dst,
        bool shouldAccrue
    ) external;

    function getRewardOwed(
        address receiptToken,
        address userAccount
    ) external returns (RewardOwed memory);
}
