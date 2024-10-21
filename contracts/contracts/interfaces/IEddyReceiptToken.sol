// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IEddyReceiptToken is IERC20 {
    function minter() external view returns (address);
}
