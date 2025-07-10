// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ICurveStableSwapNG is IERC20 {
    // ---- Core Pool Functions ----
    function exchange(
        int128 i,
        int128 j,
        uint256 dx,
        uint256 min_dy
    ) external returns (uint256);

    function exchange(
        int128 i,
        int128 j,
        uint256 dx,
        uint256 min_dy,
        address receiver
    ) external returns (uint256);

    function add_liquidity(
        uint256[] calldata amounts,
        uint256 min_mint_amount
    ) external returns (uint256);

    function add_liquidity(
        uint256[] calldata amounts,
        uint256 min_mint_amount,
        address receiver
    ) external returns (uint256);

    function remove_liquidity_one_coin(
        uint256 burn_amount,
        int128 i,
        uint256 min_received
    ) external returns (uint256);

    function remove_liquidity_one_coin(
        uint256 burn_amount,
        int128 i,
        uint256 min_received,
        address receiver
    ) external returns (uint256);

    function remove_liquidity(
        uint256 burn_amount,
        uint256[] calldata min_amounts
    ) external returns (uint256[] memory);

    function remove_liquidity(
        uint256 burn_amount,
        uint256[] calldata min_amounts,
        address receiver
    ) external returns (uint256[] memory);

    function remove_liquidity(
        uint256 burn_amount,
        uint256[] calldata min_amounts,
        address receiver,
        bool claim_admin_fees
    ) external returns (uint256[] memory);

    function remove_liquidity_imbalance(
        uint256[] calldata amounts,
        uint256 max_burn_amount
    ) external returns (uint256);

    function remove_liquidity_imbalance(
        uint256[] calldata amounts,
        uint256 max_burn_amount,
        address receiver
    ) external returns (uint256);

    // ---- View Functions ----
    function coins(uint256 i) external view returns (address);

    function balances(uint256 i) external view returns (uint256);

    function get_balances() external view returns (uint256[] memory);

    function get_virtual_price() external view returns (uint256);

    function get_dy(
        int128 i,
        int128 j,
        uint256 dx
    ) external view returns (uint256);

    function get_dx(
        int128 i,
        int128 j,
        uint256 dy
    ) external view returns (uint256);

    function calc_token_amount(
        uint256[] calldata amounts,
        bool is_deposit
    ) external view returns (uint256);

    function calc_withdraw_one_coin(
        uint256 burn_amount,
        int128 i
    ) external view returns (uint256);

    function get_p(uint256 i) external view returns (uint256);

    function price_oracle(uint256 i) external view returns (uint256);

    function ema_price(uint256 i) external view returns (uint256);

    function last_price(uint256 i) external view returns (uint256);

    function N_COINS() external view returns (uint256);

    function A() external view returns (uint256);

    function A_precise() external view returns (uint256);

    function fee() external view returns (uint256);

    function offpeg_fee_multiplier() external view returns (uint256);

    function admin_fee() external view returns (uint256);

    function stored_rates() external view returns (uint256[] memory);

    function dynamic_fee(int128 i, int128 j) external view returns (uint256);

    function name() external view returns (string memory);

    function symbol() external view returns (string memory);

    function decimals() external view returns (uint8);
}
