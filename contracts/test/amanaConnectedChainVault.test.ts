import { ethers, upgrades, network } from "hardhat";
import { expect } from "chai";
import { Signer, BigNumber } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { AmanaConnectedChainVault, IERC20 } from "../typechain";
import { setTokenBalance } from "./utils";
import GatewayZEVMABI from "@zetachain/protocol-contracts/abi/GatewayZEVM.sol/GatewayZEVM.json";
import dotenv from "dotenv";
import { PriceServiceConnection } from "@pythnetwork/price-service-client";
import { generateTransactionId } from "./utils";

dotenv.config();

import {
  ZC_ETH_BASE_ADDRESS,
  ZC_ETH_ETH_ADDRESS,
  ZC_USDC_BSC_ADDRESS,
} from "../../constants";

describe("AmanaConnectedChainVault Tests", function () {

  let amanaVault: AmanaConnectedChainVault;
  let owner: Signer;
  let user1: Signer;
  let user2: Signer;
  let gatewaySigner: Signer;
  let ethBase: IERC20;
  let ethEth: IERC20;
  let usdcBSC: IERC20;
  let withdrawZRC20: string;

  const PYTH_CONTRACT_ADDRESS = "0x2880aB155794e7179c9eE2e38200202908C17B43"; // Replace with your Pyth contract address
  const PRICE_FEED_ID = "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace"; // ETH/USD price feed ID
  const HERMES_ENDPOINT = `https://hermes.pyth.network/api/latest_vaas?ids[]=${PRICE_FEED_ID}`;

  const ZEVM_GATEWAY_ADDRESS = "0xfEDD7A6e3Ef1cC470fbfbF955a22D793dDC0F44E";
  const VAULT_ASSET = ZC_ETH_ETH_ADDRESS;
  const FEE_RATE = 1000;
  const ORIGIN_CHAIN_ID = 8453; // where the deposit/withdrawal originated from

  const STRATEGY_ADDRESS = "0xD8493CbAd089aDdFFB72a44850161f4DDD92f2CE";
  const STRATEGY_CHAIN_ID = 1;

  const SECOND_STRATEGY_ADDRESS = "0xFFcB9E833403c311f99d4f2E32Cdf61d4Eb0695f";

  const errorMargin = ethers.utils.parseUnits("0.00015", 18);

  async function setupGatewaySigner() {
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [ZEVM_GATEWAY_ADDRESS],
    });

    gatewaySigner = await ethers.getSigner(ZEVM_GATEWAY_ADDRESS);

    await network.provider.send("hardhat_setBalance", [
      ZEVM_GATEWAY_ADDRESS,
      ethers.utils.parseEther("10").toHexString(),
    ]);
  }

  before(async () => {
    // Use this function if you need global setup before tests
  });

  async function updatePythPrices(pythContract: any, signer: Signer): Promise<void> {

    const connection = new PriceServiceConnection("https://hermes.pyth.network", {
      priceFeedRequestConfig: {
        // Provide this option to retrieve signed price updates for on-chain contracts.
        // Ignore this option for off-chain use.
        binary: true,
      },
    }); // See Hermes endpoints section below for other endpoints

    const priceIds = [
      "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace", // ETH/USD price id
    ];

    // Fetch price updates
    const priceUpdateDataBase64 = await connection.getLatestVaas(priceIds);

    if (!priceUpdateDataBase64 || priceUpdateDataBase64.length === 0) {
      throw new Error("No price updates available from Hermes");
    }

    // Decode base64 data into binary (Buffer)
    const priceUpdateData: Uint8Array[] = priceUpdateDataBase64.map((data) =>
      Buffer.from(data, "base64")
    );

    const updateFee = await pythContract.getUpdateFee(priceUpdateData);

    const tx = await pythContract
      .connect(signer)
      .updatePriceFeeds(priceUpdateData, { value: updateFee });

    await tx.wait();
  }

  async function simulateDepositCallFromBase(
    user: Signer,
    depositAmount: BigNumber,
    pythContract: any
  ): Promise<`0x${string}`> {
    // Update Pyth prices
    await updatePythPrices(pythContract, user);

    // Set token balance for the vault
    await setTokenBalance(ZC_ETH_BASE_ADDRESS, amanaVault.address, depositAmount);

    const slippage = 200;

    // Generate a transaction ID using your generateTransactionId function
    const transactionId = generateTransactionId(await user.getAddress(), 8453);

    // Encode the deposit message
    const depositMessage = ethers.utils.defaultAbiCoder.encode(
      ["uint16", "bytes32"],
      [slippage, transactionId]
    );

    // Execute the onCall function to simulate a deposit
    await amanaVault.connect(gatewaySigner).onCall(
      {
        origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
        sender: await user.getAddress(),
        chainID: ORIGIN_CHAIN_ID,
      },
      ZC_ETH_BASE_ADDRESS,
      depositAmount,
      depositMessage
    );

    // Return the transaction ID
    return transactionId;
  }


  async function simulateConfirmDeposit(
    user: Signer,
    depositAmount: any,
    totalAssetsBefore: any,
    executionNonce: any,
    crossChainTxId: any
  ): Promise<void> {
    const depositAmountBN = BigNumber.from(depositAmount);
    const totalAssetsBeforeBN = BigNumber.from(totalAssetsBefore);

    const confirmMessage = ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "address", "uint256", "uint256", "uint32", "bool", "uint256", "uint256", "uint256", "uint256", "uint16"],
      [ethers.constants.AddressZero, await user.getAddress(), ethers.constants.AddressZero, depositAmount, 0, 0, true, totalAssetsBefore, totalAssetsBeforeBN.add(depositAmountBN), executionNonce, crossChainTxId, 0]
    );

    await amanaVault.connect(gatewaySigner).onCall(
      {
        origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
        sender: STRATEGY_ADDRESS,
        chainID: STRATEGY_CHAIN_ID,
      },
      ZC_ETH_ETH_ADDRESS,
      0,
      confirmMessage
    );
  }

  async function simulateConfirmSwitch(
    transferredAmount: any,
    executionNonce: any,
    crossChainTxId: any
  ): Promise<any> {
    const transferredAmountBN = BigNumber.from(transferredAmount);
    const totalAssetsBefore = 0;
    const totalAssetsBeforeBN = BigNumber.from(totalAssetsBefore);

    const confirmMessage = ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "address", "uint256", "uint256", "uint32", "bool", "uint256", "uint256", "uint256", "uint256", "uint16"],
      [ethers.constants.AddressZero, ethers.constants.AddressZero, ethers.constants.AddressZero, transferredAmount, 0, 0, true, 0, totalAssetsBeforeBN.add(transferredAmountBN), executionNonce, crossChainTxId, 0]
    );

    const tx = await amanaVault.connect(gatewaySigner).onCall(
      {
        origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
        sender: STRATEGY_ADDRESS,
        chainID: STRATEGY_CHAIN_ID,
      },
      ZC_ETH_ETH_ADDRESS,
      0,
      confirmMessage
    );
    return tx;
  }

  async function simulateConfirmAssetUpdate(
    totalAssetsAmount: any,
  ): Promise<any> {

    const confirmMessage = ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "address", "uint256", "uint256", "uint32", "bool", "uint256", "uint256", "uint256", "uint256", "uint16"],
      [ethers.constants.AddressZero, ethers.constants.AddressZero, ethers.constants.AddressZero, 0, 0, 0, false, 0, totalAssetsAmount, 0, 0, 0]
    );

    const tx = await amanaVault.connect(gatewaySigner).onCall(
      {
        origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
        sender: STRATEGY_ADDRESS,
        chainID: STRATEGY_CHAIN_ID,
      },
      ZC_ETH_ETH_ADDRESS,
      0,
      confirmMessage
    );
    return tx;
  }

  async function simulateWithdrawCallFromBase(
    user: Signer,
    withdrawAmount: BigNumber,
    pythContract: any
  ): Promise<void> {
    await updatePythPrices(pythContract, user);
    const slippage = 200;
    const transactionId = generateTransactionId(await user.getAddress(), 8453)

    const withdrawMessage = ethers.utils.defaultAbiCoder.encode(
      ["address", "uint256", "uint16", "bytes32"],
      [ZC_ETH_BASE_ADDRESS, withdrawAmount, slippage, transactionId]
    );

    await amanaVault.connect(gatewaySigner).onCall(
      {
        origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
        sender: await user.getAddress(),
        chainID: ORIGIN_CHAIN_ID,
      },
      ZC_ETH_BASE_ADDRESS,
      0,
      withdrawMessage
    )
  }

  async function simulateConfirmWithdraw(
    user: Signer,
    withdrawAmount: BigNumber,
    feeAmount: BigNumber,
    totalAssetsBefore: BigNumber,
    executionNonce: number,
    crossChainTxId: number
  ): Promise<any> {
    const confirmMessage = ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "address", "uint256", "uint256", "uint32", "bool", "uint256", "uint256", "uint256", "uint256", "uint16"],
      [
        await user.getAddress(),
        await user.getAddress(),
        ZC_ETH_BASE_ADDRESS,
        withdrawAmount,
        feeAmount,
        ORIGIN_CHAIN_ID,
        false,
        totalAssetsBefore,
        totalAssetsBefore.sub(withdrawAmount).sub(feeAmount),
        executionNonce,
        crossChainTxId,
        200
      ]
    );

    // Mock token balance setup for the test environment
    await setTokenBalance(ZC_ETH_ETH_ADDRESS, amanaVault.address, withdrawAmount.add(feeAmount));

    // Return the transaction object so it can be awaited or used in tests
    return await amanaVault.connect(gatewaySigner).onCall(
      {
        origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
        sender: STRATEGY_ADDRESS,
        chainID: STRATEGY_CHAIN_ID,
      },
      ZC_ETH_ETH_ADDRESS,
      withdrawAmount,
      confirmMessage
    );
  }

  async function setup() {
    await network.provider.request({
      method: "hardhat_reset",
      params: [
        {
          forking: {
            jsonRpcUrl: `https://zetachain-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
            blockNumber: 6366501,
          },
        },
      ]
    });

    [owner, user1, user2] = await ethers.getSigners();
    const pythContract = await ethers.getContractAt("contracts/interfaces/IPyth.sol:IPyth", PYTH_CONTRACT_ADDRESS, owner);

    ethBase = await ethers.getContractAt("IERC20", ZC_ETH_BASE_ADDRESS);
    ethEth = await ethers.getContractAt("IERC20", ZC_ETH_ETH_ADDRESS);
    usdcBSC = await ethers.getContractAt("IERC20", ZC_USDC_BSC_ADDRESS);

    await setupGatewaySigner();

    withdrawZRC20 = ZC_ETH_BASE_ADDRESS;

    const gatewayZEVM = await ethers.getContractAt(
      GatewayZEVMABI.abi,
      ZEVM_GATEWAY_ADDRESS
    );

    const GasTank = await ethers.getContractFactory("GasTank");
    const gasTank = await GasTank.deploy();
    await gasTank.deployed();

    const Vault = await ethers.getContractFactory("AmanaConnectedChainVault", owner);
    const vaultDeployTransaction = await upgrades.deployProxy(
      Vault,
      [
        "AaveV3EthVault",
        "AVU",
        VAULT_ASSET,
        await owner.getAddress(),
        FEE_RATE,
        gasTank.address
      ],
      { initializer: "initialize" }
    );
    amanaVault = await vaultDeployTransaction.deployed();

    // await network.provider.send("hardhat_setBalance", [
    //   amanaVault.address,
    //   ethers.utils.parseEther("1000").toHexString(),
    // ]);


    await gasTank.authorizeVault(amanaVault.address);

    await amanaVault.setStrategy(STRATEGY_ADDRESS);

    const depositAmount1 = ethers.utils.parseUnits("0.01", 18);
    const depositAmount2 = ethers.utils.parseUnits("0.005", 18);

    const rewardAmount = BigNumber.from(1000); // Example reward amount

    await setTokenBalance(ZC_ETH_ETH_ADDRESS, gasTank.address, depositAmount1.mul(20).div(1));
    await setTokenBalance(ZC_ETH_BASE_ADDRESS, gasTank.address, depositAmount1.mul(200).div(1));

    await setTokenBalance(ZC_ETH_ETH_ADDRESS, await owner.getAddress(), depositAmount1.mul(20).div(1));
    await setTokenBalance(ZC_ETH_BASE_ADDRESS, await owner.getAddress(), depositAmount1.mul(200).div(1));
    await setTokenBalance(ZC_USDC_BSC_ADDRESS, await owner.getAddress(), depositAmount1.mul(200).div(1));

    return { owner, user1, user2, pythContract, depositAmount1, depositAmount2, rewardAmount, ethBase, ethEth, usdcBSC, amanaVault, gatewayZEVM, withdrawZRC20 };
  }

  describe("Cross-Chain Deposit and Withdraw Workflow", function () {
    it("should correctly initialize the vault", async function () {
      const { amanaVault, owner } = await loadFixture(setup);

      expect(await amanaVault.name()).to.equal("AaveV3EthVault");
      expect(await amanaVault.symbol()).to.equal("AVU");
      expect(await amanaVault.asset()).to.equal(ZC_ETH_ETH_ADDRESS);
      expect(await amanaVault.owner()).to.equal(await owner.getAddress());
      expect(await amanaVault.perfFee()).to.equal(FEE_RATE);
    });

    it("should reject unauthorized access to setStrategy", async function () {
      const { user1, amanaVault } = await loadFixture(setup);

      await expect(
        amanaVault.connect(user1).setStrategy(STRATEGY_ADDRESS)
      ).to.be.revertedWithCustomError(amanaVault, "OwnableUnauthorizedAccount").withArgs(await user1.getAddress());
    });

    it("should initiate switch to a new strategy successfully", async function () {
      const { amanaVault, owner, gatewayZEVM } = await loadFixture(setup);

      const newStrategyAddress = ethers.Wallet.createRandom().address;
      const invalidStrategyAddress = ethers.constants.AddressZero;

      // Step 1: Verify ownership restriction
      await expect(
        amanaVault.connect(user1).switchStrategy(newStrategyAddress)
      ).to.be.revertedWithCustomError(amanaVault, "OwnableUnauthorizedAccount");

      // Step 2: Validate invalid inputs
      await expect(
        amanaVault.connect(owner).switchStrategy(invalidStrategyAddress)
      ).to.be.revertedWithCustomError(amanaVault, "InvalidStrategyAddress");

      const currentStrategy = await amanaVault.strategyAddress();
      await expect(
        amanaVault.connect(owner).switchStrategy(currentStrategy)
      ).to.be.revertedWithCustomError(amanaVault, "InvalidStrategyAddress");
      await expect(
        amanaVault.connect(owner).switchStrategy(newStrategyAddress)
      )
        .to.emit(gatewayZEVM, "Called");
      // .withArgs(newStrategyAddress);

      const updatedStrategy = await amanaVault.strategyAddress();

      expect(updatedStrategy).to.equal(newStrategyAddress);
    });

    it("should process a strategy switch confirmation successfully", async function () {
      const { } = await loadFixture(setup);
      const transferredAmount = ethers.utils.parseUnits("0.1", 18);
      const receipt = await simulateConfirmSwitch(transferredAmount, 1, 1);
      expect(receipt).to.emit(amanaVault, "StrategyUpdated");
    });

    it("should process a totalAssets update confirmation successfully", async function () {
      const { } = await loadFixture(setup);
      const totalAssetsAmount = ethers.utils.parseUnits("0.1", 18);
      const receipt = await simulateConfirmAssetUpdate(totalAssetsAmount);
      expect(receipt).to.emit(amanaVault, "TotalAssetsUpdated").withArgs(totalAssetsAmount);
    });

    it("should reject unauthorized access to setPerformanceFee", async function () {
      const { user1, amanaVault } = await loadFixture(setup);

      const newFeeRate = ethers.BigNumber.from(1500); // 15%
      await expect(amanaVault.connect(user1).setPerformanceFee(newFeeRate))
        .to.be.revertedWithCustomError(amanaVault, "OwnableUnauthorizedAccount").withArgs(await user1.getAddress());

    });

    it("should update performance fee correctly", async function () {
      const { amanaVault, owner } = await loadFixture(setup);

      const newFeeRate = ethers.BigNumber.from(1500); // 15%
      await amanaVault.connect(owner).setPerformanceFee(newFeeRate);

      expect(await amanaVault.perfFee()).to.equal(newFeeRate);
    });

    it("should calculate and deduct the performance fee on withdrawal", async function () {
      const { user1, depositAmount1, amanaVault, ethEth, pythContract } = await loadFixture(setup);

      // Step 1: Simulate a deposit by User1
      await setTokenBalance(ZC_ETH_BASE_ADDRESS, await user1.getAddress(), depositAmount1.mul(20).div(1));
      await ethEth.connect(user1).approve(amanaVault.address, depositAmount1);
      await simulateDepositCallFromBase(user1, depositAmount1, pythContract);

      const initialTotalAssets = depositAmount1;
      await simulateConfirmDeposit(user1, depositAmount1, 0, 1, 1);

      // Step 2: Simulate a deposit by User2
      await setTokenBalance(ZC_ETH_BASE_ADDRESS, await user2.getAddress(), depositAmount1.mul(20).div(1));
      await ethEth.connect(user2).approve(amanaVault.address, depositAmount1);
      await simulateDepositCallFromBase(user2, depositAmount1, pythContract);
      const profit = depositAmount1.div(10); // 10% profit

      // The confirmation from the second deposit shows that user1 has made a profit already
      await simulateConfirmDeposit(user2, depositAmount1, depositAmount1.add(profit), 2, 2);

      const updatedTotalAssets = initialTotalAssets.add(depositAmount1).add(profit);

      // Step 3: Perform a withdrawal and calculate the fee
      const expectedFee = profit.mul(FEE_RATE).div(10000);
      const withdrawAmount = depositAmount1.div(2); // Withdraw everything except the fee

      await simulateWithdrawCallFromBase(user1, withdrawAmount, pythContract);

      await expect(simulateConfirmWithdraw(user1, withdrawAmount, expectedFee, updatedTotalAssets, 3, 3))
        .to.emit(amanaVault, "PerformanceFeePaid")
        .withArgs(await user1.getAddress(), expectedFee);
    });

    it("should handle emergency withdrawal by the owner", async function () {
      const { amanaVault, owner, ethBase } = await loadFixture(setup);

      const depositAmount = ethers.utils.parseUnits("0.1", 18);
      await ethBase.transfer(amanaVault.address, depositAmount);

      const balanceBefore = await ethBase.balanceOf(await owner.getAddress());
      await amanaVault.connect(owner).emergencyWithdraw(ZC_ETH_BASE_ADDRESS);

      const balanceAfter = await ethBase.balanceOf(await owner.getAddress());
      expect(balanceAfter.sub(balanceBefore)).to.equal(depositAmount);
    });

    it("should reject unauthorized emergency withdrawal", async function () {
      const { amanaVault, user1, ethBase } = await loadFixture(setup);

      const depositAmount = ethers.utils.parseUnits("0.1", 18);
      await ethBase.transfer(amanaVault.address, depositAmount);

      await expect(
        amanaVault.connect(user1).emergencyWithdraw(ZC_ETH_BASE_ADDRESS)
      ).to.be.revertedWithCustomError(amanaVault, "OwnableUnauthorizedAccount").withArgs(await user1.getAddress());
    });

    it("should correctly handle _crossChainInvest revert during cross-chain deposits", async function () {
      const { user1, amanaVault, pythContract } = await loadFixture(setup);
      const depositAmount = ethers.utils.parseUnits("0.1", 18);

      const txId = await simulateDepositCallFromBase(
        user1,
        depositAmount,
        pythContract
      )

      // Simulate _crossChainInvest reverting
      const mockRevertMessage = ethers.utils.defaultAbiCoder.encode(
        ["string", "bytes32", "address", "address", "uint32"],
        ["_crossChainInvestFailed", txId, await user1.getAddress(), ZC_ETH_BASE_ADDRESS, 84532]
      );

      // the revert will send back some ETH_SEPOLIA
      await setTokenBalance(ZC_ETH_ETH_ADDRESS, amanaVault.address, depositAmount.mul(95).div(100));

      await expect(
        amanaVault.onRevert({
          sender: STRATEGY_ADDRESS,
          asset: VAULT_ASSET,
          revertMessage: mockRevertMessage,
          amount: 100000000n,
        })
      ).to.emit(amanaVault, "CrossChainInvestFailed").withArgs(txId);
    });

    it("should reject unauthorized treasury updates", async function () {
      const { amanaVault, user1 } = await loadFixture(setup);

      const newTreasuryAddress = ethers.Wallet.createRandom().address;
      await expect(
        amanaVault.connect(user1).updateTreasuryAddress(newTreasuryAddress)
      ).to.be.revertedWithCustomError(amanaVault, "OwnableUnauthorizedAccount").withArgs(await user1.getAddress());
    });

    it("should withdraw the maximum amount possible for a user", async function () {
      const { user1, depositAmount1, amanaVault, pythContract } = await loadFixture(setup);

      await simulateDepositCallFromBase(
        user1,
        depositAmount1,
        pythContract
      )
      await simulateConfirmDeposit(user1, depositAmount1, 0, 1, 1)

      // Withdraw the maximum amount
      const maxWithdrawAmount = await amanaVault.maxWithdraw(await user1.getAddress());
      await simulateWithdrawCallFromBase(user1, maxWithdrawAmount, pythContract)

      await expect(simulateConfirmWithdraw(user1, maxWithdrawAmount, BigNumber.from("0"), depositAmount1, 2, 2))
        .to.emit(amanaVault, "ReturnFundsToUserSent")
        .to.emit(amanaVault, "Withdrawn");
    });

    it("should fail to withdraw more than the user balance", async function () {
      const { user1, depositAmount1, amanaVault, pythContract } = await loadFixture(setup);

      await simulateDepositCallFromBase(
        user1,
        depositAmount1, pythContract
      )
      simulateConfirmDeposit(user1, depositAmount1, 0, 1, 1);

      // Attempt to withdraw more than balance
      const excessiveWithdrawAmount = depositAmount1.mul(2); // Double the deposited amount

      await expect(simulateWithdrawCallFromBase(user1, excessiveWithdrawAmount, pythContract))
        .to.be.revertedWithCustomError(amanaVault, "ERC4626ExceededMaxWithdraw");
    });

    it("should update user shares correctly after multiple deposits and withdrawals", async function () {
      const { user1, user2, depositAmount1, depositAmount2, amanaVault } = await loadFixture(setup);
      await setTokenBalance(ZC_ETH_ETH_ADDRESS, amanaVault.address, 0);

      await setTokenBalance(ZC_ETH_ETH_ADDRESS, await user1.getAddress(), depositAmount1);

      await ethEth.connect(user1).approve(amanaVault.address, depositAmount1);
      await amanaVault.connect(user1).deposit(depositAmount1, await user1.getAddress());

      await simulateConfirmDeposit(user1, depositAmount1, 0, 1, 1);

      await setTokenBalance(ZC_ETH_ETH_ADDRESS, await user2.getAddress(), depositAmount2);

      await ethEth.connect(user2).approve(amanaVault.address, depositAmount2);
      await amanaVault.connect(user2).deposit(depositAmount2, await user2.getAddress());

      const totalDeposits = depositAmount1.add(depositAmount2);
      await simulateConfirmDeposit(user2, depositAmount2, depositAmount1, 2, 2);

      // User1 withdraws part of their deposit
      const withdrawAmount1 = depositAmount1.div(2);
      await amanaVault.connect(user1).withdraw
        (withdrawAmount1, await user1.getAddress(), await user1.getAddress());

      await simulateConfirmWithdraw(user1, withdrawAmount1, BigNumber.from("0"), totalDeposits, 3, 3);

      // Validate the remaining shares for User1
      const remainingShares = await amanaVault.balanceOf(await user1.getAddress());
      const expectedShares = depositAmount1.sub(withdrawAmount1);
      expect(remainingShares).to.be.closeTo(expectedShares, errorMargin);
    });

    it("should handle multiple withdrawals up to the total amount based on user balance", async function () {
      const { user1, depositAmount1, amanaVault } = await loadFixture(setup);

      // Step 1: Deposit into the vault
      await setTokenBalance(ZC_ETH_ETH_ADDRESS, await user1.getAddress(), depositAmount1);
      await ethEth.connect(user1).approve(amanaVault.address, depositAmount1);
      await amanaVault.connect(user1).deposit(depositAmount1, await user1.getAddress());

      await simulateConfirmDeposit(user1, depositAmount1, 0, 1, 1);

      const initialShares = await amanaVault.balanceOf(await user1.getAddress());
      const initialAssets = await amanaVault.convertToAssets(initialShares);
      expect(initialAssets).to.be.closeTo(depositAmount1, errorMargin);

      // Step 2: Perform multiple withdrawals
      const withdrawAmounts = [
        initialAssets.div(3), // Withdraw 1/3 of the total balance
        initialAssets.div(3), // Withdraw another 1/3
        initialAssets.sub(initialAssets.div(3).mul(2)), // Withdraw the remaining balance
      ];

      let totalAssetsBefore = depositAmount1;
      let executionNonce = 2;
      let crossChainTxId = 2;
      for (const withdrawAmount of withdrawAmounts) {
        // Perform withdrawal
        await amanaVault.connect(user1).withdraw(
          withdrawAmount,
          await user1.getAddress(),
          await user1.getAddress()
        );

        await simulateConfirmWithdraw(user1, withdrawAmount, BigNumber.from("0"), totalAssetsBefore, executionNonce, crossChainTxId);

        totalAssetsBefore = totalAssetsBefore.sub(withdrawAmount);
        executionNonce++;
        crossChainTxId++;
      }

      // Step 3: Validate final state
      const finalShares = await amanaVault.balanceOf(await user1.getAddress());
      const finalAssets = await amanaVault.totalAssets();

      expect(finalShares).to.equal(0); // User should have no shares left
      expect(finalAssets).to.equal(1); // Vault should only have 1 virtual share left

      // Step 4: Ensure further withdrawals fail
      await expect(
        amanaVault.connect(user1).withdraw(1, await user1.getAddress(), await user1.getAddress())
      ).to.be.revertedWithCustomError(amanaVault, "ERC4626ExceededMaxWithdraw");
    });

    it("should handle zero balances without errors", async function () {
      const { user1, ethBase, amanaVault } = await loadFixture(setup);

      // Simulate a withdrawal for a user with zero balance
      const zeroAmount = BigNumber.from(0);
      await expect(amanaVault.connect(user1).withdraw(zeroAmount, await user1.getAddress(), await user1.getAddress())).to.be
        .revertedWithCustomError(amanaVault, "WithdrawCantBeZero");

      // Deposit and then withdraw entire balance
      await ethBase.connect(user1).approve(amanaVault.address, zeroAmount);
      await expect(amanaVault.connect(user1).deposit(zeroAmount, await user1.getAddress()))
        .to.be.revertedWithCustomError(amanaVault, "DepositCantBeZero");
    });

    it("should distribute and claim rewards (time-based)", async function () {
      const { user1, depositAmount1, usdcBSC, amanaVault, owner, pythContract } = await loadFixture(setup);

      // Get the current block timestamp to calculate the reward period
      const currentBlock = await ethers.provider.getBlock("latest");
      const currentTimestamp = currentBlock.timestamp;

      const startTimestamp = currentTimestamp + 600; // Start rewards 600 seconds (10 minutes) later
      const rewardDuration = 3600; // Reward duration: 1 hour (3600 seconds)
      const endTimestamp = startTimestamp + rewardDuration; // End rewards after 1 hour

      const rewardAmount = ethers.utils.parseUnits("1000", 18); // Total rewards to be distributed over the duration

      // Set reward token, reward interval, and reward amount
      await amanaVault.connect(owner).setRewardToken(usdcBSC.address); // Set USDC as the reward token for testing
      await amanaVault.connect(owner).setRewardsInterval(startTimestamp, endTimestamp, rewardAmount);

      // Simulate deposit for User1
      await simulateDepositCallFromBase(user1, depositAmount1, pythContract);

      // Confirm the deposit for User1
      await simulateConfirmDeposit(user1, depositAmount1, 0, 1, 1);

      // Simulate time passing during the reward period
      const halfwayTime = startTimestamp + rewardDuration / 2;
      const secondsToSimulate = halfwayTime - currentTimestamp;
      await ethers.provider.send("evm_increaseTime", [secondsToSimulate]); // Increase time by half of the reward duration
      await ethers.provider.send("evm_mine", []); // Trigger a block to update the blockchain timestamp

      const newBlock = await ethers.provider.getBlock("latest");
      const newTimestamp = newBlock.timestamp;

      // Calculate expected rewards halfway through the campaign
      const expectedRewardPerSecond = rewardAmount.div(BigNumber.from(rewardDuration)); // Reward per second
      const timeElapsed = BigNumber.from(newTimestamp - startTimestamp);
      const expectedReward = expectedRewardPerSecond.mul(timeElapsed);

      await setTokenBalance(ZC_USDC_BSC_ADDRESS, amanaVault.address, rewardAmount); // Set the reward amount

      // User1 should now have accumulated rewards halfway through the campaign
      await amanaVault.connect(user1).claimRewards(await user1.getAddress()); // Claim the rewards

      // Check the rewards balance for User1
      const userRewardBalance = await usdcBSC.balanceOf(await user1.getAddress());
      expect(userRewardBalance).to.be.closeTo(expectedReward, ethers.utils.parseUnits("1", 18)); // Allow a small margin for rounding
    });

    it("should correctly distribute rewards proportional to user shares using precise timestamps", async function () {
      const { user1, user2, depositAmount1, depositAmount2, usdcBSC, amanaVault, owner, pythContract } = await loadFixture(setup);

      const rewardAmount = ethers.utils.parseUnits("1000", 18);
      const rewardDuration = 3600; // 1 hour in seconds

      // Set the start and end timestamps explicitly
      const currentTimestamp = (await ethers.provider.getBlock("latest")).timestamp;
      const startTimestamp = currentTimestamp + 600; // Start rewards 600 seconds later
      const endTimestamp = startTimestamp + rewardDuration;

      // Set rewards interval
      await amanaVault.connect(owner).setRewardToken(usdcBSC.address);
      await amanaVault.connect(owner).setRewardsInterval(startTimestamp, endTimestamp, rewardAmount);

      // Set reward token balance
      await setTokenBalance(ZC_USDC_BSC_ADDRESS, amanaVault.address, rewardAmount);

      // Simulate deposits
      await simulateDepositCallFromBase(user1, depositAmount1, pythContract);
      await simulateConfirmDeposit(user1, depositAmount1, 0, 1, 1);

      await simulateDepositCallFromBase(user2, depositAmount2, pythContract);
      await simulateConfirmDeposit(user2, depositAmount2, depositAmount1, 2, 2);

      // Move to halfway through the rewards duration
      const halfwayTimestamp = startTimestamp + rewardDuration / 2;
      await ethers.provider.send("evm_setNextBlockTimestamp", [halfwayTimestamp]);
      await ethers.provider.send("evm_mine", []); // Mine a block to apply the new timestamp

      // Calculate expected rewards
      const totalSupply = await amanaVault.totalSupply();
      const elapsedRewardAmount = rewardAmount.mul(halfwayTimestamp - startTimestamp).div(rewardDuration);

      const user1Shares = await amanaVault.balanceOf(await user1.getAddress());
      const user2Shares = await amanaVault.balanceOf(await user2.getAddress());
      const user1ExpectedRewards = user1Shares.mul(elapsedRewardAmount).div(totalSupply);
      const user2ExpectedRewards = user2Shares.mul(elapsedRewardAmount).div(totalSupply);

      // Users claim rewards
      await amanaVault.connect(user1).claimRewards(await user1.getAddress());
      const user1Reward = await usdcBSC.balanceOf(await user1.getAddress());

      await amanaVault.connect(user2).claimRewards(await user2.getAddress());
      const user2Reward = await usdcBSC.balanceOf(await user2.getAddress());

      // Validate the rewards
      expect(user1Reward).to.be.closeTo(user1ExpectedRewards, ethers.utils.parseUnits("1", 18));
      expect(user2Reward).to.be.closeTo(user2ExpectedRewards, ethers.utils.parseUnits("1", 18));
    });


  });
});

