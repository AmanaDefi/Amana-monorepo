// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

interface IUniswapV3Factory {
    /// @notice Emitted when a pool is created
    event PoolCreated(
        address indexed token0,
        address indexed token1,
        uint24 fee,
        address pool
    );

    /// @notice Returns the address of the Uniswap V3 pool for the given two tokens and fee, or address(0) if it does not exist
    function getPool(
        address tokenA,
        address tokenB,
        uint24 fee
    ) external view returns (address pool);

    /// @notice Creates a Uniswap V3 pool for the given two tokens and fee
    function createPool(
        address tokenA,
        address tokenB,
        uint24 fee
    ) external returns (address pool);

    /// @notice Returns the pool deployer address
    function poolDeployer() external view returns (address);

    /// @notice Returns the owner of the factory
    function owner() external view returns (address);
}
