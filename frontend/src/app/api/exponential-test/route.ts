import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const EXPONENTIAL_API_URL = process.env.NEXT_PUBLIC_EXPONENTIAL_API_URL || 'https://api.exponential.fi/api/pool-risk/search';
  const EXPONENTIAL_API_KEY = process.env.NEXT_PUBLIC_EXPONENTIAL_API_KEY;

  if (!EXPONENTIAL_API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  // Test the Aave USDT BNB vault that's currently being debugged
  const testRequest = {
    token_address: '0xf42f5795D9ac7e9D757dB633D693cD548Cfd9169', // aBnbUSDT pool token
    blockchain: 'ethereum',
    protocol: 'fluid',
  };

  //  // Fluid USDC (Base)
  // // Amana vault id (from subgraph mapping.ts): 0x5cd6e196ca1d85b8edfdf162d3a0c77268f42c69
  // // Exponential Fluid USDC pool token: 0xf42f5795D9ac7e9D757dB633D693cD548Cfd9169
  // '0x5cd6e196ca1d85b8edfdf162d3a0c77268f42c69': {
  //   poolToken: '0xf42f5795D9ac7e9D757dB633D693cD548Cfd9169',
  //   protocol: 'fluid',
  //   blockchain: 'ethereum', // Base L2
  // },
  
  // // Aave USDT (BNB)
  // // Amana vault id: 0xe5fa0e4ba13d516908c5313b3375b7ede24bfe7a
  // '0xe5fa0e4ba13d516908c5313b3375b7ede24bfe7a': {
  //   poolToken: '0xa9251ca9DE909CB71783723713B21E4233fbf1B1', 
  //   protocol: 'aave',
  //   blockchain: 'bsc',
  // },

  // // ZeroLend USDC (Base)
  // // Amana vault id: 0x0f6514e3e4760efc8f34fc67a05c4987367af14e
  // '0x0f6514e3e4760efc8f34fc67a05c4987367af14e': {
  //   poolToken: '0xd09600475435CaB0E40DabDb161Fb5A3311EFcB3',
  //   protocol: 'zerolend',
  //   blockchain: 'base',
  // },

  // // Compound USDT (Polygon)
  // // Amana vault id: 0x622e956626cc6aba655e3d92a3629b04cb038e80
  // '0x622e956626cc6aba655e3d92a3629b04cb038e80': {
  //   poolToken: '0xaeB318360f27748Acb200CE616E389A6C9409a07',
  //   protocol: 'compound',
  //   blockchain: 'polygon',
  // },

  // // Curve-Convex msETH/WETH (Ethereum)
  // // Amana vault id: 0xf4fa4d8115e78acf52308fdbad10a5f9042991de
  // '0xf4fa4d8115e78acf52308fdbad10a5f9042991de': {
  //   poolToken: '0xa4c567c662349BeC3D0fB94C4e7f85bA95E208e4',
  //   protocol: 'convex',
  //   blockchain: 'ethereum',
  // },

  // // Curve-Convex eUSD/USDC (Arbitrum)
  // // Amana vault id: 0x32fecdef376e2ad74c53663bde933116c09408f3
  // '0x32fecdef376e2ad74c53663bde933116c09408f3': {
  //   poolToken: '0x93a416206B4ae3204cFE539edfeE6BC05a62963e',
  //   protocol: 'convex',
  //   blockchain: 'arbitrum',
  // },

  // // Curve-Convex USDT/USDe (Ethereum)
  // // Amana vault id: 0x0552d4c51491d9bfed97eb795e101e90a5f16d44
  // '0x0552d4c51491d9bfed97eb795e101e90a5f16d44': {
  //   poolToken: '0x5B03CcCAb7BA3010fA5CAd23746cbf0794938e96',
  //   protocol: 'convex',
  //   blockchain: 'ethereum',
  // },

     // Aegis YUSD (BNB)
  // Amana vault id: 0x4cb4dfc521a5c44817a1fda79fb7eafaf6f1952e
  // '0x4cb4dfc521a5c44817a1fda79fb7eafaf6f1952e': {
  //   poolToken: '0xAB3dBcD9B096C3fF76275038bf58eAC10D22C61f',
  //   protocol: 'aegis',
  //   blockchain: 'bsc',
  // },

  // // Convex cbBTC (Ethereum)
  // // Amana vault id: 0x5e3adc840b55fe0b99c0418ac69113e1f0296992
  // '0x5e3adc840b55fe0b99c0418ac69113e1f0296992': {
  //   poolToken: '0xFfF8634dE89271b6075C55FA89B4E9A087Fdb9FE',
  //   protocol: 'convex',
  //   blockchain: 'ethereum',
  // },

  // Noon Staked USN (sUSN) (Ethereum)
  // Amana vault id: 0x8426929d568b1cbc281f5787556f84c5b101399d
  // '0x8426929d568b1cbc281f5787556f84c5b101399d': {
  //   poolToken: '0xE24a3DC889621612422A64E6388927901608B91D',
  //   protocol: 'noon',
  //   blockchain: 'ethereum',
  // },

  //   // Convex USDf (Ethereum)
  // // Amana vault id: 0xe501cbd03fa739273f49a8b54dd49de1248101f6
  // '0xe501cbd03fa739273f49a8b54dd49de1248101f6': {
  //   poolToken: '0x72310DAAed61321b02B08A547150c07522c6a976',
  //   protocol: 'convex',
  //   blockchain: 'ethereum',
  // },

  // // WETH Compound (Base)
  // // Amana vault id: 0xe256f20037aa74cc213e532d49fcb932a5d764d3
  // '0xe256f20037aa74cc213e532d49fcb932a5d764d3': {
  //   poolToken: '0x46e6b214b524310239732D51387075E0e70970bf',
  //   protocol: 'compound',
  //   blockchain: 'base',
  // },

  // // USDS Compound (Base)
  // // Amana vault id: 0x0f97ff46faea697c088b0d3d722d3838f29f9efc
  // '0x0f97ff46faea697c088b0d3d722d3838f29f9efc': {
  //   poolToken: '0x2c776041CCFe903071AF44aa147368a9c8EEA518',
  //   protocol: 'compound',
  //   blockchain: 'base',
  // },

  // // USDC Compound (Base)
  // // Amana vault id: 0x8a4cd74d6b0f2c0f8785d989c433db84b293b86f
  // '0x8a4cd74d6b0f2c0f8785d989c433db84b293b86f': {
  //   poolToken: '0xb125E6687d4313864e53df431d5425969c15Eb2F',
  //   protocol: 'compound',
  //   blockchain: 'base',
  // },

  console.log('[Exponential Test] Making request:', testRequest);

  try {
    const response = await fetch(EXPONENTIAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': EXPONENTIAL_API_KEY,
      },
      body: JSON.stringify(testRequest),
    });

    console.log('[Exponential Test] Response status:', response.status);
    console.log('[Exponential Test] Response headers:', Object.fromEntries(response.headers.entries()));

    const data = await response.text();
    console.log('[Exponential Test] Raw response:', data);

    let jsonData;
    try {
      jsonData = JSON.parse(data);
    } catch (e) {
      console.log('[Exponential Test] Failed to parse JSON:', e);
      return NextResponse.json({ 
        error: 'Invalid JSON response',
        rawResponse: data,
        status: response.status 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      status: response.status,
      data: jsonData,
      request: testRequest,
    });

  } catch (error) {
    console.error('[Exponential Test] Error:', error);
    return NextResponse.json({ 
      error: 'Request failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      request: testRequest,
    }, { status: 500 });
  }
}
