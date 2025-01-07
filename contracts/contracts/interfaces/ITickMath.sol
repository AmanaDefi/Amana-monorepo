// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.4 <0.9.0;

/// @title ITickMath
/// @notice Interface for the TickMath library, encapsulating key methods and constants.
interface ITickMath {
    /// @dev The minimum tick that may be passed to #getSqrtRatioAtTick
    ///      Computed from log base 1.0001 of 2**-128
    function MIN_TICK() external pure returns (int24);

    /// @dev The maximum tick that may be passed to #getSqrtRatioAtTick
    ///      Computed from log base 1.0001 of 2**128
    function MAX_TICK() external pure returns (int24);

    /// @dev The minimum value that can be returned from #getSqrtRatioAtTick
    ///      Equivalent to getSqrtRatioAtTick(MIN_TICK)
    function MIN_SQRT_RATIO() external pure returns (uint160);

    /// @dev The maximum value that can be returned from #getSqrtRatioAtTick
    ///      Equivalent to getSqrtRatioAtTick(MAX_TICK)
    function MAX_SQRT_RATIO() external pure returns (uint160);

    /// @notice Calculates sqrt(1.0001^tick) * 2^96
    /// @dev Throws if |tick| > MAX_TICK
    /// @param tick The input tick for the above formula
    /// @return price A fixed point Q64.96 number representing the sqrt of the ratio of the two assets (token1/token0)
    function getSqrtRatioAtTick(
        int24 tick
    ) external pure returns (uint160 price);

    /// @notice Calculates the greatest tick value such that getRatioAtTick(tick) <= ratio
    /// @dev Throws in case price < MIN_SQRT_RATIO, as MIN_SQRT_RATIO is the lowest value getRatioAtTick may ever return.
    /// @param price The sqrt ratio for which to compute the tick as a Q64.96
    /// @return tick The greatest tick for which the ratio is less than or equal to the input ratio
    function getTickAtSqrtRatio(
        uint160 price
    ) external pure returns (int24 tick);
}
