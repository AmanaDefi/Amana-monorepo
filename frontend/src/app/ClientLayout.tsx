"use client";

import { Inter, Space_Mono } from "next/font/google";
import "./globals.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { PropsWithChildren, useState } from "react";
import AccountProvider from "@/providers/AccountProvider";
import TokenPriceProvider from "@/providers/TokenPriceProvider";
import { fustat, gotham } from "@/styles/fonts";
import { MultiChainProvider } from "@/providers/MultiChainProvider";
import SolanaWalletProvider from "@/providers/SolanaWalletProvider";
import ConditionalLayout from "./ConditionalLayout";
import { AlchemyAccountProvider } from "@account-kit/react";
import { alchemyConfig } from "@/config.ts/alchemyConfig";
import { AlchemyClientState } from "@account-kit/core";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-inter",
});
const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
});

const ClientLayout = (
  props: PropsWithChildren<{ initialState?: AlchemyClientState }>,
) => {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <html
      lang="en"
      className={`${fustat.variable} ${gotham.variable} ${inter.variable} ${spaceMono.variable}`}
    >
      <body className="font-sans font-light">
        <QueryClientProvider client={queryClient}>
          <SolanaWalletProvider>
            <AlchemyAccountProvider
              config={alchemyConfig}
              queryClient={queryClient}
              initialState={props.initialState}
            >
              <AccountProvider>
                <MultiChainProvider>
                  <TokenPriceProvider>
                    <main className="min-h-screen flex flex-col relative overflow-hidden">
                      <ConditionalLayout>{props.children}</ConditionalLayout>
                    </main>
                  </TokenPriceProvider>
                </MultiChainProvider>
              </AccountProvider>
              <ToastContainer />
            </AlchemyAccountProvider>
          </SolanaWalletProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
};

export default ClientLayout;
