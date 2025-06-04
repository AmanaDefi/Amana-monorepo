import { CheckBox } from "@/components/CheckBox";
import CloseIcon from "@/components/svg/CloseIcon";

export const DropdownList = ({
  width,
  handleToggleDropdown,
  options,
  selectedOption,
  handleSelectedOption,
}: {
  width: number;
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
      style={{ width }}
      className="rounded-2xl p-5 absolute -right-5 top-14 flex flex-col items-center gap-3 bg-[#161C27] border border-[#3E3C59]"
      role="menu"
    >
      <button
        type="button"
        onClick={handleToggleDropdown}
        className="pt-3 pb-1 flex w-full justify-end"
      >
        <CloseIcon />
      </button>
      {options.map((option) => (
        <div
          className="hover:cursor-pointer flex py-3 w-full flex-row justify-between items-center"
          key={option}
          onClick={(event) => handleSelectedOption(event, option)}
        >
          <p>{option}</p>
          <CheckBox isSelected={option === selectedOption} />
        </div>
      ))}

      <button
        type="button"
        onClick={(event) => handleSelectedOption(event, "")}
        className="underline font-normal text-sm leading-4 text-[#535E73]"
      >
        Reset to default
      </button>
    </div>
  );
};
