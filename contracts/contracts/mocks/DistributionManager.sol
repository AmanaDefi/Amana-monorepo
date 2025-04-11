// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DistributionManager {
    struct Distribution {
        uint32 chainId;
        string protocolName;
        address inputTokenAddress;
        uint256 totalAmount;
    }

    Distribution[] private distributionList;

    /// @notice Sets the entire distribution list at once
    /// @param _distributions Array of Distribution structs to replace the current list
    function setDistributionList(
        Distribution[] calldata _distributions
    ) external {
        delete distributionList;
        for (uint i = 0; i < _distributions.length; i++) {
            distributionList.push(_distributions[i]);
        }
    }

    /// @notice Returns the entire distribution list
    /// @return Array of Distribution structs
    function getDistributionList()
        external
        view
        returns (Distribution[] memory)
    {
        return distributionList;
    }

    /// @notice Replaces the current distribution list with a new list
    /// @param _newList Array of Distribution structs to replace the current list
    function updateDistributionList(Distribution[] calldata _newList) external {
        delete distributionList;
        for (uint i = 0; i < _newList.length; i++) {
            distributionList.push(_newList[i]);
        }
    }
}
