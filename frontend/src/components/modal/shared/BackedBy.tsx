import BackedByIcon from "@/components/svg/BackedByIcon";
import Link from "next/link";
import ZetaChainLogo from "@public/logo/zetachain.svg";

const BackedBy = () => (
  <div className="flex flex-col gap-[10px]">
    <BackedByIcon width={213} height={10} />
    <div className="flex flex-row gap-2 items-center px-[9px]">
      <span
        className="uppercase text-white font-normal tracking-wide"
        style={{ fontSize: "16px", lineHeight: "112%" }}
      >
        Backed by
      </span>
      <Link href="https://www.zetachain.com/" target="_blank">
        <ZetaChainLogo height={28} className="w-auto h-[28px]" />
      </Link>
    </div>
  </div>
);
export default BackedBy;
