import React from "react";
import ZetaChainLogo from "@public/logo/zetachain.svg";
import DiscordLogo from "@public/logo/discord.svg";
import XLogo from "@public/logo/x.svg";
import LinkedInLogo from "@public/logo/linkedIn.svg"; 
import Link from "next/link";

const Footer = () => {
  return (
    <footer className="flex justify-between items-center max-w-[1536px] mx-auto w-full">
      <div className="flex items-center gap-4">
        <span
          className="uppercase text-white text-sm font-normal tracking-wide"
          style={{ fontSize: "16px", lineHeight: "112%" }}
        >
          Backed by
        </span>
        <Link href="https://www.zetachain.com/" target="_blank">
          <ZetaChainLogo height={28} className="w-auto h-[28px]" />
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <Link
          href="https://www.linkedin.com/company/amana-defi" 
          target="_blank"
          className="w-10 h-10 bg-[#1B46E0] rounded-full flex items-center justify-center"
        >
          <LinkedInLogo height={18} className="w-[18px] h-[18px]" />
        </Link>
        <Link
          href="https://x.com/Amana_DeFi"
          target="_blank"
          className="w-10 h-10 bg-[#1B46E0] rounded-full flex items-center justify-center"
        >
          <XLogo height={18} className="w-[18px] h-[18px]" />
        </Link>
        <Link
          href="https://discord.gg/kG3Gfn3B9V"
          target="_blank"
          className="w-10 h-10 bg-[#1B46E0] rounded-full flex items-center justify-center"
        >
          <DiscordLogo height={18} className="w-[18px] h-[18px]" />
        </Link>
      </div>
    </footer>
  );
};

export default Footer;
