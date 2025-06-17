import { CheckBox } from "@/components/CheckBox";
import Image from "next/image";

export const DropdownList = ({
  width,
  isIconButton,
  options,
  selectedOption,
  handleSelectedOption,
  isShownList,
  needReset = true,
  variant = "chain", 
}: {
  width: number;
  isIconButton: boolean;
  options: { value: string; icon?: string }[];
  selectedOption: string;
  handleSelectedOption: (
    event:
      | React.MouseEvent<HTMLParagraphElement, MouseEvent>
      | React.MouseEvent<HTMLButtonElement, MouseEvent>,
    option: string,
  ) => void;
  isShownList: boolean;
  needReset?: boolean;
  variant?: "chain" | "token";
}) => {
  const isToken = variant === "token";

  return (
    <div
      style={{
        width,
        top: isToken ? 50 : !needReset ? 65 : isIconButton ? 30 : 40,
        maxHeight: isShownList ? "600px" : "0px",
        padding: isShownList ? "16px" : "0px",
        border: isShownList ? "1px" : "0px",
      }}
      className={`z-10 rounded-2xl absolute -right-3 flex flex-col items-center gap-3 transition-all duration-500 ease-in-out overflow-hidden
        ${isShownList ? "bg-[#161C27] border border-[#3E3C59]" : ""}
        ${isToken ? "rounded-[16px] bg-[#1D2A41] p-4" : ""}`}
      role="menu"
    >
      {isIconButton && (
        <div className="flex w-full justify-start">
          <p className="text-sm leading-4 text-[#535E73] font-normal">
            Filters
          </p>
        </div>
      )}

      {options.map((option) => (
        <div
          key={option.value}
          className={`group hover:cursor-pointer flex py-[6px] w-full flex-row justify-between items-center ${
            isToken ? "gap-2" : ""
          }`}
          onClick={(event) => handleSelectedOption(event, option.value)}
        >
          <div className="flex flex-row gap-2 items-center">
            {option.icon && (
              <div className="rounded-full relative border border-white bg-white items-center justify-center">
                <Image
                  src={option.icon}
                  alt={option.value}
                  width={20}
                  height={20}
                  className="rounded-full"
                  sizes="20px"
                />
              </div>
            )}
            <p
              className={`group-hover:text-blue-button ${
                isToken
                  ? "text-white text-[16px] font-normal"
                  : "text-white text-sm"
              }`}
            >
              {option.value}
            </p>
          </div>
          <CheckBox isSelected={option.value === selectedOption} />
        </div>
      ))}

      {needReset && (
        <button
          type="button"
          onClick={(event) => handleSelectedOption(event, "")}
          className={`underline font-normal text-sm leading-4 active:scale-90 ${
            isToken
              ? "text-white hover:text-gray-300"
              : "text-[#535E73] hover:text-blue-button"
          }`}
        >
          Reset to default
        </button>
      )}
    </div>
  );
};
