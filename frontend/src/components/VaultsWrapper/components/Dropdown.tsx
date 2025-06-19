import { Dispatch, useEffect, useRef, useState } from "react";

import classNames from "classnames";
import { SetStateAction } from "jotai";

import LeftArrowIcon from "@/components/svg/LeftArrowIcon";
import { DropdownChainsList } from "@/components/DropdownChainsList";
import { DropdownList } from "./DropdownList";

type Props = {
  options: { value: string; icon?: string }[];
  selectedOption: string;
  setSelectedOption:
    | Dispatch<SetStateAction<string>>
    | ((filter: string) => void);
  width?: number;
  emptyLabel?: string;
  IconButton?: React.ElementType;
  listType?: "chains" | "simple";
};

export const Dropdown: React.FC<Props> = ({
  options,
  selectedOption,
  setSelectedOption,
  width,
  emptyLabel,
  IconButton,
  listType,
}) => {
  const [isShownList, setIsShownList] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsShownList(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
    <div
      ref={dropdownRef}
      className="flex relative md:w-auto font-medium text-lg leading-[18px] tracking-1 text-white font-gotham "
    >
      {IconButton ? (
        <button type="button" onClick={handleToggleDropdown}>
          <IconButton color={!isShownList ? "#535E73" : "#1B46E0"} />
        </button>
      ) : (
        <div
          style={{ width: width }}
          className="flex hover:cursor-pointer border-[#535E73] flex-row px-3 justify-between py-[6px] border-[0.5px] rounded-lg gap-1 hover:border-blue-button h-fit"
          onClick={handleToggleDropdown}
        >
          <input
            type="dropdown"
            className="w-4/5 hover:cursor-pointer bg-transparent outline-none"
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
      )}

      {listType === "simple" ? (
        <DropdownList
          variant="chain"
          isIconButton={!!IconButton}
          options={options}
          handleSelectedOption={handleSelectedOption}
          selectedOption={selectedOption}
          width={!width ? 200 : width + 20}
          isShownList={isShownList}
        />
      ) : (
        <DropdownChainsList
          isIconButton={!!IconButton}
          options={options}
          handleSelectedOption={handleSelectedOption}
          selectedOption={selectedOption}
          width={!width ? 200 : width + 20}
          isShownList={isShownList}
          minWidth={526}
        />
      )}
    </div>
  );
};
