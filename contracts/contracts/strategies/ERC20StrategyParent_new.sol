// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "./StrategyParent_new.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

abstract contract ERC20StrategyParent is StrategyParent {
    function convertToShares(
        uint256 assetAmount
    ) public view virtual returns (uint256) {
        uint256 supply = IERC20(receiptTokenAddress).totalSupply();
        uint256 assets = totalUnderlyingAssets();
        if (supply == 0 || assets == 0) return assetAmount;
        return (assetAmount * supply) / assets;
    }

    function convertToAssets(
        uint256 shareAmount
    ) public view virtual returns (uint256) {
        uint256 supply = IERC20(receiptTokenAddress).totalSupply();
        uint256 assets = totalUnderlyingAssets();
        if (supply == 0 || assets == 0) return shareAmount;
        return (shareAmount * assets) / supply;
    }

    function getStrategyWithdrawShareAmount(
        uint256 assetAmount
    ) public view virtual returns (uint256) {
        return convertToShares(assetAmount);
    }
}
