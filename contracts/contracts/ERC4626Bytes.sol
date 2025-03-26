// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./ERC20Bytes.sol";

/**
 * @title ERC4626Bytes
 * @notice Extension for vaults using `bytes`-based identity
 */
abstract contract ERC4626Bytes is ERC20Bytes {
    IERC20 public immutable asset;

    constructor(
        IERC20 _asset,
        string memory _name,
        string memory _symbol,
        uint8 _decimals
    ) ERC20Bytes(_name, _symbol, _decimals) {
        asset = _asset;
    }

    function deposit(
        uint256 assets,
        bytes memory receiver
    ) public returns (uint256 shares) {
        shares = previewDeposit(assets);
        asset.transferFrom(
            toAddress(abi.encodePacked(msg.sender)),
            address(this),
            assets
        );
        _mint(receiver, shares);
    }

    function deposit(
        uint256 assets,
        address receiver
    ) external returns (uint256 shares) {
        return deposit(assets, abi.encodePacked(receiver));
    }

    function withdraw(
        uint256 assets,
        bytes memory receiver,
        bytes memory owner
    ) public returns (uint256 shares) {
        shares = previewWithdraw(assets);
        if (!equals(owner, abi.encodePacked(msg.sender))) {
            uint256 allowed = allowance(owner, abi.encodePacked(msg.sender));
            require(allowed >= shares, "ERC4626Bytes: insufficient allowance");
            _approve(owner, abi.encodePacked(msg.sender), allowed - shares);
        }
        _burn(owner, shares);
        asset.transfer(toAddress(receiver), assets);
    }

    function withdraw(
        uint256 assets,
        address receiver,
        address owner
    ) external returns (uint256 shares) {
        return
            withdraw(
                assets,
                abi.encodePacked(receiver),
                abi.encodePacked(owner)
            );
    }

    function previewDeposit(
        uint256 assets
    ) public view virtual returns (uint256) {
        return assets; // identity for simplicity
    }

    function previewWithdraw(
        uint256 assets
    ) public view virtual returns (uint256) {
        return assets; // identity for simplicity
    }

    function equals(
        bytes memory a,
        bytes memory b
    ) internal pure returns (bool) {
        return keccak256(a) == keccak256(b);
    }
}
