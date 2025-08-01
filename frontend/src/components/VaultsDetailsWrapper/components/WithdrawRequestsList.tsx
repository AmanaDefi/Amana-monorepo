import React, { useEffect, useState, useMemo } from "react";
import ElephantLoader from "@/components/ElephantLoader";
import { VaultData } from "@/types/types";
import { parseAbi } from "viem";
import { getPublicClient } from "@/utils/getPublicClient";

const NOON_CAPITAL_CONTRACT = "0x0DaBc0D9B270c9B0C4C77AaCeAa712b56D0F9178";

const withdrawalRequestsAbi = parseAbi([
  "function withdrawalRequests(address,uint256) view returns (uint256 amount, uint256 timestamp, bool claimed)"
]);
const getUserNextRequestIdAbi = parseAbi([
  "function getUserNextRequestId(address) view returns (uint256)"
]);

async function getUserNextRequestId(address: string, chainId: number): Promise<number> {
  try {
    const publicClient = getPublicClient(chainId);
    if (!publicClient) return 0;
    const result = await publicClient.readContract({
      address: NOON_CAPITAL_CONTRACT,
      abi: getUserNextRequestIdAbi,
      functionName: "getUserNextRequestId",
      args: [address],
    });
    return Number(result);
  } catch (e) {
    return 0;
  }
}

async function withdrawalRequests(address: string, idx: number, chainId: number): Promise<{ amount: bigint, timestamp: bigint, claimed: boolean }> {
  try {
    const publicClient = getPublicClient(chainId);
    if (!publicClient) return { amount: 0n, timestamp: 0n, claimed: false };
    const [amount, timestamp, claimed] = await publicClient.readContract({
      address: NOON_CAPITAL_CONTRACT,
      abi: withdrawalRequestsAbi,
      functionName: "withdrawalRequests",
      args: [address, BigInt(idx)],
    }) as [bigint, bigint, boolean];
    return { amount, timestamp, claimed };
  } catch (e) {
    return { amount: 0n, timestamp: 0n, claimed: false };
  }
}

function formatDateTime(ts: number) {
  const d = new Date(ts * 1000);
  return d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", hour12: false, timeZone: "UTC" });
}

function formatCountdown(target: number) {
  const now = Math.floor(Date.now() / 1000);
  let diff = target - now;
  if (diff < 0) diff = 0;
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const mins = Math.floor((diff % 3600) / 60);
  const secs = diff % 60;
  return `${days.toString().padStart(2, "0")}:${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

const PAGE_SIZE = 5;

const WithdrawRequestsList: React.FC<{
  userAddress: string;
  vault: VaultData;
  availableBalance: string | number;
  onTabChange: (tab: string) => void;
}> = ({ userAddress, vault, availableBalance, onTabChange }) => {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const chainId = vault?.protocol?.chainId;

  useEffect(() => {
    let mounted = true;
    async function fetchRequests() {
      setLoading(true);
      try {
        const n = await getUserNextRequestId(userAddress, chainId);
        const reqs = [];
        for (let i = 0; i < n; i++) {
          const req = await withdrawalRequests(userAddress, i, chainId);
          if (!req.claimed) reqs.push({ ...req, idx: i });
        }
        if (mounted) setRequests(reqs);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    if (userAddress && chainId) fetchRequests();
    return () => { mounted = false; };
  }, [userAddress, chainId]);

  // Pagination
  const pagedRequests = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return requests.slice(start, start + PAGE_SIZE);
  }, [requests, page]);
  const totalPages = Math.ceil(requests.length / PAGE_SIZE);

  // Empty state logic
  const showInvest = Number(availableBalance) === 0;
  const showUnstake = Number(availableBalance) > 0;

  if (loading) {
    return <div className="flex flex-col items-center justify-center py-12"><ElephantLoader isLoading={true} /></div>;
  }

  if (!requests.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <img src="/elephant.gif" alt="Elephant" width={80} height={80} className="mb-4" />
        <div className="text-lg text-white mb-2 text-center">Your Investment is earning a great yield, Still want to withdraw?</div>
        <div className="flex gap-4 mt-4">
          {showInvest && <button className="px-6 py-2 rounded-lg bg-blue-600 text-white" onClick={() => onTabChange("Invest")}>Invest</button>}
          {showUnstake && <button className="px-6 py-2 rounded-lg bg-gray-700 text-white" onClick={() => onTabChange("Unstake")}>Unstake</button>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {pagedRequests.map((req, idx) => {
        const amount = Number(req.amount) / 1e18; // TODO: adjust decimals
        const timestamp = Number(req.timestamp);
        const cooldownEnd = timestamp + 7 * 24 * 3600;
        const now = Math.floor(Date.now() / 1000);
        const canClaim = now >= cooldownEnd && !req.claimed;
        return (
          <div key={req.idx} className="bg-[#181C23] rounded-xl p-6 flex flex-col gap-2 border border-[#232A36] max-w-xl mx-auto">
            <div className="flex items-center justify-between text-white text-base font-medium">
              <span>Withdrawal of <span className="font-bold">{amount.toFixed(3)} sUSN</span> ($5)</span>
              <span className="text-xs text-gray-400">#{req.idx + 1}</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-gray-400 text-xs">{formatDateTime(timestamp)}</span>
              <span className="text-gray-400 text-xs">UTC</span>
            </div>
            <div className="flex flex-col items-center mt-2">
              {!canClaim ? (
                <>
                  <div className="text-2xl font-mono text-blue-400">{formatCountdown(cooldownEnd)}</div>
                  <button className="mt-2 px-4 py-2 rounded bg-gray-700 text-gray-300 cursor-not-allowed" disabled>Withdrawal Locked Until Cooldown Period</button>
                </>
              ) : (
                <button className="mt-2 px-4 py-2 rounded bg-blue-600 text-white font-semibold" onClick={() => {/* TODO: claim logic */}}>Claim</button>
              )}
            </div>
          </div>
        );
      })}
      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button className="px-3 py-1 rounded bg-gray-700 text-white" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>&lt;</button>
          <span className="text-white">Page {page} of {totalPages}</span>
          <button className="px-3 py-1 rounded bg-gray-700 text-white" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>&gt;</button>
        </div>
      )}
    </div>
  );
};

export default WithdrawRequestsList;