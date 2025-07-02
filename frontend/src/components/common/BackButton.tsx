"use client";

import { useRouter } from "next/navigation";
import Button from "../Button";
import BackToVaultsIcon from "../svg/BackToVaultsIcon";

type BackButtonProps = {
  href?: string;
  label?: string;
  onClick?: () => void;
};

const BackButton = ({
  href = "/",
  label = "Back to vaults",
  onClick,
}: BackButtonProps) => {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.push(href);
    }
  };

  return (
    <Button
      variant="outlined"
      onClick={handleClick}
      className="flex items-center justify-between max-h-[42px] 2xl:max-h-[56px] !px-[16px] !py-[10px] md:!py-[17px] !max-w-[181px] md:!max-w-[192px]"
    >
      <div className="w-5 h-5 relative z-2 flex items-center justify-center">
        <BackToVaultsIcon width={7} height={12} />
      </div>
      {label}
    </Button>
  );
};

export default BackButton;
