import React, { useState, useEffect } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { Token, VaultData } from "@/types/types";
import TokenIcon from "@/components/common/TokenIcon";
import SearchToken from "@/components/input/SearchToken";
import Modal from "@/components/modal/Modal";
import { Tooltip } from "react-tooltip";
import { useActiveAccount, useReadContract, useActiveWalletChain } from "thirdweb/react";
import { Account } from "thirdweb/wallets";

export interface SelectTokenProps {
  options: Token[];
  selectedToken: Token;
  selectToken: (token: Token) => void;
}

export default function SelectToken({
  options,
  selectedToken,
  selectToken
}: SelectTokenProps): JSX.Element {
  const [show, setShow] = useState(false);
  const selectTokenId = selectedToken?.symbol.split(" ").join("");

  return (
    <>
      {/* Desktop Token Search */}
      <div className="">
        <Modal
          visibility={[show, setShow]}
          classNames="md:w-fit md:min-w-fit"
          title={<h2 className="text-white text-2xl">Select a token</h2>}
        >
          <div className="mt-8">
            <SearchToken
              options={options}
              selectToken={(token) => {
                selectToken(token);
                setShow(false);
              }}
              selectedToken={selectedToken}
            />
          </div>
        </Modal>
      </div>
      <div className="relative w-auto justify-end">
        <span
          className={"flex flex-row items-center justify-end cursor-pointer group"}
          onClick={() => {
            setShow(true);
          }}
        >
          <div className="md:mr-2 relative flex-none w-5 h-5">
            <TokenIcon
              token={selectedToken}
              icon={selectedToken?.imgURL}
              imageSize="w-5 h-5"
            />
          </div>
          <p
            id={selectTokenId}
            className="font-medium text-lg leading-none hidden md:block text-white group-hover:text-white truncate cursor-pointer"
          >
            {selectedToken?.symbol || "Select Token"}
          </p>
          <div className="hidden md:block">
            <Tooltip
              anchorSelect={`#${selectTokenId}`}
              place="bottom"
              style={{ backgroundColor: "#353945" }}
            >
              {selectedToken?.symbol}
            </Tooltip>
          </div>
          <div className="md:hidden">
            <Tooltip
              anchorSelect={`#${selectedToken?.symbol}`}
              openOnClick
              place="bottom"
              style={{ backgroundColor: "#353945" }}
            >
              {selectedToken?.symbol}
            </Tooltip>
          </div>
          <ChevronDownIcon
            className={`w-6 h-6 ml-2 text-customGray300 group-hover:text-white 
              transform transition-all ease-in-out duration-200 ${show ? " rotate-180" : ""
              }`}
          />
        </span>
      </div>
    </>
  );
}
