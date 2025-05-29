import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  VaultData, 
  VaultAPY, 
  VaultTotalAssets, 
  VaultTotalAssetsinToken, 
  UserVaultBalance 
} from '@/types/types';
import { formatNumberWithSuffix, getOnlyTokenSymbol, formatBalance, formatTokenBalance } from '@/utils/utils';
import LoadingLogo from './LoadingLogo';
import VaultCard from './VaultCard';
// import VaultCard from './VaultCard';
// import { formatTokenBalance } from '@/utils/utils';

// Risk levels mapping
const RISK_LEVELS: Record<number, { level: string; color: string }> = {
  1: { level: 'Low', color: 'bg-green-500' },
  2: { level: 'Medium', color: 'bg-yellow-500' },
  3: { level: 'High', color: 'bg-red-500' },
};

// Calculate risk level based on protocol (this is just an example, you'd want to use real risk metrics)
const calculateRiskLevel = (vault: VaultData): number => {
  // Temporarily setting all vaults to low risk (1) until proper risk calculation is implemented
  return 1;
};

// Generate a deterministic capacity percentage based on vault ID
// This ensures consistent values across renders but is still just mock data
const calculateCapacityPercentage = (vaultId: string): number => {
  // Use the last 2 characters of the ID to generate a number between 0-99
  const lastTwoChars = vaultId.slice(-2);
  // Convert hex to decimal and cap at 95%
  const decimal = parseInt(lastTwoChars, 16) % 96;
  // Ensure a minimum of 30%
  return Math.max(30, decimal);
};

interface VaultsGridProps {
  vaults: VaultData[];
  vaultAPYs: VaultAPY[];
  userVaultBalances: UserVaultBalance[];
  vaultTotalAssets: VaultTotalAssets[];
  vaultTotalAssetsinToken: VaultTotalAssetsinToken[];
}

const VaultsGrid: React.FC<VaultsGridProps> = ({
  vaults,
  vaultAPYs,
  userVaultBalances,
  vaultTotalAssets,
  vaultTotalAssetsinToken,
}) => {
  const router = useRouter();
  const filterRef = useRef<HTMLDivElement>(null);
  
  // State for filters and sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [chainFilter, setChainFilter] = useState<string>('');
  const [protocolFilter, setProtocolFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('apy');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const itemsPerPage = 6;
  
  // Extract unique chains and protocols for filters
  const chains = useMemo(() => {
    return Array.from(new Set(vaults.map(vault => vault.protocol.network)));
  }, [vaults]);
  
  const protocols = useMemo(() => {
    return Array.from(new Set(vaults.map(vault => vault.protocol.name)));
  }, [vaults]);
  
  // Filter vaults based on search, chain, and protocol
  const filteredVaults = useMemo(() => {
    return vaults.filter(vault => {
      const matchesSearch = searchTerm === '' || 
        vault.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vault.protocol.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vault.protocol.network.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesChain = chainFilter === '' || vault.protocol.network === chainFilter;
      const matchesProtocol = protocolFilter === '' || vault.protocol.name === protocolFilter;
      
      return matchesSearch && matchesChain && matchesProtocol;
    });
  }, [vaults, searchTerm, chainFilter, protocolFilter]);
  
  // Sort vaults based on selected criteria
  const sortedVaults = useMemo(() => {
    return [...filteredVaults].sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'apy':
          aValue = Number(vaultAPYs.find(apy => apy.vaultId === a.id)?.APY7d || 0);
          bValue = Number(vaultAPYs.find(apy => apy.vaultId === b.id)?.APY7d || 0);
          break;
        case 'tvl':
          aValue = Number(vaultTotalAssets.find(asset => asset.vaultId === a.id)?.totalAssets || 0);
          bValue = Number(vaultTotalAssets.find(asset => asset.vaultId === b.id)?.totalAssets || 0);
          break;
        case 'risk':
          aValue = calculateRiskLevel(a);
          bValue = calculateRiskLevel(b);
          break;
        default:
          return 0;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [filteredVaults, sortBy, sortOrder, vaultAPYs, vaultTotalAssets]);
  
  // Pagination logic
  const paginatedVaults = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedVaults.slice(startIndex, endIndex);
  }, [sortedVaults, currentPage, itemsPerPage]);
  
  const totalPages = Math.ceil(sortedVaults.length / itemsPerPage);
  
  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, chainFilter, protocolFilter, sortBy, sortOrder]);
  
  // Handle clicks outside the filter dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowMobileFilters(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  const handleVaultClick = (vaultId: string) => {
    router.push(`/vaults/${vaultId}`);
  };
  
  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };
  
  const clearAllFilters = () => {
    setSearchTerm('');
    setChainFilter('');
    setProtocolFilter('');
    setSortBy('apy');
    setSortOrder('desc');
  };
  
  // Show spinner for 500ms on mount, then always show vaults
  const [showGrid, setShowGrid] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShowGrid(true), 300);
    return () => clearTimeout(timer);
  }, []);
  
  if (!showGrid) {
    return <LoadingLogo />;
  }
  
  return (
    <div className="w-full">
      {/* Mobile Filter Button */}
      <div className="md:hidden mb-4">
        <button 
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className="w-full p-3 bg-customNeutral200 text-white rounded-lg flex justify-between items-center"
        >
          <span>Filter & Sort Vaults</span>
          <span>{showMobileFilters ? '↑' : '↓'}</span>
        </button>
      </div>
      
      {/* Filters and Sort Section */}
      <div 
        ref={filterRef}
        className={`bg-customNeutral200 p-4 rounded-lg mb-6 ${showMobileFilters ? 'block' : 'hidden md:block'}`}
      >
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search vaults..."
              className="w-full p-2 rounded-md bg-customNeutral300 text-white border border-customNeutral100 focus:border-cyan-400 focus:outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              className="p-2 rounded-md bg-customNeutral300 text-white border border-customNeutral100 focus:border-cyan-400 focus:outline-none"
              value={chainFilter}
              onChange={(e) => setChainFilter(e.target.value)}
            >
              <option value="">All Chains</option>
              {chains.map((chain) => (
                <option key={chain} value={chain}>
                  {chain}
                </option>
              ))}
            </select>
            <select
              className="p-2 rounded-md bg-customNeutral300 text-white border border-customNeutral100 focus:border-cyan-400 focus:outline-none"
              value={protocolFilter}
              onChange={(e) => setProtocolFilter(e.target.value)}
            >
              <option value="">All Protocols</option>
              {protocols.map((protocol) => (
                <option key={protocol} value={protocol}>
                  {protocol}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-2">
          <div className="text-white mr-2 flex items-center">Sort by:</div>
          {['apy', 'tvl', 'risk'].map((option) => (
            <button
              key={option}
              onClick={() => {
                if (sortBy === option) {
                  toggleSortOrder();
                } else {
                  setSortBy(option);
                  setSortOrder('desc');
                }
              }}
              className={`px-3 py-1 rounded-md text-sm flex items-center gap-1 ${
                sortBy === option
                  ? 'bg-gradient-to-r from-[#262830] to-[#06afbc] text-white'
                  : 'bg-customNeutral300 text-white'
              }`}
            >
              {option.toUpperCase()}
              {sortBy === option && (
                <span className="ml-1">
                  {sortOrder === 'desc' ? '↓' : '↑'}
                </span>
              )}
            </button>
          ))}
        </div>
        
        {/* Active filters display and clear button */}
        {(searchTerm || chainFilter || protocolFilter) && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-customNeutral100">
            <div className="text-white mr-2 flex items-center text-sm">Active filters:</div>
            {searchTerm && (
              <div className="px-2 py-1 bg-customNeutral300 rounded-md text-xs text-white flex items-center gap-1">
                <span>Search: {searchTerm}</span>
                <button onClick={() => setSearchTerm('')} className="ml-1 text-gray-400 hover:text-white">✕</button>
              </div>
            )}
            {chainFilter && (
              <div className="px-2 py-1 bg-customNeutral300 rounded-md text-xs text-white flex items-center gap-1">
                <span>Chain: {chainFilter}</span>
                <button onClick={() => setChainFilter('')} className="ml-1 text-gray-400 hover:text-white">✕</button>
              </div>
            )}
            {protocolFilter && (
              <div className="px-2 py-1 bg-customNeutral300 rounded-md text-xs text-white flex items-center gap-1">
                <span>Protocol: {protocolFilter}</span>
                <button onClick={() => setProtocolFilter('')} className="ml-1 text-gray-400 hover:text-white">✕</button>
              </div>
            )}
            <button
              onClick={clearAllFilters}
              className="px-2 py-1 text-xs text-cyan-400 hover:text-cyan-300"
            >
              Clear all
            </button>
          </div>
        )}
      </div>
      
      {/* Results count */}
      <div className="text-gray-400 mb-4 text-sm">
        Showing {paginatedVaults.length} of {filteredVaults.length} vaults
      </div>
      
      {/* Vaults Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {paginatedVaults.map((vault) => {
          const userBalance = userVaultBalances.find(b => b.vaultId === vault.id)?.balance;
          const apyRaw = vaultAPYs.find(a => a.vaultId === vault.id)?.APY7d;
          const tvlRaw = vaultTotalAssets.find(t => t.vaultId === vault.id)?.totalAssets;
          const apy = typeof apyRaw === 'string' ? parseFloat(apyRaw) || 0 : apyRaw || 0;
          const tvl = typeof tvlRaw === 'string' ? parseFloat(tvlRaw) || 0 : tvlRaw || 0;
          console.log(`Vault: ${vault.name} (${vault.id}) - User Balance:`, userBalance);
          return (
            <VaultCard key={vault.id} vault={vault} userVaultBalance={userBalance} apy={apy} tvl={tvl} />
          );
        })}
      </div>
      
      {/* Empty State */}
      {paginatedVaults.length === 0 && (
        <div className="text-center py-12 bg-customNeutral200 rounded-lg">
          <p className="text-white text-lg">No vaults found matching your filters</p>
          <button 
            onClick={clearAllFilters}
            className="mt-4 fluid-hover-button text-white py-2 px-4 rounded-md"
          >
            <span className="relative z-2">Clear Filters</span>
          </button>
        </div>
      )}
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded-md ${
                currentPage === 1
                  ? 'bg-customNeutral300 text-gray-500 cursor-not-allowed'
                  : 'bg-customNeutral300 text-white hover:bg-customNeutral100'
              }`}
            >
              ←
            </button>
            
            {Array.from({ length: totalPages }).map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPage(index + 1)}
                className={`px-3 py-1 rounded-md ${
                  currentPage === index + 1
                    ? 'bg-gradient-to-r from-[#262830] to-[#06afbc] text-white'
                    : 'bg-customNeutral300 text-white hover:bg-customNeutral100'
                }`}
              >
                {index + 1}
              </button>
            ))}
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`px-3 py-1 rounded-md ${
                currentPage === totalPages
                  ? 'bg-customNeutral300 text-gray-500 cursor-not-allowed'
                  : 'bg-customNeutral300 text-white hover:bg-customNeutral100'
              }`}
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VaultsGrid; 