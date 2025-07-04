"use client"; // Client-side code

import { Inter, Space_Mono } from "next/font/google";
import "./globals.css";
import { ThirdwebProvider } from "thirdweb/react";
import { ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useState } from 'react';
import AccountProvider from "@/providers/AccountProvider";
import TokenPriceProvider from "@/providers/TokenPriceProvider";
import { fustat } from '@/styles/fonts'
import Header from "@/components/header";
import Footer from "@/components/Footer";

const inter = Inter({ subsets: ["latin"], weight: ['300', '400', '500'], variable: '--font-inter' });
const spaceMono = Space_Mono({ subsets: ["latin"], weight: ['400', '700'], variable: '--font-space-mono' });

const ClientLayout = ({ children }: Readonly<{ children: React.ReactNode; }>) => {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <html lang="en" className={`${fustat.variable} ${inter.variable} ${spaceMono.variable}`}>
        <body className='font-sans font-light'>
            <QueryClientProvider client={queryClient}>
                <ThirdwebProvider>
                      <AccountProvider>
                          <TokenPriceProvider>
                              <main className="min-h-screen flex flex-col relative overflow-hidden">
                                  <div className="flex flex-col flex-1 page-container">
                                      <Header/>
                                      <div className='flex flex-1 mx-auto container'>
                                          {children}
                                      </div>
                                      {/* Footer aligned with the main content */}
                                      <Footer/>
                                  </div>
                              </main>
                          </TokenPriceProvider>
                      </AccountProvider>
                    <ToastContainer/>
                </ThirdwebProvider>
            </QueryClientProvider>
        </body>
    </html>
  );
}

export default ClientLayout;
