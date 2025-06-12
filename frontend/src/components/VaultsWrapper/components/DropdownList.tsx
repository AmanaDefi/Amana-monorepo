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
}) => {
  return (
    <div
      style={{
        width,
        top: !needReset ? 65 : isIconButton ? 30 : 40,
        maxHeight: isShownList ? "600px" : "0px",
        padding: isShownList ? "20px" : "0px",
        border: isShownList ? "1px" : "0px",
      }}
      className="z-10 rounded-2xl absolute -right-5 top-14 flex flex-col items-center gap-3 bg-[#161C27] border border-[#3E3C59] transition-all duration-500 ease-in-out overflow-hidden"
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
          className="group hover:cursor-pointer flex py-3 w-full flex-row justify-between items-center"
          onClick={(event) => handleSelectedOption(event, option.value)}
        >
          <div className="flex flex-row gap-2 items-center">
            <p className="group-hover:text-blue-button">{option.value}</p>
            {option.icon && (
              <Image
                src={option.icon || ""}
                alt={option.value}
                width={20}
                height={20}
                className="rounded-full"
                sizes="20px"
              />
            )}
          </div>
          <CheckBox isSelected={option.value === selectedOption} />
        </div>
      ))}

      {needReset && (
        <button
          type="button"
          onClick={(event) => handleSelectedOption(event, "")}
          className="underline font-normal text-sm leading-4 text-[#535E73] hover:text-blue-button active:scale-90"
        >
          Reset to default
        </button>
      )}
    </div>
  );
};
