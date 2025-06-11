import { FC, ReactNode, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/solid";

type Props = {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

const Dropdown: FC<Props> = ({ title, defaultOpen = false, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      className={`bg-[#14171F] rounded-2xl py-6 px-[30px] font-gotham transition-all duration-300 ease-in-out ${
        isOpen ? "border border-[#2A2D36]" : "border-transparent"
      }`}
    >
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <p className="text-white text-2xl font-medium">{title}</p>
        <button className="p-2">
          <ChevronDownIcon
            className={`w-6 h-6 text-white transition-transform duration-300 ${
              isOpen ? "rotate-180" : "rotate-0"
            }`}
          />
        </button>
      </div>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? "h-full opacity-100 mt-6" : "max-h-0 opacity-0"
        }`}
      >
        <div className="bg-[#161C27] rounded-lg p-6 md:p-8">{children}</div>
      </div>
    </div>
  );
};

export default Dropdown;
