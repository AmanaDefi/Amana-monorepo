import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { VaultData } from '@/types/types';
import { formatNumberWithSuffix, formatTokenBalance } from '@/utils/utils';

// Simple skeleton loader
const Skeleton = ({ width = 60, height = 20 }) => (
  <div style={{ width, height }} className="bg-gray-700 animate-pulse rounded" />
);

interface VaultCardProps {
  vault: VaultData;
  userVaultBalance?: string | number;
  apy?: number;
  tvl?: number;
}

const VaultCard: React.FC<VaultCardProps> = ({ vault, userVaultBalance, apy, tvl }) => {
  const router = useRouter();

  // Always show skeleton for at least 300ms
  const [showSkeleton, setShowSkeleton] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setShowSkeleton(false), 300);
    return () => clearTimeout(timer);
  }, []);

  // Use the real userVaultBalance, fallback to 0 if undefined/null
  const displayUserBalance = userVaultBalance !== undefined && userVaultBalance !== null ? userVaultBalance : 0;
  const displayAPY = apy !== undefined && apy !== null ? apy : 0;
  const displayTVL = tvl !== undefined && tvl !== null ? tvl : 0;

  return (
    <div className="bg-customNeutral200 rounded-lg overflow-hidden border border-customNeutral100 hover:border-cyan-400 transition-all cursor-pointer" onClick={() => router.push(`/vaults/${vault.id}`)}>
      {/* Card Header */}
      <div className="flex justify-between items-center p-3 bg-customNeutral300 border-b border-customNeutral100">
        <div className="flex items-center gap-2 ml-[10px]">
          <Image src={vault.protocol.imgURL || ''} alt={vault.protocol.name} width={24} height={24} className="rounded-full" />
          <div className="flex items-center">
            <span className="text-gray-400 md:block hidden">Protocol:</span>
            <span className="text-white font-medium md:ml-1">{vault.protocol.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 mr-[10px]">
          <span className="text-gray-400 text-xs">Chain:</span>
          <span className="text-white text-xs">{vault.protocol.network}</span>
        </div>
      </div>
      {/* Card Content */}
      <div className="p-4">
        <div className='flex md:flex-row flex-col gap-2 justify-between'>
          {/* Lending Pool with Logo */}
          <div className="flex items-center gap-3 mb-3 p-2 rounded-md">
            <Image src={vault.inputToken.imgURL} alt={vault.inputToken.symbol} width={36} height={36} className="rounded-full" sizes="36px" />
            <div>
              <span className="text-gray-400 text-xs">Lending Pool</span>
              <p className="text-white font-medium">{vault.name}</p>
            </div>
          </div>
          {/* Chain with Logo */}
          <div className="flex items-center gap-3 mb-3 p-2 rounded-md">
            <Image src={vault.imgURL || ''} alt={vault.protocol.network} width={36} height={36} className="rounded-full" sizes="36px" />
            <div>
              <span className="text-gray-400 text-xs">Chain</span>
              <h3 className="text-white font-bold">{vault.protocol.network}</h3>
            </div>
          </div>
        </div>
        {/* APY and TVL */}
        <div className="grid grid-cols-2 gap-2 p-3">
          <div className="bg-customNeutral300 p-3 rounded-md">
            <p className="text-gray-400 text-xs mb-1">APY (7d)</p>
            <p className="text-cyan-400 font-bold text-xl">
              {(showSkeleton) ? <Skeleton width={50} /> : `${(displayAPY * 100).toFixed(2)}%`}
            </p>
          </div>
          <div className="bg-customNeutral300 p-3 rounded-md">
            <p className="text-gray-400 text-xs mb-1">TVL</p>
            <p className="text-white font-bold text-xl">
              {(showSkeleton) ? <Skeleton width={80} /> : formatNumberWithSuffix(displayTVL)}
            </p>
          </div>
        </div>
        {/* User Deposits */}
        <div className="mb-4">
          <div className="mt-2 px-3">
            <div className="flex justify-around text-[16px] mb-1">
              <span className="text-gray-400">Your Deposits:</span>
              <span className="text-white font-medium">
                {(showSkeleton) ? <Skeleton width={60} /> : `${formatTokenBalance(displayUserBalance, vault.inputToken.symbol)} ${vault.inputToken.symbol}`}
              </span>
            </div>
          </div>
        </div>
        {/* Buttons */}
        <div className="flex gap-2">
          <button 
            className="flex-1 fluid-hover-button text-white py-2 px-4 rounded-md transition-all"
            onClick={e => { e.stopPropagation(); router.push(`/vaults/${vault.id}?tab=deposit`); }}
          >
            <span className="relative z-2">Deposit</span>
          </button>
          {(!showSkeleton && Number(displayUserBalance) > 0) && (
            <button 
              className="flex-1 border border-customNeutral100 hover:border-cyan-400 text-white py-2 px-4 rounded-md transition-all"
              onClick={e => { e.stopPropagation(); router.push(`/vaults/${vault.id}?tab=withdraw`); }}
            >
              Withdraw
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VaultCard; 