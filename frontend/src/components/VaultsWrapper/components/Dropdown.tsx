import { Dispatch, useState } from "react";

import classNames from "classnames";
import { SetStateAction } from "jotai";

import LeftArrowIcon from "@/components/svg/LeftArrowIcon";
import CloseIcon from "@/components/svg/CloseIcon";
import { CheckBox } from "@/components/CheckBox";
import { DropdownList } from "./DropdownList";

type Props = {
  options: string[];
  selectedOption: string;
  setSelectedOption: Dispatch<SetStateAction<string>>;
  width: number;
  emptyLabel: string;
};

export const Dropdown: React.FC<Props> = ({
  options,
  selectedOption,
  setSelectedOption,
  width,
  emptyLabel,
}) => {
  const [isShownList, setIsShownList] = useState(false);

  const handleToggleDropdown = () => {
    setIsShownList(!isShownList);
  };

  const handleSelectedOption = (
    event:
      | React.MouseEvent<HTMLParagraphElement, MouseEvent>
      | React.MouseEvent<HTMLButtonElement, MouseEvent>,
    option: string,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    setSelectedOption(option);

    setIsShownList(false);
  };

  const handleOnBlur = () => {
    setTimeout(() => setIsShownList(false), 150);
  };

  return (
    <div className="flex relative font-bold text-lg leading-[19px] tracking-1 text-white ">
      <div
        style={{ width: width }}
        className="flex flex-row px-3 justify-between py-[6px] border-[0.5px] rounded-lg gap-1 border-blue-button"
        onClick={handleToggleDropdown}
      >
        <input
          type="dropdown"
          className="w-4/5 bg-transparent outline-none"
          value={selectedOption ? selectedOption : emptyLabel}
          onBlur={handleOnBlur}
          readOnly
        />
        <button
          aria-label="dropdown-arrow"
          type="button"
          className={classNames("w-3", {
            "rotate-90": isShownList,
            "-rotate-90": !isShownList,
          })}
        >
          <LeftArrowIcon color="white" strokeWidth={3} />
        </button>
      </div>

      {isShownList && (
        <DropdownList
          options={options}
          handleSelectedOption={handleSelectedOption}
          handleToggleDropdown={handleToggleDropdown}
          selectedOption={selectedOption}
          width={width + 20}
        />
      )}
    </div>
  );
};
