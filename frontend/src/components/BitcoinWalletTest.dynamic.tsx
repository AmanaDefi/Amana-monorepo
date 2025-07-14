import dynamic from 'next/dynamic';
const BitcoinWalletTestDynamic = dynamic(() => import('./BitcoinWalletTest'), { ssr: false });
export default BitcoinWalletTestDynamic; 