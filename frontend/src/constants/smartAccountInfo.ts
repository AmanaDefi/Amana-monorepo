import { ComponentType } from "react";
import BrainIcon from "@/components/svg/onboarding/BrainIcon";
import SecureIcon from "@/components/svg/onboarding/SecureIcon";
import PowerIcon from "@/components/svg/onboarding/PowerIcon";
import FundIcon from "@/components/svg/onboarding/FundIcon";

export enum IconTypes {
  PASSKEY = "PASSKEY",
  EMAIL = "EMAIL",
  SMART = "SMART",
  FUND = "FUND",
}

export const iconComponents: Record<
  IconTypes,
  ComponentType<React.SVGProps<SVGSVGElement>>
> = {
  [IconTypes.PASSKEY]: BrainIcon,
  [IconTypes.EMAIL]: SecureIcon,
  [IconTypes.SMART]: PowerIcon,
  [IconTypes.FUND]: FundIcon,
};

export type SubItem = {
  text: string;
};

export type ListItem =
  | string
  | {
      text: string;
      subItems?: SubItem[];
    };

export type SmartAccountInfo = {
  img: IconTypes;
  title: string;
  list: ListItem[];
};

export const smartAccountInfo: SmartAccountInfo[] = [
  {
    img: IconTypes.PASSKEY,
    title: "What's a Smart Account?",
    list: [
      "A smart account is a new kind of crypto wallet powered by smart contracts — no extensions, no seed phrases, no setup.",
      "It's created automatically when you log in with email, Google, or a passkey.",
      "It works like a wallet - just smarter and easier.",
    ],
  },
  {
    img: IconTypes.EMAIL,
    title: "Why Am I Getting One?",
    list: [
      {
        text: "When you sign up, Amana creates your smart account automatically:",
        subItems: [
          { text: "Secure and on-chain" },
          { text: "Only you can access it" },
          { text: "No wallet app, no seed phrase" },
        ],
      },
      "It's ready the moment you log in.",
    ],
  },
  {
    img: IconTypes.SMART,
    title: "How Will I Use It?",
    list: [
      {
        text: "Your smart account powers everything you do on Amana:",
        subItems: [
          { text: "Deposit into vaults" },
          { text: "Withdraw anytime" },
          { text: "Track your portfolio" },
          { text: "Recover access if needed" },
        ],
      },
    ],
  },
  {
    img: IconTypes.FUND,
    title: "How do I get funds into it?",
    list: [
      {
        text: "You can do this by:",
        subItems: [
          { text: "Send crypto from another wallet" },
          { text: "Or pay by card" },
        ],
      },
    ],
  },
];

export const getIconComponent = (iconType: IconTypes) => {
  return iconComponents[iconType];
};
