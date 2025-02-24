import { Milestone, StepStatus } from "@/types/types";

export const milestones: Milestone[] = [
  {
    title: "Q1",
    steps: [
      { description: "Launch Website and App", status: StepStatus.completed },
      { description: "Deploy EVM-Compatible vaults", status: StepStatus.completed },
      {
        description: "Integrate Solana wallet support",
        status: StepStatus.completed,
      },
      {
        description: "Onboard users and increase TVL",
        status: StepStatus.upcoming,
      },
    ],
  },
  {
    title: "Q2",
    steps: [
      { description: "Enable Solana Wallet Functionality", status: StepStatus.upcoming },
      {
        description: "Add Bitcoin & Sui Wallets",
        status: StepStatus.upcoming,
      },
      {
        description: "Introduce Smart Account Sign-in",
        status: StepStatus.upcoming,
      },
      {
        description: "Improve UX/UI with Community Feedback",
        status: StepStatus.upcoming,
      },
    ],
  },
  {
    title: "Q3",
    steps: [
      {
        description: "TGE for Amana Token $AMANA",
        status: StepStatus.upcoming,
      },
      { description: "Launch AI-Driven Smart Vaults", status: StepStatus.upcoming },
      { description: "Integrate TON Blockchain Wallets", status: StepStatus.upcoming },
      {
        description: "Launch Sui-Based Yield Strategies",
        status: StepStatus.upcoming,
      },
    ],
  },
  {
    title: "Q4",
    steps: [
      { description: "Expand Yield Strategies to TON Blockchain", status: StepStatus.upcoming },
      { description: "", status: StepStatus.upcoming },
      { description: "", status: StepStatus.upcoming },
      { description: "", status: StepStatus.upcoming },
    ],
  },
];
