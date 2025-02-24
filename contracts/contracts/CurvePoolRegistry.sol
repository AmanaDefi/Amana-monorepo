// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/Ownable.sol";

contract CurvePoolRegistry is Ownable {
    struct PoolInfo {
        address pool;
        address[] tokens; // List of all tokens in the pool
    }

    mapping(address => PoolInfo) public poolData; // pool address => PoolInfo
    mapping(address => address[]) public tokenPools; // token => list of pools it belongs to

    event PoolAdded(address indexed pool, address[] tokens);

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Adds a new Curve pool with multiple supported tokens.
     * @dev Can only be called by the contract owner.
     * @param pool The Curve pool contract address.
     * @param tokens The list of tokens supported by this pool.
     */
    function addPool(
        address pool,
        address[] calldata tokens
    ) external onlyOwner {
        require(pool != address(0), "Invalid pool address");
        require(tokens.length > 1, "Pool must support at least two tokens");

        poolData[pool] = PoolInfo(pool, tokens);

        for (uint256 i = 0; i < tokens.length; i++) {
            tokenPools[tokens[i]].push(pool);
        }

        emit PoolAdded(pool, tokens);
    }

    /**
     * @notice Finds the best Curve pool that supports both `tokenA` and `tokenB`.
     * @param tokenA The first token.
     * @param tokenB The second token.
     * @return pool The address of the Curve pool, or `address(0)` if none is found.
     */
    function getBestPool(
        address tokenA,
        address tokenB
    ) external view returns (address) {
        address[] memory poolsForTokenA = tokenPools[tokenA];

        for (uint256 i = 0; i < poolsForTokenA.length; i++) {
            address pool = poolsForTokenA[i];
            address[] memory tokens = poolData[pool].tokens;

            for (uint256 j = 0; j < tokens.length; j++) {
                if (tokens[j] == tokenB) {
                    return pool;
                }
            }
        }

        return address(0); // No matching pool found
    }

    /**
     * @notice Fetches all pools that a token belongs to.
     * @param token The token to check.
     * @return pools The list of pool addresses that include this token.
     */
    function getPoolsForToken(
        address token
    ) external view returns (address[] memory) {
        return tokenPools[token];
    }
}
