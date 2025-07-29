"use client";

import Footer from "@/components/Footer";
import Sidebar from "@/components/sidebar/Sidebar";
import Header from "@/components/header";
import { AppModals } from "@/components/modal/AppModals";
import GlowIcon from "@/components/svg/GlowIcon";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { getActiveSectionFromPathname } from "@/utils/getActiveSectionFromPathname";
import { usePathname } from "next/navigation";
import React, { useState, useEffect } from "react";
import AboutLine from "@/components/svg/about/AboutLine";
import { motion } from "framer-motion";

const ConditionalLayout = ({ children }: { children: React.ReactNode }) => {
  const { walletAddress } = useMultiChain();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const pathname = usePathname();
  const activeSection = getActiveSectionFromPathname(pathname);

  const isAboutPage = pathname === "/about";

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window?.innerWidth < 1024);
    };

    checkIsMobile();
    window?.addEventListener("resize", checkIsMobile);

    return () => {
      window?.removeEventListener("resize", checkIsMobile);
    };
  }, []);

  const isConnected = !!walletAddress;

  if (isAboutPage) {
    return (
      <div className="relative overflow-hidden min-h-screen z-0">
        <GlowIcon position={isMobile ? "top-mobile" : "top-right"} />
        <GlowIcon position={isMobile ? "bottom-mobile" : "bottom-left"} />

        <div className="flex flex-col flex-1 mx-auto w-full min-h-screen relative z-10">
          <div
            className={`${isConnected ? "pt-4 px-4 md:pt-6 lg:pt-10 lg:px-0" : "pt-4 px-4 lg:px-0 lg:pt-10 lg:pr-0"} `}
          >
            <Header activeSection={activeSection} />
          </div>
          <div
            className="flex-1"
            style={
              !isMobile
                ? {
                    paddingLeft: "40px",
                    paddingRight: "40px",
                  }
                : {
                    paddingLeft: "16px",
                    paddingRight: "16px",
                  }
            }
          >
            {children}
          </div>
        </div>
        <div className="absolute -left-2 right-0 -bottom-1 pointer-events-none z-0">
          <div
            className="w-full h-[336px] md:h-[500px] lg:h-[683px]"
            style={{
              width: "100vw",
              marginLeft: "50%",
              transform: "translateX(-50%)",
            }}
          >
            <AboutLine
              className="w-full h-full"
              style={{
                width: "100%",
                height: "100%",
                minWidth: "100vw",
              }}
            />
          </div>
        </div>

        <AppModals />
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden min-h-screen z-0">
      <GlowIcon position={isMobile ? "top-mobile" : "top-right"} />
      <GlowIcon position={isMobile ? "bottom-mobile" : "bottom-left"} />

      {isConnected ? (
        <div className="flex flex-col mx-auto w-full min-h-screen pt-4 md:py-6 lg:pt-10 pb-[30px] px-4 md:px-[44px] lg:px-0 ">
          <Header activeSection={activeSection} />
          <div className="flex flex-1">
            <div className="flex-shrink-0 h-[915px]">
              <Sidebar
                activeSection={activeSection}
                isCollapsed={isCollapsed}
                setIsCollapsed={setIsCollapsed}
              />
            </div>

            <motion.div
              animate={{
                paddingLeft: !isMobile
                  ? isCollapsed
                    ? "15px"
                    : "29px"
                  : "0px",
              }}
              transition={{
                duration: 0.8,
                ease: "easeInOut",
              }}
              className={`flex-1 ${!isMobile ? "pr-[44px]" : "p-0"}`}
            >
              {children}
            </motion.div>
          </div>
          <Footer isConnected />
          <AppModals />
        </div>
      ) : (
        <div className="flex flex-col flex-1 mx-auto w-full min-h-screen py-4 md:py-6 lg:py-10 px-4 md:px-[44px] lg:px-0 ">
          <Header activeSection={activeSection} />
          <div className="flex-1 px-0 lg:px-[44px]">
            {children}
          </div>
          <div className="px-0 lg:px-[44px]">
            <Footer isConnected={false} />
            <AppModals />
          </div>
        </div>
      )}
    </div>
  );
};

export default ConditionalLayout;
