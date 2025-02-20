// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface ICurvePool {
    function exchange(
        uint256 i,
        uint256 j,
        uint256 dx,
        uint256 min_dy
    ) external returns (uint256);

    function coins(uint256 i) external view returns (address);

    function get_dy(
        uint256 i,
        uint256 j,
        uint256 dx
    ) external view returns (uint256);

    function add_liquidity(
        uint256[] memory amounts,
        uint256 min_mint_amount
    ) external returns (uint256);

    function remove_liquidity_one_coin(
        uint256 _token_amount,
        int128 i,
        uint256 min_amount
    ) external returns (uint256);

    function balanceOf(address account) external view returns (uint256);

    function get_virtual_price() external view returns (uint256);

    function calc_token_amount(
        uint256[] memory amounts,
        bool is_deposit
    ) external view returns (uint256);

    function calc_withdraw_one_coin(
        uint256 _token_amount,
        int128 i
    ) external view returns (uint256);

    function totalSupply() external view returns (uint256);
}
