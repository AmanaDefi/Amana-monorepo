"use client";

import Footer from "@/components/Footer";
import Loader from "@/components/Loader";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/header";
import { AppModals } from "@/components/modal/AppModals";
import GlowIcon from "@/components/svg/GlowIcon";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { getActiveSectionFromPathname } from "@/utils/getActiveSectionFromPathname";
import { usePathname } from "next/navigation";
import React, { useState, useEffect } from "react";

const ConditionalLayout = ({ children }: { children: React.ReactNode }) => {
  const { isHydrated, walletAddress } = useMultiChain();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const pathname = usePathname();
  const activeSection = getActiveSectionFromPathname(pathname);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();

    window.addEventListener("resize", checkIsMobile);

    return () => {
      window.removeEventListener("resize", checkIsMobile);
    };
  }, []);

  // if (!isHydrated) {
  //   return (
  //     <div className="relative overflow-hidden min-h-screen z-0">
  //       <GlowIcon position="top-right" />
  //       <GlowIcon position="bottom-left" />
  //       <div className="flex items-center justify-center min-h-screen">
  //         <Loader />
  //       </div>
  //     </div>
  //   );
  // }

   const isConnected = !!walletAddress;

  return (
    <div className="relative overflow-hidden min-h-screen z-0">
      <GlowIcon position="top-right" />
      <GlowIcon position="bottom-left" />

      {isConnected ? (
        <div className="flex flex-col mx-auto w-full min-h-screen pt-[60px] pb-[30px] px-4 md:px-0">
          <Header
            activeSection={activeSection}
            
          />
          <div className="flex flex-1">
            <div className="flex-shrink-0 min-h-[908px] max-h-[1001px]">
              <Sidebar
                activeSection={activeSection}
                isCollapsed={isCollapsed}
                setIsCollapsed={setIsCollapsed}
              />
            </div>

            <div
              className="flex-1"
              style={
                !isMobile
                  ? {
                      paddingLeft: isCollapsed ? "20px" : "29px",
                      paddingRight: "16px",
                      maxWidth: `calc(100% - ${isCollapsed ? 136 : 302}px - ${
                        isCollapsed ? 20 : 29
                      }px)`,
                    }
                  : {
                      padding: "0 16px",
                    }
              }
            >
              {children}
            </div>
          </div>
          <Footer isConnected />
          <AppModals />
        </div>
      ) : (
        <div className="flex flex-col flex-1 mx-auto w-full min-h-screen py-[40px] px-4 md:pr-[108px] md:px-0">
          <Header
            activeSection={activeSection}
          />
          <div className="flex-1 md:ml-16 md:pl-[44px]">{children}</div>
          <div className="md:ml-16">
            <Footer isConnected={false} />
            <AppModals />
          </div>
        </div>
      )}
    </div>
  );
};

export default ConditionalLayout;
