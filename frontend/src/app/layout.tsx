"use client"; // Client-side code

import { Inter } from "next/font/google";
import "./globals.css";
import { ThirdwebProvider } from "thirdweb/react";
import { ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import AccountProvider from "@/providers/AccountProvider";
import TokenPriceProvider from "@/providers/TokenPriceProvider";

const inter = Inter({ subsets: ["latin"] });

const MyApp = ({ children }: Readonly<{ children: React.ReactNode; }>) => {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={inter.className}>
        <QueryClientProvider client={queryClient}>
          <ThirdwebProvider>
              <AccountProvider>
                  <TokenPriceProvider>
                      {children}
                  </TokenPriceProvider>
              </AccountProvider>
            <ToastContainer />
          </ThirdwebProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}

export default MyApp;
