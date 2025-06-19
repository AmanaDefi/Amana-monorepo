import LeftArrowIcon from "@/components/svg/LeftArrowIcon";
import classNames from "classnames";

type ModalButtonProps = {
  onClick?: () => void;
  label: string;
  text?: string;
  icon: React.ReactNode;
  className?: string;
  withArrow?: boolean;
};

const ModalButton = ({
  onClick,
  label = "Smart Wallet",
  icon,
  text,
  className,
  withArrow = false,
}: ModalButtonProps) => (
  <button
    onClick={onClick}
    className={`flex items-center justify-between gap-4 border border-[#3E73C4] bg-[#161C27] 
               rounded-[8px] pl-4 pr-[25px] py-4 text-white text-[16px] 
               font-bold hover:bg-[#3E73C4]/10 transition w-[240px] h-[64px] md:h-[80px] ${className}`}
  >
    <div className="flex w-full flex-row items-center justify-start gap-4">
      <div className="flex justify-center items-center rounded-[8px] bg-[#14171F] border border-[#3E73C4] shrink-0 p-1 h-[40px] w-[40px] md:h-[48px] md:w-[48px]">
        {icon}
      </div>
      <div
        className={classNames("flex flex-col justify-between h-[48px] w-full", {
          "!justify-center": !text,
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
    </div>
    {withArrow ? (
      <div className="w-6 rotate-180">
        <LeftArrowIcon color="#9A9CB3" strokeWidth={2} />
      </div>
    ) : null}
  </button>
);

export default ModalButton;
