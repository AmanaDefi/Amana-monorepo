// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ICurveTricryptoPool is IERC20 {
    function add_liquidity(
        uint256[3] calldata amounts,
        uint256 min_mint_amount
    ) external returns (uint256);

    function remove_liquidity_one_coin(
        uint256 tokenAmount,
        uint256 i,
        uint256 minAmount
    ) external returns (uint256);

    function calc_token_amount(
        uint256[3] calldata amounts,
        bool isDeposit
    ) external view returns (uint256);

    function calc_withdraw_one_coin(
        uint256 tokenAmount,
        uint256 i
    ) external view returns (uint256);
}
