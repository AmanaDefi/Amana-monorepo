"use client";
import ProfileCircle from "@/components/svg/ProfileCircle";
import { useAuthStore } from "@/store/authStore";
import ProfileIcon from "@/components/svg/Profile";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import EditIcon from "@/components/svg/EditIcon";
import WalletActions from "./WalletActions";

const ProfileInfo = ({}) => {
  const { email, userAddress, isAuthenticated } = useAuthStore();
  return (
    <div className="mt-8 flex flex-row">
      <ProfileCircle width={100} height={100} className="mr-6" />
      <div className="flex flex-col gap-4">
        <div className="flex flex-row gap-8 text-[18px] font-normal text-white">
          <div className="flex flex-row gap-1 items-center">
            <span>{email}olhasyd</span>
            <EditIcon width={12} height={12} />
          </div>
          <div className="flex flex-row gap-2 items-center">
            <ProfileIcon />
            <span>
              {/* {`${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` || */}
              63437463743
            </span>
          </div>
        </div>
              <div className="text-[24px] font-medium">$0</div>
              <WalletActions />
      </div>
    </div>
  );
};

export default ProfileInfo;
