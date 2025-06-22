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
      className={`
        bg-transparent md:bg-[#14171F] 
        rounded-none md:rounded-2xl 
        py-4 md:py-6 
        px-0 md:px-[30px] 
        font-gotham 
        transition-all duration-300 ease-in-out 
        ${isOpen ? "border-transparent md:border md:border-[#2A2D36]" : "border-transparent"}
      `}
    >
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <p className="text-white text-xl md:text-2xl font-medium">{title}</p>
        <button className="p-2">
          <ChevronDownIcon
            className={`w-6 h-6 text-white transition-transform duration-300 ${
              isOpen ? "rotate-180" : "rotate-0"
            }`}
          />
        </button>
      </div>

      <div
        className={`
          md:hidden
          overflow-hidden transition-all duration-300 ease-in-out 
          ${isOpen ? "max-h-screen opacity-100 mt-4" : "max-h-0 opacity-0"}
        `}
      >
        <div className="bg-transparent min-h-[180px] rounded-none p-0 md:p-4 max-h-[60vh] overflow-y-auto">
          {children}
        </div>
      </div>

      <div
        className={`
          hidden md:block
          overflow-hidden transition-all duration-300 ease-in-out 
          ${isOpen ? "opacity-100 mt-6 h-full" : "max-h-0 opacity-0"}
        `}
      >
        <div className="bg-[#161C27] min-h-[180px] rounded-lg p-6 lg:p-8">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Dropdown;
