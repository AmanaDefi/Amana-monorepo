// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";

contract PriceOracle {
    address constant PYTH_CONTRACT_ADDRESS =
        0x2880aB155794e7179c9eE2e38200202908C17B43;
    uint256 public maxStaleness = 60; // Require price to be updated within the last 60 seconds

    IPyth public pyth = IPyth(0x2880aB155794e7179c9eE2e38200202908C17B43);

    function setMaxStaleness(uint256 _maxStaleness) external {
        maxStaleness = _maxStaleness;
    }

    /**
     * @notice Fetch the ETH/USD price from the Pyth contract, ensuring it is no older than 60 seconds.
     * @return ethPrice The current ETH/USD price scaled by 10^8.
     */
    function fetchEthUsdPrice() external payable returns (uint256 ethPrice) {
        // ETH/USD price feed ID (update with your specific feed ID if needed)
        bytes32 ethUsdPriceFeedId = 0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace; // ETH/USD

        // Fetch the latest price that is no older than 60 seconds
        PythStructs.Price memory price = pyth.getPriceNoOlderThan(
            ethUsdPriceFeedId,
            60
        );

        // Ensure the price is valid (greater than 0)
        require(price.price > 0, "Invalid ETH price");

        // Return the price in uint256 format
        return uint256(uint64(price.price));
    }

    /**
     * @notice Updates the on-chain price feeds using the provided price updates from Pyth.
     * @dev This function calculates the required fee for the price update and ensures the caller has sent sufficient funds to cover it.
     *      The `pyth.updatePriceFeeds` method is called to update the prices on-chain.
     * @param priceUpdate An array of encoded price update data to be submitted to the Pyth contract.
     */
    function updatePrices(bytes[] calldata priceUpdate) external payable {
        uint256 updateFee = pyth.getUpdateFee(priceUpdate);
        require(msg.value >= updateFee, "Insufficient fee");
        pyth.updatePriceFeeds{value: updateFee}(priceUpdate);
    }

    receive() external payable {}
}
