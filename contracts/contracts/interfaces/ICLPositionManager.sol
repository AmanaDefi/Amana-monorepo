// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface ICLPositionManager {
    struct PoolKey {
        address currency0;
        address currency1;
        uint24 fee;
        uint24 tickSpacing;
    }

    struct Position {
        uint96 nonce;
        address operator;
        PoolKey key;
        int24 tickLower;
        int24 tickUpper;
        uint128 liquidity;
        uint256 feeGrowthInside0LastX128;
        uint256 feeGrowthInside1LastX128;
        uint128 tokensOwed0;
        uint128 tokensOwed1;
    }

    /// @notice Unlocks Vault and batches actions for modifying liquidity
    function modifyLiquidities(
        bytes calldata payload,
        uint256 deadline
    ) external payable;

    /// ====== ERC721 Standard Methods ======
    function balanceOf(address owner) external view returns (uint256);

    function tokenOfOwnerByIndex(
        address owner,
        uint256 index
    ) external view returns (uint256);

    function ownerOf(uint256 tokenId) external view returns (address);

    // View function to inspect a position
    function positions(uint256 tokenId) external view returns (Position memory);
}
