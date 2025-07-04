export interface Transaction {
  id: string;
  type: "received" | "sent";
  amount: string;
  token: string;
  from: string;
  to?: string;
  timestamp: string;
  status: "completed" | "pending" | "failed";
}

export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: "1",
    type: "received",
    amount: "0.00",
    token: "Z",
    from: "x0667a6faf0a41aa843a78cb4c4aaeef",
    timestamp: "6:00 pm",
    status: "completed",
  },
  {
    id: "2",
    type: "received",
    amount: "0.00",
    token: "Z",
    from: "x0667a6faf0a41aa843a78cb4c4aaeef",
    timestamp: "6:00 pm",
    status: "completed",
  },
  {
    id: "3",
    type: "received",
    amount: "0.00",
    token: "Z",
    from: "x0667a6faf0a41aa843a78cb4c4aaeef",
    timestamp: "6:00 pm",
    status: "completed",
  },
  {
    id: "4",
    type: "received",
    amount: "0.00",
    token: "Z",
    from: "x0667a6faf0a41aa843a78cb4c4aaeef",
    timestamp: "6:00 pm",
    status: "completed",
  },
];
