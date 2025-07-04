// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title AmanaRegistry
/// @notice Stores shared addresses used by Amana vaults and contracts
contract AmanaRegistry is Ownable {
    address public gasTank;
    address public treasury;
    address public withdrawHelper;
    address public withdrawalReceiver;
    address public swapHelper;
    address public zapContract;

    event UpdatedGasTank(address indexed newAddress);
    event UpdatedTreasury(address indexed newAddress);
    event UpdatedWithdrawHelper(address indexed newAddress);
    event UpdatedWithdrawalReceiver(address indexed newAddress);
    event UpdatedSwapHelper(address indexed newAddress);
    event UpdatedZapContract(address indexed newAddress);

    constructor(
        address _gasTank,
        address _treasury,
        address _withdrawHelper,
        address _withdrawalReceiver,
        address _swapHelper,
        address _zapContract
    ) Ownable(msg.sender) {
        require(_gasTank != address(0), "Gas tank address cannot be zero");
        require(_treasury != address(0), "Treasury address cannot be zero");
        require(
            _withdrawHelper != address(0),
            "Withdraw helper address cannot be zero"
        );
        require(
            _withdrawalReceiver != address(0),
            "Withdrawal receiver address cannot be zero"
        );
        require(
            _swapHelper != address(0),
            "Swap helper address cannot be zero"
        );
        require(
            _zapContract != address(0),
            "Zap contract address cannot be zero"
        );
        gasTank = _gasTank;
        treasury = _treasury;
        withdrawHelper = _withdrawHelper;
        withdrawalReceiver = _withdrawalReceiver;
        swapHelper = _swapHelper;
        zapContract = _zapContract;
    }

    function setGasTank(address _addr) external onlyOwner {
        require(_addr != address(0), "Gas tank address cannot be zero");
        require(_addr != gasTank, "Gas tank address is already set");
        gasTank = _addr;
        emit UpdatedGasTank(_addr);
    }

    function setTreasury(address _addr) external onlyOwner {
        require(_addr != address(0), "Treasury address cannot be zero");
        require(_addr != treasury, "Treasury address is already set");
        treasury = _addr;
        emit UpdatedTreasury(_addr);
    }

    function setWithdrawHelper(address _addr) external onlyOwner {
        require(_addr != address(0), "Withdraw helper address cannot be zero");
        require(
            _addr != withdrawHelper,
            "Withdraw helper address is already set"
        );
        withdrawHelper = _addr;
        emit UpdatedWithdrawHelper(_addr);
    }

    function setWithdrawalReceiver(address _addr) external onlyOwner {
        require(
            _addr != address(0),
            "Withdrawal receiver address cannot be zero"
        );
        require(
            _addr != withdrawalReceiver,
            "Withdrawal receiver address is already set"
        );
        withdrawalReceiver = _addr;
        emit UpdatedWithdrawalReceiver(_addr);
    }

    function setSwapHelper(address _addr) external onlyOwner {
        require(_addr != address(0), "Swap helper address cannot be zero");
        require(_addr != swapHelper, "Swap helper address is already set");
        swapHelper = _addr;
        emit UpdatedSwapHelper(_addr);
    }

    function setZapContract(address _addr) external onlyOwner {
        require(_addr != address(0), "Zap contract address cannot be zero");
        require(_addr != zapContract, "Zap contract address is already set");
        zapContract = _addr;
        emit UpdatedZapContract(_addr);
    }

    /// @notice Optional bulk setter for convenience
    function updateAll(
        address _gasTank,
        address _treasury,
        address _withdrawHelper,
        address _withdrawalReceiver,
        address _swapHelper,
        address _zapContract
    ) external onlyOwner {
        require(_gasTank != address(0), "Gas tank address cannot be zero");
        require(_treasury != address(0), "Treasury address cannot be zero");
        require(
            _withdrawHelper != address(0),
            "Withdraw helper address cannot be zero"
        );
        require(
            _withdrawalReceiver != address(0),
            "Withdrawal receiver address cannot be zero"
        );
        require(
            _swapHelper != address(0),
            "Swap helper address cannot be zero"
        );
        require(
            _zapContract != address(0),
            "Zap contract address cannot be zero"
        );
        gasTank = _gasTank;
        treasury = _treasury;
        withdrawHelper = _withdrawHelper;
        withdrawalReceiver = _withdrawalReceiver;
        swapHelper = _swapHelper;
        zapContract = _zapContract;

        emit UpdatedGasTank(_gasTank);
        emit UpdatedTreasury(_treasury);
        emit UpdatedWithdrawHelper(_withdrawHelper);
        emit UpdatedWithdrawalReceiver(_withdrawalReceiver);
        emit UpdatedSwapHelper(_swapHelper);
        emit UpdatedZapContract(_zapContract);
    }
}
