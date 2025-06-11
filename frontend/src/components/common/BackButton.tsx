"use client";

import { useRouter } from "next/navigation";
import Button from "../Button";
import BackToVaultsIcon from "../svg/BackToVaultsIcon";

type BackButtonProps = {
  href?: string;
  label?: string;
};

const BackButton = ({
  href = "/",
  label = "Back to vaults",
}: BackButtonProps) => {
  const router = useRouter();

  return (
    <Button
      variant="outlined"
      onClick={() => router.push(href)}
      className="flex items-center justify-between max-h-[56px]"
    >
      <div className="w-5 h-5 relative z-2 flex items-center justify-center">
        <BackToVaultsIcon width={7} height={12} />
      </div>
      {label}
    </Button>
  );
};

export default BackButton;
