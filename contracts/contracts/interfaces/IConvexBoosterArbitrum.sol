// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IConvexBoosterArbitrum {
    function deposit(uint256 _pid, uint256 _amount) external returns (bool);

    function depositAll(uint256 _pid) external returns (bool);

    function withdrawTo(
        uint256 _pid,
        uint256 _amount,
        address _to
    ) external returns (bool);

    function poolInfo(
        uint256 _pid
    )
        external
        view
        returns (
            address lptoken,
            address gauge,
            address rewards,
            bool shutdown,
            address factory
        );
}
