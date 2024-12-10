import { useState } from "react";
import { Token } from "@/types/types";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import Image from "next/image";

interface SearchTokenProps {
  selectToken: (token: Token) => void;
  selectedToken: Token;
  options: Token[];
}

export default function SearchToken({
  options,
  selectToken,
  selectedToken
}: SearchTokenProps): JSX.Element {


  const [search, setSearch] = useState("");
  const [filteredOptions, setFilteredOptions] = useState<Token[]>(options);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (value.trim().length > 0) {
      setFilteredOptions(
        options.filter((option) =>
          option.symbol.toLowerCase().includes(value.toLowerCase())
        )
      );
    } else {
      setFilteredOptions(options);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="relative mb-4">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <MagnifyingGlassIcon
            className="h-6 w-6 md:h-8 md:w-8 text-white"
            aria-hidden="true"
          />
        </div>
        <input
          type="text"
          name="search"
          id="search"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="block w-full h-14 md:h-14 pb-0 border-white pl-14 focus:border-white focus:ring-white rounded-5xl text-base md:text-xl placeholder:text-base md:placeholder:text-xl pt-0 bg-customNeutral300"
          placeholder="Search"
        />
      </div>
      <div className="mt-4">
        <ul className="scrollable__select py-6 overflow-y-auto shadow-scrollableSelect rounded-lg p-6 border border-customGray300">
          {filteredOptions.map((option) => (
            <li
              className="my-1 bg-transparent text-base md:text-lg hover:bg-customGray300 hover:bg-opacity-40 rounded-lg"
              key={option.symbol}
              onClick={() => {
                selectToken(option);
              }}
            >
              <span
                className={`flex items-center py-3 px-3 ${selectedToken?.address === option.address
                  ? "text-primaryYellow font-semibold"
                  : "text-white font-normal  cursor-pointer"
                  }`}
              >
                <span className="w-5 h-5 inline-flex mr-3 flex-shrink-0 cursor-pointer">
                  <Image
                    src={option.imgURL}
                    alt={option.symbol}
                    width={1200} // Adjust to your desired width
                    height={800} // Adjust to your desired height                  
                    className="h-full w-full object-contain mr-2 rounded-full"
                  />
                </span>
                <span className="cursor-pointer w-full flex flex-row justify-between">
                  <p>{option.symbol}</p>
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
