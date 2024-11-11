import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Amana",
  description: "Amana Yield Aggregator",
};

export default function RootLayoutServer({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
