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
            className={`${isConnected ? "pt-4 md:pt-6 lg:pt-[60px] lg:px-0" : "pt-4 lg:pt-10 lg:pr-[108px]"} px-4 `}
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
    <div className="relative  overflow-hidden min-h-screen z-0">
      <GlowIcon position={isMobile ? "top-mobile" : "top-right"} />
      <GlowIcon position={isMobile ? "bottom-mobile" : "bottom-left"} />

      {isConnected ? (
        <div className="flex flex-col mx-auto w-full min-h-screen pt-4 md:py-6 lg:pt-[60px] pb-[30px] px-4 md:px-[44px] lg:px-0 ">
          <Header activeSection={activeSection} />
          <div className="flex flex-1">
            <div className="flex-shrink-0 lg:min-h-[908px] max-h-[1001px]">
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
                      padding: "0",
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
        <div className="flex flex-col flex-1 mx-auto w-full min-h-screen py-4 md:py-6 lg:py-10 px-4 md:px-[44px] lg:pr-[108px] lg:px-0 ">
          <Header activeSection={activeSection} />
          <div className="flex-1 lg:ml-16 lg:pl-[44px]">{children}</div>
          <div className="lg:ml-16">
            <Footer isConnected={false} />
            <AppModals />
          </div>
        </div>
      )}
    </div>
  );
};

export default ConditionalLayout;
