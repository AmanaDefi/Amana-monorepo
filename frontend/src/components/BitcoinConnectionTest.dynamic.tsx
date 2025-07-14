import dynamic from 'next/dynamic';
const BitcoinConnectionTestDynamic = dynamic(() => import('./BitcoinConnectionTest'), { ssr: false });
export default BitcoinConnectionTestDynamic; 