// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title ERC20Bytes
 * @notice Custom ERC20-like implementation using `bytes` identifiers instead of `address`
 */
contract ERC20Bytes {
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;

    mapping(bytes => uint256) internal _balances;
    mapping(bytes => mapping(bytes => uint256)) internal _allowances;

    event Transfer(bytes indexed from, bytes indexed to, uint256 value);
    event Approval(bytes indexed owner, bytes indexed spender, uint256 value);

    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }

    function balanceOf(bytes memory account) public view returns (uint256) {
        return _balances[account];
    }

    function balanceOf(address account) public view returns (uint256) {
        return balanceOf(abi.encodePacked(account));
    }

    function transfer(bytes memory to, uint256 amount) public returns (bool) {
        bytes memory sender = abi.encodePacked(msg.sender);
        _transfer(sender, to, amount);
        return true;
    }

    function transfer(address to, uint256 amount) public returns (bool) {
        return transfer(abi.encodePacked(to), amount);
    }

    function approve(
        bytes memory spender,
        uint256 amount
    ) public returns (bool) {
        bytes memory owner = abi.encodePacked(msg.sender);
        _approve(owner, spender, amount);
        return true;
    }

    function approve(address spender, uint256 amount) public returns (bool) {
        return approve(abi.encodePacked(spender), amount);
    }

    function allowance(
        bytes memory owner,
        bytes memory spender
    ) public view returns (uint256) {
        return _allowances[owner][spender];
    }

    function allowance(
        address owner,
        address spender
    ) public view returns (uint256) {
        return allowance(abi.encodePacked(owner), abi.encodePacked(spender));
    }

    function transferFrom(
        bytes memory from,
        bytes memory to,
        uint256 amount
    ) public returns (bool) {
        bytes memory spender = abi.encodePacked(msg.sender);
        uint256 currentAllowance = _allowances[from][spender];
        require(
            currentAllowance >= amount,
            "ERC20Bytes: insufficient allowance"
        );
        _approve(from, spender, currentAllowance - amount);
        _transfer(from, to, amount);
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public returns (bool) {
        return
            transferFrom(abi.encodePacked(from), abi.encodePacked(to), amount);
    }

    function _transfer(
        bytes memory from,
        bytes memory to,
        uint256 amount
    ) internal {
        require(_balances[from] >= amount, "ERC20Bytes: insufficient balance");
        _balances[from] -= amount;
        _balances[to] += amount;
        emit Transfer(from, to, amount);
    }

    function _mint(bytes memory to, uint256 amount) internal {
        totalSupply += amount;
        _balances[to] += amount;
        emit Transfer("", to, amount);
    }

    function _burn(bytes memory from, uint256 amount) internal {
        require(
            _balances[from] >= amount,
            "ERC20Bytes: burn amount exceeds balance"
        );
        _balances[from] -= amount;
        totalSupply -= amount;
        emit Transfer(from, "", amount);
    }

    function _approve(
        bytes memory owner,
        bytes memory spender,
        uint256 amount
    ) internal {
        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    // Helper: convert bytes to address if needed
    function toAddress(bytes memory b) internal pure returns (address a) {
        require(b.length == 20, "Invalid address bytes");
        assembly {
            a := mload(add(b, 20))
        }
    }
}
