// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import {ICLPositionManager} from "../interfaces/ICLPositionManager.sol";
import {IPermit2} from "../interfaces/IPermit2.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20StrategyParent} from "./ERC20StrategyParent.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract PancakeInfinityStrategy is ERC20StrategyParent {
    IERC721 public receiptToken;

    address public clPositionManager;
    address public permit2;
    address public token0; // USDC
    address public token1; // USD1
    address public distributor;
    uint256 public positionTokenId;

    uint24 public constant FEE_TIER = 1; // 0.01%
    int24 public constant TICK_LOWER = -25; // ~0.5% below mid price
    int24 public constant TICK_UPPER = 25; // ~0.5% above mid price
    uint24 public constant TICK_SPACING = 1; // Based on 0.01% fee tier

    function initialize(
        string memory _name,
        address _gatewayAddress,
        address _amanaVault,
        address _withdrawHelper,
        address _swapHelper,
        address _receiptTokenAddress,
        address _inputTokenAddress,
        address _rewardsToken,
        address _token0,
        address _token1
    ) external initializer {
        __StrategyParent_init(
            _name,
            _amanaVault,
            _gatewayAddress,
            _withdrawHelper,
            _inputTokenAddress,
            _receiptTokenAddress
        );
        receiptToken = IERC721(_receiptTokenAddress);

        clPositionManager = 0x55f4c8abA71A1e923edC303eb4fEfF14608cC226;
        permit2 = 0x31c2F6fcFf4F8759b3Bd5Bf0e1084A055615c768;
        token0 = _token0;
        token1 = _token1;
        distributor = 0xEA8620aAb2F07a0ae710442590D649ADE8440877;
    }

    function claimRewards() public override returns (uint256) {}

    function _reinvestRewards() internal override {}

    function _depositFundsIntoYieldSource(
        uint256 amount,
        uint256 minimumOut
    ) internal override {
        // Approve tokens to ICLPositionManager through IPermit2
        IPermit2(permit2).approve(
            token0,
            clPositionManager,
            type(uint160).max,
            type(uint48).max
        );
        IPermit2(permit2).approve(
            token1,
            clPositionManager,
            type(uint160).max,
            type(uint48).max
        );

        // Pool key setup
        ICLPositionManager.PoolKey memory key = ICLPositionManager.PoolKey({
            currency0: token0,
            currency1: token1,
            fee: FEE_TIER,
            tickSpacing: TICK_SPACING
        });

        // Convert to 128-bit safe values
        uint128 amount0 = uint128(amount / 2);
        uint128 amount1 = uint128(amount / 2);

        // Prepare action parameters
        bytes memory mintParams = abi.encode(
            key,
            TICK_LOWER,
            TICK_UPPER,
            0, // liquidity (0 to collect fees)
            amount0,
            amount1,
            address(this),
            ""
        );

        bytes[] memory params = new bytes[](1);
        params[0] = mintParams;
        bytes memory actions = abi.encodePacked(bytes1(uint8(2))); // 0x02 = CL_MINT_POSITION

        bytes memory payload = abi.encode(actions, params);
        // 1. Modify liquidity (adds LP and mints position NFT to this contract)
        ICLPositionManager(clPositionManager).modifyLiquidities(
            payload,
            block.timestamp
        );

        // 2. Retrieve the token ID of the newly minted position NFT
        positionTokenId = ICLPositionManager(clPositionManager)
            .tokenOfOwnerByIndex(address(this), 0);
    }

    function _withdrawFundsFromYieldSource(
        uint256 assetAmount,
        uint256 minAmountOut
    ) internal override returns (uint256 amountWithdrawn) {
        require(positionTokenId != 0, "No position to withdraw from");

        // Assume 1:1 asset:liquidity for now
        uint128 liquidityToWithdraw = uint128(assetAmount);

        // Build the decreaseLiquidity action
        bytes memory decreaseParams = abi.encode(
            positionTokenId,
            liquidityToWithdraw,
            minAmountOut,
            minAmountOut
        );

        bytes[] memory params = new bytes[](1);
        params[0] = decreaseParams;

        // 0x03 is CL_DECREASE_LIQUIDITY
        bytes memory actions = abi.encodePacked(bytes1(uint8(3)));

        bytes memory payload = abi.encode(actions, params);

        ICLPositionManager(clPositionManager).modifyLiquidities(
            payload,
            block.timestamp
        );

        // For now, assume we successfully withdrew `assetAmount` 1:1
        return assetAmount;
    }

    function _transferAssetsToNewStrategy() internal override {
        // BufferedTx memory txn = pendingByNonce[lastProcessedNonce + 1];
        // if (IStrategy(txn.newStrategy).amanaVault() != amanaVault)
        //     revert InvalidAmanaVault();
        // harvest();
        // rewardPool.withdrawAll(false);
        // uint256 withdrawnAmount = IERC20(rewardPool.stakingToken()).balanceOf(
        //     address(this)
        // );
        // approveOrIncreaseAllowance(
        //     IERC20(rewardPool.stakingToken()),
        //     address(rewardPool),
        //     withdrawnAmount
        // );
        // rewardPool.stakeFor(txn.newStrategy, withdrawnAmount);
        // IStrategy(txn.newStrategy).depositFromOldStrategy(
        //     withdrawnAmount,
        //     txn.minimumOut,
        //     lastProcessedNonce + 1
        // );
        // emit AssetsTransferredToNewStrategy(
        //     txn.newStrategy,
        //     withdrawnAmount,
        //     lastProcessedNonce + 1
        // );
    }

    /**
     * @dev Handles deposits from an old strategy into this strategy during a strategy switch.
     *      This function ensures the deposit comes from the old strategy, updates the execution nonce, and invests the funds.
     * @param currentExecutionNonce The current execution nonce from the old strategy.
     */
    function depositFromOldStrategy(
        uint256 amount,
        uint256,
        uint256 currentExecutionNonce
    ) external override {
        if (oldStrategy == address(0)) revert OldStrategyNotSet();
        if (msg.sender != oldStrategy) revert NotAuthorized();
        lastProcessedNonce = currentExecutionNonce;
        _sendInvestConfirmation(
            0,
            totalUnderlyingAssets(),
            currentExecutionNonce
        );
        emit AssetsReceivedFromOldStrategy(
            oldStrategy,
            amount,
            currentExecutionNonce
        );
        oldStrategy = address(0);
    }

    function totalUnderlyingAssets() public view override returns (uint256) {
        uint256 lpTokensHeld = receiptToken.balanceOf(address(this));
        return convertToAssets(lpTokensHeld);
    }

    function getStrategyWithdrawShareAmount(
        uint256 assetAmount
    ) public view override returns (uint256) {
        // uint256 totalShares = rewardPool.balanceOf(address(this));

        // uint256 sharesToWithdraw = convertToShares(assetAmount);

        // if (sharesToWithdraw > totalShares) {
        //     sharesToWithdraw = totalShares;
        // }
        // if (totalShares > 0 && totalShares - sharesToWithdraw <= 1e12) {
        //     sharesToWithdraw = totalShares;
        // }

        return assetAmount;
    }

    function convertToShares(
        uint256 assetAmount
    ) public view override returns (uint256) {
        // Assumes 1 share = 1 asset unit for stable-stable pair
        return assetAmount;
    }

    function convertToAssets(
        uint256 shares
    ) public view override returns (uint256) {
        if (shares == 0) return 0;

        uint256 balance = ICLPositionManager(clPositionManager).balanceOf(
            address(this)
        );
        if (balance == 0) return 0;

        uint256 tokenId = ICLPositionManager(clPositionManager)
            .tokenOfOwnerByIndex(address(this), 0);
        ICLPositionManager.Position memory position = ICLPositionManager(
            clPositionManager
        ).positions(tokenId);

        uint128 liquidity = position.liquidity;
        uint256 fees0 = position.tokensOwed0;
        uint256 fees1 = position.tokensOwed1;

        (uint256 amount0, uint256 amount1) = _estimateUnderlyingAssets(
            liquidity,
            fees0,
            fees1
        );
        return _convertToUSDC(amount0, amount1);
    }

    function _estimateUnderlyingAssets(
        uint128 liquidity,
        uint256 fees0,
        uint256 fees1
    ) internal pure returns (uint256 amount0, uint256 amount1) {
        // For simplicity, assume 50/50 split of liquidity into token0 and token1
        amount0 = uint256(liquidity) / 2 + fees0;
        amount1 = uint256(liquidity) / 2 + fees1;
    }

    function _convertToUSDC(
        uint256 amount0,
        uint256 amount1
    ) internal pure returns (uint256) {
        return amount0 + amount1;
    }
}
