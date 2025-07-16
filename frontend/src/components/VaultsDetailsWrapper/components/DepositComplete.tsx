import ArrowRightIcon from "@/components/svg/ArrowRightIcon";
import { EarnIcon } from "@/components/svg/sidebar/EarnIcon";
import Button from "@/components/common/Button";
import DiscordLogo from "@public/logo/discord.svg";
import { VaultData, Token, Balance } from "@/types/types";
import { useRouter } from "next/navigation";
import { useTransactionStore } from "@/store/transactionStore";
import { hasNoErrors } from "@/utils/utils";

interface DepositCompleteProps {
  vaultData: VaultData;
  selectedToken?: Token;
  userVaultBalance?: Balance;
  onClose: () => void;
  depositedInputAmount: string;
  depositedOutputAmount: string;
  depositedInputSymbol: string;
  depositedOutputSymbol: string;
  isDeposit: boolean;
  isFailedOnConfirmation: boolean;
}

const DepositComplete = ({
  vaultData,
  selectedToken,
  onClose,
  depositedInputAmount,
  depositedOutputAmount,
  depositedInputSymbol,
  depositedOutputSymbol,
  isDeposit,
  isFailedOnConfirmation,
}: DepositCompleteProps) => {
  const router = useRouter();
  const inputTokenSymbol = depositedInputSymbol;
  const outputTokenSymbol = depositedOutputSymbol;
  const { lastTransactionStepFeedback } = useTransactionStore();

  const isSuccess = hasNoErrors(lastTransactionStepFeedback);

  const handleExploreClick = () => {
    onClose();
    router.push("/");
  };

  const getTitleSuccess = () =>
    isDeposit ? "Deposit complete" : "Withdrawal complete";

  const getTitleFailed = () =>
    isDeposit ? "Deposit failed" : "Withdrawal failed";
  const getTitle = () => (isSuccess ? getTitleSuccess() : getTitleFailed());

  const getDescriptionSuccess = () =>
    isDeposit
      ? "Your deposit has been completed successfully. You can see your position in Your Earnings now."
      : "Your withdrawal has been completed successfully. The funds have been transferred to your wallet.";

  const getDescriptionFail = () =>
    isDeposit
      ? "Your deposit has been failed."
      : "Your withdrawal has been failed.";

  const getDescription = () =>
    isSuccess ? getDescriptionSuccess() : getDescriptionFail();

  const getTransactionLabel = () =>
    !isSuccess ? "Failed:" : isDeposit ? "Deposited:" : "Withdrawn:";

  const getFirstCardContent = () => {
    if (isDeposit) {
      return {
        title: "Deposit More",
        description: "Reinvest in this vault or explore others.",
        buttonText: "Explore",
      };
    } else {
      return {
        title: "Deposit Again",
        description: "Invest in this vault or explore others.",
        buttonText: "Explore",
      };
    }
  };

  console.log(depositedInputAmount);

  const firstCardContent = getFirstCardContent();

  return (
    <div className="flex flex-col gap-6 font-gotham">
      <div className="rounded-[16px] before-gradient-border px-4 py-8 bg-[#14171F]">
        <div className="flex flex-col mb-10">
          <p className="text-lg md:text-[24px] font-medium mb-1">
            {getTitle()}
          </p>
          <p className="text-[#4874db] text-sm md:text-[16px] font-normal leading-[1.75] max-w-[500px] md:max-w-[440px]">
            {getDescription()}
          </p>
        </div>

        <div className="bg-[#161C27] border border-[#3E73C4] py-6 md:py-8 px-4 md:px-4 rounded-lg flex justify-between w-full">
          <div className="flex flex-row gap-2">
            <div className="relative w-[46px] md:w-[62px] h-[46px] md:h-[62px] flex items-center justify-center overflow-hidden">
              {selectedToken?.imgURL || vaultData.inputToken.imgURL ? (
                <>
                  <div className="absolute top-0 left-0">
                    <img
                      src={
                        isDeposit
                          ? selectedToken?.imgURL || "/USDC.png"
                          : vaultData.inputToken.imgURL || "/USDC.png"
                      }
                      alt={isDeposit ? inputTokenSymbol : outputTokenSymbol}
                      className="w-[30px] h-[30px] md:w-10 md:h-10 object-cover"
                    />
                  </div>
                  <div className="absolute bottom-0 right-0">
                    <img
                      src={
                        isDeposit
                          ? vaultData.inputToken.imgURL || "/USDC.png"
                          : selectedToken?.imgURL || "/USDC.png"
                      }
                      alt={isDeposit ? outputTokenSymbol : inputTokenSymbol}
                      className="w-[30px] h-[30px] md:w-10 md:h-10 object-cover"
                    />
                  </div>
                </>
              ) : (
                <span className="text-white font-bold text-lg">
                  {isDeposit
                    ? inputTokenSymbol.slice(0, 2)
                    : outputTokenSymbol.slice(0, 2)}
                </span>
              )}
            </div>
            <div className="flex flex-col font-bold text-sm justify-between">
              {getTransactionLabel()}
              <div className="font-normal flex flex-row gap-1 items-center text-xs md:text-sm flex-wrap">
                <p>{isDeposit ? inputTokenSymbol : outputTokenSymbol}</p>
                <ArrowRightIcon width={12} height={10} />
                <p>{isDeposit ? outputTokenSymbol : inputTokenSymbol}</p>
              </div>
            </div>
          </div>
          {isSuccess && (
            <div className="flex flex-col items-end justify-between text-xs md:text-base font-regular md:font-medium">
              {isDeposit ? (
                <>
                  <p className="text-white-400">
                    -{depositedInputAmount} {inputTokenSymbol}
                  </p>
                  <p className="text-white-400">
                    +{depositedOutputAmount} {outputTokenSymbol}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-white-400">
                    -{depositedOutputAmount} {outputTokenSymbol}
                  </p>
                  <p className="text-white-400">
                    +{depositedInputAmount} {inputTokenSymbol}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-row gap-2 md:gap-[47px]">
        <div className="py-4 md:py-[21px] px-4 md:px-[20px] shadow-xl font-gotham before-gradient-border bg-[#14171F] min-h-[171px] md:min-h-[222px] w-full  md:max-w-[240px] xl:min-w-[240px] rounded-[16px] flex flex-col justify-between">
          <div>
            <div className="flex flex-row gap-4 text-sm md:text-lg font-bold items-center">
              <EarnIcon
                width={34}
                height={32}
                className="w-5 h-5 md:w-[34px] md:h-[32px]"
              />
              <p>{firstCardContent.title}</p>
            </div>
            <p className="text-xs md:text-[16px] font-normal mt-[15px] max-w-[131px] md:max-w-[200px]">
              {firstCardContent.description}
            </p>
          </div>

          <Button
            onClick={handleExploreClick}
            variant="custom"
            className="!w-full !h-8 md:!h-10"
          >
            {firstCardContent.buttonText}
          </Button>
        </div>
        <div className="py-4 md:py-[23px] px-4 md:px-[15px] shadow-xl font-gotham before-gradient-border bg-[#14171F] min-h-[171px] md:min-h-[222px] w-full md:max-w-[240px] xl:min-w-[240px] rounded-[16px] flex flex-col justify-between">
          <div>
            <div className="flex flex-row gap-4 text-sm md:text-lg font-bold items-center">
              <DiscordLogo
                height={34}
                className="w-5 h-5 md:w-[34px] md:h-[34px]"
              />
              <p>Socials</p>
            </div>
            <p className="text-xs md:text-[16px] font-normal mt-[15px] md:mt-[13px] max-w-[131px] md:max-w-[210px]">
              Subscribe to our socials.
            </p>
          </div>

          <Button variant="custom" className="!w-full !h-8 md:!h-10">
            Check
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DepositComplete;
