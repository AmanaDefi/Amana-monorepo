// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@storknetwork/stork_pyth_adapter/contracts/StorkPythAdapter.sol";

// pythContractAddress = 0x0708325268dF9F66270F1401206434524814508b for ZetaChain testnet
// pythContractAddress = 0x2880aB155794e7179c9eE2e38200202908C17B43 for ZetaChain mainnet
// pythContractAddress = 0x4305FB66699C3B2702D4d05CF36551390A4c69C6 for Ethereum mainnet
// pythContractAddress = 0x8250f4aF4B972684F7b336503E2D6dFeDeB1487a for Base mainnet
// pythContractAddress = 0xff1a0f4744e8582DF1aE09D5611b887B6a12925C for Polygon

contract PriceOracle is Ownable {
    address public immutable pythContractAddress;
    uint256 public maxStaleness = 300; // Require price to be updated within the last 5 minutes

    IPyth public pyth;
    StorkPythAdapter private storkPythAdapter;

    /**
     * @notice Constructor to initialize the Pyth contract address.
     * @param _pythContractAddress The address of the Pyth contract.
     */
    constructor(
        address _pythContractAddress,
        address _storkContractAddress
    ) Ownable(msg.sender) {
        require(_pythContractAddress != address(0), "Invalid Pyth address");
        pythContractAddress = _pythContractAddress;
        pyth = IPyth(_pythContractAddress);
        storkPythAdapter = StorkPythAdapter(_storkContractAddress);
    }

    event MaxStalenessUpdated(uint256 maxStaleness);

    /**
     * @notice Sets the maximum staleness allowed for price updates.
     * @param _maxStaleness The new maximum staleness in seconds.
     */
    function setMaxStaleness(uint256 _maxStaleness) external onlyOwner {
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
        PythStructs.Price memory price;

        if (
            priceFeedId ==
            0x4fad14ab0b3793942fa6b796f40b263f0bb67815685625f9061f804cc4f7968f
        ) {
            try
                storkPythAdapter.getPriceNoOlderThan(priceFeedId, maxStaleness)
            returns (PythStructs.Price memory result) {
                price = result;
            } catch {
                // Fallback to unsafe price for any kind of error
                price = storkPythAdapter.getPriceUnsafe(priceFeedId);
            }
        } else {
            try pyth.getPriceNoOlderThan(priceFeedId, maxStaleness) returns (
                PythStructs.Price memory result
            ) {
                price = result;
            } catch {
                // Fallback to unsafe price for any kind of error
                price = pyth.getPriceUnsafe(priceFeedId);
            }
        }
        require(price.price > 0, "Invalid price");

        return uint256(uint64(price.price));
    }
}
