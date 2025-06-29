import LeftArrowIcon from "@/components/svg/LeftArrowIcon";
import classNames from "classnames";

type ModalButtonProps = {
  onClick?: () => void;
  label: string;
  text?: string;
  icon: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  withArrow?: boolean;
  variant?: "options" | "allWallets";
};

const ModalButton = ({
  onClick,
  label = "Smart Wallet",
  icon,
  text,
  children,
  className,
  withArrow = false,
  variant = "options",
}: ModalButtonProps) => {
  const isOptionsVariant = variant === "options";
  const isAllWalletsVariant = variant === "allWallets";

  return (
    <button
      onClick={onClick}
      className={classNames(
        "flex items-center justify-between gap-4 border border-[#3E73C4] bg-[#161C27]",
        "rounded-[8px] text-white text-[16px] font-bold hover:bg-[#3E73C4]/10 transition",
        {
          "py-[10px] px-4 w-[275px] h-[60px]": isOptionsVariant,
          "pl-4 pr-[25px] py-4 w-[240px] h-[64px] md:h-[80px]":
            isAllWalletsVariant,
        },
        className,
      )}
    >
      <div className="flex w-full flex-row items-center justify-start gap-2 md:gap-4">
        <div
          className={classNames(
            "flex justify-center items-center rounded-[8px] bg-[#14171F] border border-[#3E73C4] shrink-0 p-1",
            {
              "h-[40px] w-[40px]": isOptionsVariant,
              "h-[40px] w-[40px] md:h-[48px] md:w-[48px]": isAllWalletsVariant,
            },
          )}
        >
          {icon}
        </div>

        <div
          className={classNames("flex flex-col justify-between w-full", {
            "!justify-center": !text,
            "h-[40px]": isOptionsVariant,
            "h-[48px]": isAllWalletsVariant,
          })}
        >
          <span
            className="text-[16px] font-normal md:text-[18px] md:font-bold leading-5 text-left flex-wrap"
            style={{ letterSpacing: "-0.06em" }}
          >
            {label}
          </span>
          <span
            className="text-[14px] text-left text-[#535E73] font-normal leading-4"
            style={{ letterSpacing: "-0.06em" }}
          >
            {text}
          </span>
        </div>

        {isOptionsVariant && children && (
          <div className="flex flex-row items-center">{children}</div>
        )}
      </div>

      {withArrow && (
        <div className="w-6 rotate-180">
          <LeftArrowIcon color="#9A9CB3" strokeWidth={2} />
        </div>
      )}
    </button>
  );
};

export default ModalButton;
