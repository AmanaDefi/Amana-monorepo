// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface ICurveRegistry {
    function find_pool_for_coins(
        address tokenAddress1,
        address tokenAddress2,
        uint256 curveVersion
    ) external view returns (address);

    function find_pool_for_coins(
        address _from,
        address _to
    ) external view returns (address);

    function get_coin_indices(
        address _pool,
        address _from,
        address _to
    ) external view returns (int128, int128, bool);
}
