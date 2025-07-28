import React from 'react';
import { hasExternalTVLData } from '@/utils/tvlData';
import { hasDefiLlamaData } from '@/utils/defillama';
import { isNoonCapitalVault } from '@/utils/noonCapital';

interface ExternalTVLTestProps {
  vaultIds: string[];
}

export const ExternalTVLTest: React.FC<ExternalTVLTestProps> = ({ vaultIds }) => {
  const vaultsWithExternalData = vaultIds.filter(vaultId => hasExternalTVLData(vaultId));
  const vaultsWithDefiLlama = vaultIds.filter(vaultId => hasDefiLlamaData(vaultId));
  const vaultsWithNoonCapital = vaultIds.filter(vaultId => isNoonCapitalVault(vaultId));

  return (
    <div className="p-4 bg-gray-800 rounded-lg mb-4">
      <h3 className="text-white font-bold mb-2">External TVL Data Test</h3>
      <div className="text-sm text-gray-300">
        <p>Total vaults: {vaultIds.length}</p>
        <p>Vaults with external TVL data: {vaultsWithExternalData.length}</p>
        <p>Vaults with DefiLlama data: {vaultsWithDefiLlama.length}</p>
        <p>Vaults with Noon Capital data: {vaultsWithNoonCapital.length}</p>
        
        {vaultsWithExternalData.length > 0 && (
          <div className="mt-2">
            <p className="font-semibold">Vaults with external TVL data:</p>
            <ul className="list-disc list-inside">
              {vaultsWithExternalData.map(vaultId => (
                <li key={vaultId} className="text-xs">
                  {vaultId}
                  {hasDefiLlamaData(vaultId) && <span className="text-blue-400"> (DefiLlama)</span>}
                  {isNoonCapitalVault(vaultId) && <span className="text-green-400"> (Noon Capital)</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}; 