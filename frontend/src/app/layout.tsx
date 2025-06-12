import type { Metadata } from "next";
import ClientLayout from "@/app/ClientLayout";
import React from "react";
import { cookieToInitialState } from "@account-kit/core";
import { alchemyConfig } from "../../alchemyConfig";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "App AmanaDefi - Decentralized Yield Generation Platform",
  description:
    "Generate passive yield across multiple chains with Amana DeFi. Secure, automated yield generation through tested DeFi strategies. No bridging required.",
  icons: {
    icon: [
      {
        url: "/logo/amanadefi/logo-light.svg",
        type: "image/svg+xml",
      },
      // {
      //     media: '(prefers-color-scheme: dark)',
      //     url: '/logo/amanadefi/logo.svg',
      //     type: 'image/svg+xml',
      // },
      // {
      //     media: '(prefers-color-scheme: light)',
      //     url: '/logo/amanadefi/logo-light.svg',
      //     type: 'image/svg+xml',
      // }
    ],
  },
};

export default function MyApp({ children }: { children: React.ReactNode }) {
  const initialState = cookieToInitialState(
    alchemyConfig,
    headers().get("cookie") ?? undefined,
  );
  return <ClientLayout initialState={initialState}>{children}</ClientLayout>;
}
