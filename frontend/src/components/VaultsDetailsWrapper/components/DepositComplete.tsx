import ArrowRightIcon from "@/components/svg/ArrowRightIcon";
import { EarnIcon } from "@/components/svg/sidebar/EarnIcon";
import Button from "@/components/Button";
import DiscordLogo from "@public/logo/discord.svg";
import { VaultData, Token, Balance } from "@/types/types";
import Image from "next/image";
import USDCImage from "@/USDC.png"

interface DepositCompleteProps {
  vaultData: VaultData;
  selectedToken?: Token;
  userVaultBalance?: Balance;
  onClose: () => void;
}

const DepositComplete = ({
  vaultData,
  selectedToken,
  userVaultBalance,
  onClose,
}: DepositCompleteProps) => {

    const inputTokenSymbol =
      selectedToken?.symbol || vaultData.inputToken.symbol;
    const outputTokenSymbol = vaultData.symbol;
    const depositAmount = userVaultBalance?.formatted || "1,000";

  return (
    <div className="flex flex-col gap-6 font-gotham">
      <div className="rounded-[16px] before-gradient-border px-4 py-8 bg-[#14171F]">
        <div className="flex flex-col mb-10">
          <p className="text-[24px] font-medium mb-1">Deposit complete</p>
          <p className="text-[#4874db] text-[16px] font-normal leading-[1.75] max-w-[440px]">
            Your deposit and the underlying transaction has been completed
            successfully. You can see your position in Your Earnings now.
          </p>
        </div>

        <div className="bg-[#161C27] border border-[#3E73C4] py-8 px-4 rounded-lg flex justify-between w-full">
          <div className="flex flex-row gap-2">
            <div className="relative w-[62px] h-[62px] flex items-center justify-center overflow-hidden">
              {selectedToken?.imgURL ? (
                <>
                  <div className="absolute top-0 left-0">
                    <img
                      src={selectedToken.imgURL}
                      alt={selectedToken.symbol}
                      className="w-10 h-10 object-cover"
                    />
                  </div>
                  <div className="absolute bottom-0 right-0">
                    <img
                      src="/USDC.png"
                      alt="USDC"
                      className="w-10 h-10 object-cover"
                    />
                  </div>
                </>
              ) : (
                <span className="text-white font-bold text-lg">
                  {inputTokenSymbol.slice(0, 2)}
                </span>
              )}
            </div>
            <div className="flex flex-col font-bold text-sm justify-between">
              Deposited:
              <div className="font-normal flex flex-row gap-1 items-center">
                <p>{inputTokenSymbol}</p>
                <ArrowRightIcon width={12} height={10} />
                <p>{outputTokenSymbol}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end justify-between">
            <p className="text-white-400 font-medium">
              -{depositAmount} {inputTokenSymbol}
            </p>
            <p className="text-white-400 font-medium">
              +{depositAmount} {outputTokenSymbol}
            </p>
          </div>
        </div>
      </div>
      <div className="flex flex-row gap-[47px] ">
        <div className="py-[21px] px-[20px] shadow-xl font-gotham before-gradient-border bg-[#14171F] max-h-[222px] min-w-[240px]">
          <div className="flex flex-row gap-4 text-lg font-bold items-center">
            <EarnIcon width={34} height={32} />
            <p>Deposit More</p>
          </div>
          <p className="text-[16px] font-normal mt-[15px] max-w-[200px]">
            Reinvest in this vault or explore others.
          </p>
          <Button
            onClick={onClose}
            variant="custom"
            className="!w-full !max-h-10 !mt-10"
          >
            Explore
          </Button>
        </div>
        <div className="py-[23px] px-[15px] shadow-xl font-gotham before-gradient-border bg-[#14171F] max-h-[222px] min-w-[240px]">
          <div className="flex flex-row gap-4 text-lg font-bold items-center">
            <DiscordLogo height={34} className="w-[34px] h-[34px]" />
            <p>Socials</p>
          </div>
          <p className="text-[16px] font-normal mt-[13px] max-w-[210px]">
            Subscribe for our social media.
          </p>
          <Button variant="custom" className="!w-full !max-h-10 !mt-10">
            Check
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DepositComplete;
