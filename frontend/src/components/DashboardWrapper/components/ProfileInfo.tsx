"use client";
import { useState } from "react";
import ProfileCircle from "@/components/svg/ProfileCircle";
import ProfileIcon from "@/components/svg/Profile";
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
        <div className="w-full mt-0 md:mt-8 flex relative flex-col items-center bg-[rgba(20,23,31,0.15)] border border-[#3E3C59] shadow-custom md:flex-row md:items-start md:bg-transparent md:backdrop-blur-none md:shadow-none md:p-0 md:rounded-none md:border-none backdrop-blur-[20px] py-8 px-[23px] rounded-3xl">
          <ProfileCircle
            width={100}
            height={100}
            className="mr-6 hidden md:block"
          />

          <div className="flex flex-col gap-4 items-center text-center md:items-start md:text-left">
            <div className="flex flex-row gap-2 text-[18px] font-normal text-white md:gap-8 md:text-[18px]">
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
            <p className="text-[#9A9CB3] text-sm md:hidden mt-2">
              Total Portfolio
            </p>
            <div className="text-[32px] font-normal md:font-medium md:text-[24px]">
              {balance?.formatted && Number(balance.formatted) > 0
                ? Number(balance.formatted).toFixed(4)
                : "0"}{" "}
              {chain?.nativeCurrency?.symbol || ""}
            </div>
            <p
              className={`md:hidden ${205.6 > 0 ? "text-[#05D47F]" : "text-white"}`}
            >
              +$205.60(+8,54%)
            </p>

            <WalletActions />
          </div>
          <AppModals />
        </div>
      )}
    </>
  );
};

export default ProfileInfo;
