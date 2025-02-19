import { Milestone, StepStatus } from "@/types/types";

export const milestones: Milestone[] = [
  {
    title: "Q1",
    steps: [
      { description: "Launch Website and App", status: StepStatus.completed },
      { description: "Launch EVM Vaults", status: StepStatus.completed },
      {
        description: "Add Solana Wallet Integration",
        status: StepStatus.completed,
      },
      {
        description: "Onboard Users and increase TVL",
        status: StepStatus.upcoming,
      },
    ],
  },
  {
    title: "Q2",
    steps: [
      { description: "Launch Solana Wallets", status: StepStatus.upcoming },
      {
        description: "Add BTC Wallet Integration",
        status: StepStatus.upcoming,
      },
      {
        description: "Add Smart Account Sign0in Options",
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
      { description: "Launch AI Smart Vaults", status: StepStatus.upcoming },
      { description: "Launch Solana Strategies", status: StepStatus.upcoming },
      {
        description: "Partnerships and Collaborations",
        status: StepStatus.upcoming,
      },
    ],
  },
  {
    title: "Q4",
    steps: [
      { description: "", status: StepStatus.upcoming },
      { description: "", status: StepStatus.upcoming },
      { description: "", status: StepStatus.upcoming },
      { description: "", status: StepStatus.upcoming },
    ],
  },
];
