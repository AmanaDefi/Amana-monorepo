"use client";

import React, { useState, useEffect } from 'react';
import { useMultiChain } from '@/providers/MultiChainProvider';
import { useTemporaryBitcoinWallet } from '@/hooks/useBitcoinWallet';
import { CHAIN_ID } from '@/constants/chainConfig';
import dynamic from 'next/dynamic';

const BitcoinConnectionTestDynamic: any = dynamic(() => import('./BitcoinConnectionTest').then(mod => mod.default), { ssr: false });
export default BitcoinConnectionTestDynamic; 