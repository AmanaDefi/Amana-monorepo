import Accordion from '@/components/common/Accordion';
import { VaultData } from '@/types/types';
import Link from 'next/link';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/solid';
import { CHAINS_EXPLORER_BASE_URL_MAINNET } from '@/constants/chainConfig';

interface InformationProps {
  vaultData: VaultData;
  vaultDescription?: string;
  protocolDescription?: string;
  chainDescription?: string;
}

export default function Information({
  vaultData,
  vaultDescription,
  protocolDescription,
  chainDescription
}: InformationProps) {
  const vaultExplorerBaseUrl = CHAINS_EXPLORER_BASE_URL_MAINNET[7000];
  const strategyExplorerBaseUrl = CHAINS_EXPLORER_BASE_URL_MAINNET[vaultData.protocol.chainId] || "";

  return (
    <div className="mt-4">
      <div className="space-y-0">
        <Accordion title={vaultData.name} defaultOpen={true}>
          {vaultDescription || vaultData.des}
        </Accordion>
        
        <Accordion title={vaultData.protocol.name}>
          {protocolDescription || vaultData.protocol.des}
        </Accordion>
        
        <Accordion title={vaultData.protocol.network}>
          {chainDescription || vaultData.protocol.netdes}
        </Accordion>

        <Accordion title="Addresses">
          <div className="space-y-4">
            <div>
              <p className="text-white font-bold mb-1">Vault Address</p>
              <Link href={`${vaultExplorerBaseUrl}/address/${vaultData.id}`}
                className='flex items-center gap-1 group text-white underline-offset-2 hover:underline'
                target='_blank' rel="noopener noreferrer">
                <p className="font-normal text-sm">{vaultData.id}</p>
                <ArrowTopRightOnSquareIcon width='16' height='16' className='size-4' />
              </Link>
            </div>
            
            <div>
              <p className="text-white font-bold mb-1">Strategy Address</p>
              <Link href={`${strategyExplorerBaseUrl}/address/${vaultData.protocol.strategyAddress}`}
                className='flex items-center gap-1 group text-white underline-offset-2 hover:underline'
                target='_blank' rel="noopener noreferrer">
                <p className="font-normal text-sm">{vaultData.protocol.strategyAddress}</p>
                <ArrowTopRightOnSquareIcon width='16' height='16' className='size-4' />
              </Link>
            </div>
            
            <div>
              <p className="text-white font-bold mb-1">Input Token</p>
              <p className="text-white font-normal text-sm">{vaultData.inputToken.symbol}</p>
            </div>
          </div>
        </Accordion>
      </div>
    </div>
  );
} 