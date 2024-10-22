"use client"; // Client-side code

import { Inter } from "next/font/google";
import "./globals.css";
import { ThirdwebProvider } from "thirdweb/react";
import { ToastContainer } from "react-toastify"; 
import 'react-toastify/dist/ReactToastify.css'; 
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={inter.className}>
        <QueryClientProvider client={queryClient}>
          <ThirdwebProvider>
            {children}
            <ToastContainer /> 
          </ThirdwebProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
