// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "./ERC20StrategyParent_new.sol";
import "../interfaces/IYieldModule.sol";
import "./StrategyHelper.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol"; // For debugging purposes

contract ERC20IntelligentStrategy is ERC20StrategyParent {
    enum RebalanceAction {
        Deposit,
        Withdraw
    }

    struct RebalanceInstruction {
        address module;
        address inputToken;
        uint256 amount;
        uint256 minOut;
        RebalanceAction action;
    }

    struct ModuleAllocation {
        address module;
        uint256 bps; // out of 10000
    }

    ModuleAllocation[] public currentAllocations;

    mapping(address => bool) public moduleIncluded;

    event RebalanceExecuted(RebalanceInstruction instruction);

    function initialize(
        string memory _name,
        address _gateway,
        address _amanaVault,
        address _withdrawHelper,
        address _inputToken,
        address _receiptToken
    ) public initializer {
        __UUPSUpgradeable_init();
        __StrategyParent_init(
            _name,
            _amanaVault,
            _gateway,
            _withdrawHelper,
            _inputToken,
            _receiptToken
        );
    }

    function getAllocations()
        external
        view
        returns (ModuleAllocation[] memory)
    {
        return currentAllocations;
    }

    function rebalance(
        RebalanceInstruction[] calldata instructions
    ) external onlyOwner {
        uint256 localBalance = IERC20(instructions[0].inputToken).balanceOf(
            address(this)
        );
        uint256 balance = localBalance;

        for (uint256 i = 0; i < instructions.length; ++i) {
            RebalanceInstruction memory instr = instructions[i];

            if (instr.action == RebalanceAction.Deposit) {
                uint256 depositAmount = instr.amount;
                require(
                    balance >= depositAmount,
                    "Insufficient balance for deposit"
                );
                balance -= depositAmount;

                StrategyHelper.approveOrIncreaseAllowance(
                    IERC20(instr.inputToken),
                    instr.module,
                    depositAmount
                );
                console.log(
                    "Depositing %s to module %s",
                    depositAmount,
                    instr.module
                );
                IYieldModule(instr.module).deposit(
                    instr.inputToken,
                    depositAmount
                );
                console.log(
                    "Deposited %s to module %s",
                    depositAmount,
                    instr.module
                );
            } else if (instr.action == RebalanceAction.Withdraw) {
                require(instr.amount > 0, "Withdraw amount must be > 0");
                uint256 received = IYieldModule(instr.module).withdraw(
                    instr.inputToken,
                    instr.amount
                );
                require(received >= instr.minOut, "Insufficient withdrawal");
            } else {
                revert("Invalid rebalance action");
            }

            emit RebalanceExecuted(instr);
        }
    }

    function setAllocations(
        ModuleAllocation[] calldata allocations
    ) external onlyOwner {
        delete currentAllocations;

        uint256 totalBps = 0;
        for (uint256 i = 0; i < allocations.length; ++i) {
            require(allocations[i].module != address(0), "Invalid module");
            totalBps += allocations[i].bps;
            currentAllocations.push(allocations[i]);
            moduleIncluded[allocations[i].module] = true;
        }

        require(totalBps == 10000, "Total allocation must be 10000 bps");
    }

    function totalUnderlyingAssets()
        public
        view
        override
        returns (uint256 total)
    {
        total += inputToken.balanceOf(address(this));
        for (uint256 i = 0; i < currentAllocations.length; ++i) {
            total += IYieldModule(currentAllocations[i].module).totalAssets();
        }
    }

    function _invest() internal override {
        // Funds are accumulated in the strategy and deployed during rebalance
    }

    function _divest() internal override {
        BufferedTx storage txData = pendingByNonce[lastProcessedNonce + 1];
        uint256 totalWithdrawn = inputToken.balanceOf(address(this));

        if (totalWithdrawn < txData.assetAmount) {
            uint256 shortfall = txData.assetAmount - totalWithdrawn;

            for (uint256 i = 0; i < currentAllocations.length; ++i) {
                ModuleAllocation memory alloc = currentAllocations[i];
                uint256 share = (shortfall * alloc.bps) / 10000;
                uint256 received = IYieldModule(alloc.module).withdraw(
                    address(inputToken),
                    share
                );
                totalWithdrawn += received;
                if (totalWithdrawn >= txData.assetAmount) break;
            }
        }

        require(totalWithdrawn >= txData.minimumOut, "Too little withdrawn");

        uint256 totalAssetsAfter = totalUnderlyingAssets();
        sendFundsAndDivestConfirmation(
            totalWithdrawn,
            totalAssetsAfter,
            lastProcessedNonce + 1
        );

        emit FundsDivested(
            lastProcessedNonce + 1,
            totalWithdrawn,
            totalAssetsAfter
        );
    }

    function _transferAssetsToNewStrategy() internal override {
        revert("Not implemented");
    }

    function _withdrawFundsFromYieldSource(
        uint256,
        uint256
    ) internal pure override returns (uint256) {
        revert("Not used in intelligent strategy");
    }

    function claimAllRewards() external onlyOwner {
        for (uint256 i = 0; i < currentAllocations.length; ++i) {
            IYieldModule(currentAllocations[i].module).claimRewards();
        }
    }
}
