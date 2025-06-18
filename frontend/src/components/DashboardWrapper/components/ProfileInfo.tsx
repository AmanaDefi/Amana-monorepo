"use client";

import { useState } from "react";
import ProfileCircle from "@/components/svg/ProfileCircle";
import ProfileIcon from "@/components/svg/Profile";
import EditIcon from "@/components/svg/EditIcon";
import DropdownArrowIcon from "@/components/svg/DropdownArrowIcon";
import WalletActions from "./WalletActions";
import ProfileDropdown from "./ProfileDropdown";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { AppModals } from "@/components/modal/AppModals";
import { useChain } from "@account-kit/react";

const ProfileInfo = () => {
  const { walletAddress, balance } = useMultiChain();
  const { chain } = useChain();
  const isConnected = !!walletAddress;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <>
      {isConnected && (
        <div className="mt-8 flex flex-row relative">
          <ProfileCircle width={100} height={100} className="mr-6" />
          <div className="flex flex-col gap-4">
            <div className="flex flex-row gap-8 text-[18px] font-normal text-white">
              {/* <div className="flex flex-row gap-1 items-center">
                <span>{email || "No email"}</span>
                <EditIcon width={12} height={12} />
              </div> */}

              <div className="flex flex-row gap-2 items-center relative">
                <ProfileIcon />
                <span>
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </span>
                <button
                  className="p-2 transition-transform duration-200"
                  onClick={() => setIsDropdownOpen((prev) => !prev)}
                >
                  <DropdownArrowIcon
                    width={12}
                    height={7}
                    className={isDropdownOpen ? "rotate-0" : "rotate-180"}
                  />
                </button>

                <ProfileDropdown
                  isOpen={isDropdownOpen}
                  setIsOpen={setIsDropdownOpen}
                />
              </div>
            </div>

            <div className="text-[24px] font-medium">
              {Number(balance.formatted).toFixed(4)} {chain.nativeCurrency.symbol}
            </div>

            <WalletActions />
          </div>
          <AppModals />
        </div>
      )}
    </>
  );
};

export default ProfileInfo;
