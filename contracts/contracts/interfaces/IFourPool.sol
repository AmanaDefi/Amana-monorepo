// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IFourPool {
    function add_liquidity(
        uint256[4] memory amounts,
        uint256 min_mint_amount
    ) external;

    function remove_liquidity_one_coin(
        uint256 _token_amount,
        uint256 i,
        uint256 min_amount
    ) external returns (uint256);

    function calc_withdraw_one_coin(
        uint256 _token_amount,
        uint256 i
    ) external view returns (uint256);

    function calc_token_amount(
        uint256[4] memory amounts,
        bool is_deposit
    ) external view returns (uint256);
}
