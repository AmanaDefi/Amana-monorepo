"use client";

import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/header";
import GlowIcon from "@/components/svg/GlowIcon";
import { useMultiChain } from "@/providers/MultiChainProvider";
import React, { useState } from "react";

const ConditionalLayout = ({ children }: { children: React.ReactNode }) => {
  const { walletAddress } = useMultiChain();
  const isConnected = !!walletAddress;
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="relative overflow-hidden min-h-screen z-0">
      <GlowIcon position="top-right" />
      <GlowIcon position="bottom-left" />

      {isConnected ? (
        <div className="flex flex-col min-h-screen mx-auto w-full pt-[60px] pb-[30px]">
          <Header />
          <div className="flex flex-1">
            <div className="flex-shrink-0">
              <Sidebar
                isCollapsed={isCollapsed}
                setIsCollapsed={setIsCollapsed}
              />
            </div>
            <div
              className="flex-1"
              style={{
                paddingLeft: isCollapsed ? "20px" : "29px",
                paddingRight: "16px",
                maxWidth: `calc(100% - ${isCollapsed ? 136 : 302}px - ${
                  isCollapsed ? 20 : 29
                }px)`,
              }}
            >
              {children}
            </div>
          </div>
          <Footer isConnected />
        </div>
      ) : (
        <div className="flex flex-col  min-h-screen flex-1 mx-auto w-full py-[40px]">
          <Header />
          <div className="flex-1 ml-16">{children}</div>
          <div className="ml-16">
            <Footer isConnected={false} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ConditionalLayout;