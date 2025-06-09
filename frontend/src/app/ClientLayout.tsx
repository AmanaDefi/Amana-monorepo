
import { Inter, Space_Mono } from "next/font/google";
import "./globals.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import React, { PropsWithChildren } from "react";
import AccountProvider from "@/providers/AccountProvider";
import TokenPriceProvider from "@/providers/TokenPriceProvider";
import { fustat, gotham } from "@/styles/fonts";
import { MultiChainProvider } from "@/providers/MultiChainProvider";
import SolanaWalletProvider from "@/providers/SolanaWalletProvider";
import ConditionalLayout from "./ConditionalLayout";
import { AlchemyClientState } from "@account-kit/core";
import { ThirdwebProvider } from "thirdweb/react";
import { Providers } from "@/providers/AlchemyProviders";

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
  return (
    <html
      lang="en"
      className={`${fustat.variable} ${gotham.variable} ${inter.variable} ${spaceMono.variable}`}
    >
      <body className="font-sans font-light">
        <Providers>
          <SolanaWalletProvider>
            <ThirdwebProvider>
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
            </ThirdwebProvider>
          </SolanaWalletProvider>
        </Providers>
      </body>
    </html>
  );
};

export default ClientLayout;
