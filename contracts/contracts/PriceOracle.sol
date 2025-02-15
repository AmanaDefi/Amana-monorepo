// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";

// PYTH_CONTRACT_ADDRESS = 0x0708325268dF9F66270F1401206434524814508b for ZetaChain testnet
// PYTH_CONTRACT_ADDRESS = 0x2880aB155794e7179c9eE2e38200202908C17B43 for ZetaChain mainnet

contract PriceOracle {
    address public immutable PYTH_CONTRACT_ADDRESS;
    uint256 public maxStaleness = 300; // Require price to be updated within the last 5 minutes

    event MaxStalenessUpdated(uint256 maxStaleness);

    IPyth public pyth;

    /**
     * @notice Constructor to initialize the Pyth contract address.
     * @param _pythContractAddress The address of the Pyth contract.
     */
    constructor(address _pythContractAddress) {
        require(_pythContractAddress != address(0), "Invalid Pyth address");
        PYTH_CONTRACT_ADDRESS = _pythContractAddress;
        pyth = IPyth(_pythContractAddress);
    }

    /**
     * @notice Sets the maximum staleness allowed for price updates.
     * @param _maxStaleness The new maximum staleness in seconds.
     */
    function setMaxStaleness(uint256 _maxStaleness) external {
        maxStaleness = _maxStaleness;
        emit MaxStalenessUpdated(_maxStaleness);
    }

    /**
     * @notice Fetch the price specified by the priceFeedId from the Pyth contract, ensuring it is no older than maxStaleness.
     * @param priceFeedId The unique identifier for the price feed.
     * @return returnedPrice The current price scaled by 10^8.
     */
    function fetchPrice(
        bytes32 priceFeedId
    ) external payable returns (uint256 returnedPrice) {
        // Fetch the latest price that is no older than the specified maxStaleness
        PythStructs.Price memory price = pyth.getPriceNoOlderThan(
            priceFeedId,
            maxStaleness
        );

        // Ensure the price is valid (greater than 0)
        require(price.price > 0, "Invalid price");

        // Return the price in uint256 format
        return uint256(uint64(price.price));
    }
}
