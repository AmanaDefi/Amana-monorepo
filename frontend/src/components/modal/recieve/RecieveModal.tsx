import CopyIcon from "@/components/svg/CopyIcon";
import { QRCodeCanvas } from "qrcode.react";
import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { Modal } from "../base/Modal";
import ZetaChainLogo from "@public/logo/zetachain.svg";
import Link from "next/link";

const ReceiveModal = () => {
  const [copied, setCopied] = useState(false);

  const { step, closeAll } = useAuthStore();

  const { walletAddress } = useMultiChain();

  const handleCopy = () => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Modal
      maxWidth="max-w-[526px]"
      isOpen={step === "recieve"}
      onClose={closeAll}
      noBlur={true}
      paddingClass="py-[45px] px-[20px]"
    >
      <div className="flex flex-col items-center font-gotham text-white w-full">
        <h2 className="text-[16px] font-bold mb-4">Use this deposit address</h2>
        <p className="text-sm font-normal text-start mb-10">
          Always double-check your deposit address - it may change without
          notice.
        </p>

        <div className="bg-black p-4 rounded">
          {walletAddress && (
            <QRCodeCanvas
              value={walletAddress}
              size={160}
              fgColor="#ffffff"
              bgColor="#000000"
              width={174}
              height={181}
            />
          )}
        </div>

        <div className="mt-[57px] font-gotham w-full max-h-[56px] bg-[#161C27] py-4 px-6 rounded-lg shadow-[0_4px_6px_0_rgba(0,0,0,0.15)] flex flex-row justify-between items-center">
          <span className="truncate text-[#535E73] text-[18px] font-bold">
            {walletAddress}
          </span>
          <button onClick={handleCopy} title="Copy mr-[27px]">
            <CopyIcon width={24} height={24} color="#fff" />
          </button>
        </div>

        {copied && <p className="text-green-400 text-sm">Copied!</p>}

        <div className="flex text-[16px] font-normal uppercase gap-2 mt-10 items-center">
          <span>Powered by</span>
          <Link href="https://www.zetachain.com/" target="_blank">
            <ZetaChainLogo height={29} className="w-auto h-[29px]" />
          </Link>
        </div>
      </div>
    </Modal>
  );
};

export default ReceiveModal;
