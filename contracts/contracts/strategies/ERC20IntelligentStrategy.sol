// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "./ERC20StrategyParent_new.sol";
import "../interfaces/IYieldModule.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

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

    event RebalanceExecuted(RebalanceInstruction instruction);

    function rebalance(
        RebalanceInstruction[] calldata instructions
    ) external onlyOwner {
        for (uint256 i = 0; i < instructions.length; ++i) {
            RebalanceInstruction memory instr = instructions[i];

            if (instr.action == RebalanceAction.Deposit) {
                IERC20(instr.inputToken).approve(instr.module, instr.amount);
                IYieldModule(instr.module).deposit(
                    instr.inputToken,
                    instr.amount
                );
            } else if (instr.action == RebalanceAction.Withdraw) {
                uint256 received = IYieldModule(instr.module).withdraw(
                    instr.inputToken,
                    instr.minOut
                );
                IERC20(instr.inputToken).transferFrom(
                    instr.module,
                    address(this),
                    received
                );
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
        }
        require(totalBps == 10000, "Total allocation must be 10000 bps");
    }

    function totalUnderlyingAssets()
        public
        view
        override
        returns (uint256 total)
    {
        for (uint256 i = 0; i < currentAllocations.length; ++i) {
            total += IYieldModule(currentAllocations[i].module).totalAssets();
        }
    }

    function _invest() internal override {
        uint256 balance = inputToken.balanceOf(address(this));
        require(balance > 0, "No assets to invest");

        for (uint256 i = 0; i < currentAllocations.length; ++i) {
            ModuleAllocation memory alloc = currentAllocations[i];
            uint256 share = (balance * alloc.bps) / 10000;
            inputToken.approve(alloc.module, share);
            IYieldModule(alloc.module).deposit(address(inputToken), share);
        }
    }

    function _divest() internal override {
        BufferedTx storage txData = pendingByNonce[lastProcessedNonce + 1];
        uint256 totalWithdrawn;

        for (uint256 i = 0; i < currentAllocations.length; ++i) {
            ModuleAllocation memory alloc = currentAllocations[i];
            uint256 share = (txData.assetAmount * alloc.bps) / 10000;
            uint256 received = IYieldModule(alloc.module).withdraw(
                address(inputToken),
                share
            );
            IERC20(inputToken).transferFrom(
                alloc.module,
                address(this),
                received
            );
            totalWithdrawn += received;
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
}
