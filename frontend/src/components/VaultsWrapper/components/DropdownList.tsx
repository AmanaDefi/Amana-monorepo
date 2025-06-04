import { CheckBox } from "@/components/CheckBox";
import CloseIcon from "@/components/svg/CloseIcon";

export const DropdownList = ({
  width,
  isIconButton,
  handleToggleDropdown,
  options,
  selectedOption,
  handleSelectedOption,
}: {
  width: number;
  isIconButton: boolean;
  handleToggleDropdown: () => void;
  options: string[];
  selectedOption: string;
  handleSelectedOption: (
    event:
      | React.MouseEvent<HTMLParagraphElement, MouseEvent>
      | React.MouseEvent<HTMLButtonElement, MouseEvent>,
    option: string,
  ) => void;
}) => {
  return (
    <div
      style={{ width, top: isIconButton ? 30 : 40 }}
      className="z-10 rounded-2xl p-5 absolute -right-5 top-14 flex flex-col items-center gap-3 bg-[#161C27] border border-[#3E3C59]"
      role="menu"
    >
      <button
        type="button"
        onClick={handleToggleDropdown}
        className="pt-3 pb-1 flex w-full justify-end"
      >
        <CloseIcon />
      </button>
      {isIconButton && (
        <div className="flex w-full justify-start">
          <p className="text-sm leading-4 text-[#535E73] font-normal">Filters</p>
        </div>
      )}
      {options.map((option) => (
        <div
          className="group hover:cursor-pointer flex py-3 w-full flex-row justify-between items-center"
          key={option}
          onClick={(event) => handleSelectedOption(event, option)}
        >
          <p className="group-hover:underline">{option}</p>
          <CheckBox isSelected={option === selectedOption} />
        </div>
      ))}

      <button
        type="button"
        onClick={(event) => handleSelectedOption(event, "")}
        className="underline font-normal text-sm leading-4 text-[#535E73] hover:text-white active:scale-90"
      >
        Reset to default
      </button>
    </div>
  );
};
