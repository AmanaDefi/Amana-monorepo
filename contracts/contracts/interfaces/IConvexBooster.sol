// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IConvexBooster {
    function deposit(
        uint256 _pid,
        uint256 _amount,
        bool _stake
    ) external returns (bool);

    function poolLength() external view returns (uint256);

    function poolInfo(
        uint256 pid
    )
        external
        view
        returns (
            address lptoken,
            address token,
            address gauge,
            address crvRewards,
            address stash,
            bool shutdown
        );
}
