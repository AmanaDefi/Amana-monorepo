import dynamic from 'next/dynamic';
const BitcoinIntegrationTestDynamic = dynamic(() => import('./BitcoinIntegrationTest'), { ssr: false });
export default BitcoinIntegrationTestDynamic; 