// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IStork {
    struct TemporalNumericValue {
        uint64 timestampNs;
        int192 quantizedValue;
    }

    function getTemporalNumericValueV1(
        bytes32 id
    ) external view returns (TemporalNumericValue memory);

    function getTemporalNumericValueUnsafeV1(
        bytes32 id
    ) external view returns (TemporalNumericValue memory);

    function validTimePeriodSeconds() external view returns (uint);
}

contract PriceOracle is Ownable {
    address public immutable pythContractAddress;
    uint256 public maxStaleness = 300;

    IPyth public pyth;
    IStork public stork;

    int32 private constant EXPONENT = -18;
    uint64 private constant CONFIDENCE_INTERVAL = 0;

    bytes32 private constant STORK_FEED_ID =
        0x4fad14ab0b3793942fa6b796f40b263f0bb67815685625f9061f804cc4f7968f;

    constructor(
        address _pythContractAddress,
        address _storkContractAddress
    ) Ownable(msg.sender) {
        require(_pythContractAddress != address(0), "Invalid Pyth address");

        pythContractAddress = _pythContractAddress;
        pyth = IPyth(_pythContractAddress);
        if (_storkContractAddress != address(0)) {
            stork = IStork(_storkContractAddress);
        }
    }

    event MaxStalenessUpdated(uint256 maxStaleness);

    function setMaxStaleness(uint256 _maxStaleness) external onlyOwner {
        maxStaleness = _maxStaleness;
        emit MaxStalenessUpdated(_maxStaleness);
    }

    function fetchPrice(
        bytes32 priceFeedId
    ) external payable returns (uint256 returnedPrice) {
        PythStructs.Price memory price;

        if (priceFeedId == STORK_FEED_ID) {
            // Try getStorkPriceNoOlderThan, fallback to getStorkPriceUnsafe
            bool isStale;
            (price, isStale) = getStorkPriceNoOlderThan(
                priceFeedId,
                maxStaleness
            );

            if (isStale) {
                price = getStorkPriceUnsafe(priceFeedId);
            }
        } else {
            try pyth.getPriceNoOlderThan(priceFeedId, maxStaleness) returns (
                PythStructs.Price memory result
            ) {
                price = result;
            } catch {
                price = pyth.getPriceUnsafe(priceFeedId);
            }
        }

        require(price.price > 0, "Invalid price");
        return uint256(uint64(price.price));
    }

    function getStorkPriceNoOlderThan(
        bytes32 id,
        uint age
    ) internal view returns (PythStructs.Price memory, bool isStale) {
        IStork.TemporalNumericValue memory value = stork
            .getTemporalNumericValueUnsafeV1(id);
        uint256 timestampSec = value.timestampNs / 1e9;
        isStale = block.timestamp > timestampSec + age;

        return (
            PythStructs.Price(
                convertInt192ToInt64(value.quantizedValue),
                CONFIDENCE_INTERVAL,
                EXPONENT,
                timestampSec
            ),
            isStale
        );
    }

    function getStorkPriceUnsafe(
        bytes32 id
    ) internal view returns (PythStructs.Price memory) {
        IStork.TemporalNumericValue memory value = stork
            .getTemporalNumericValueUnsafeV1(id);
        return
            PythStructs.Price(
                convertInt192ToInt64(value.quantizedValue),
                CONFIDENCE_INTERVAL,
                EXPONENT,
                value.timestampNs / 1e9
            );
    }

    function convertInt192ToInt64(int192 value) public pure returns (int64) {
        require(
            value >= type(int64).min && value <= type(int64).max,
            "Overflow"
        );
        return int64(value);
    }
}
