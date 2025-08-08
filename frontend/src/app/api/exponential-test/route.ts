import { NextRequest, NextResponse } from 'next/server';

// Simple debug route to verify Exponential API integration for a single known vault
// Vault: Fluid USDC (Base)
// - Vault (pool token) address (id in subgraph): 0x5cd6e196ca1d85b8edfdf162d3a0c77268f42c69
// - Underlying USDC (Base): 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
// - Protocol: fluid
// - Blockchain mapping used by app: Base -> 'ethereum'

export async function GET(_req: NextRequest) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_EXPONENTIAL_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing NEXT_PUBLIC_EXPONENTIAL_API_KEY' },
        { status: 500 }
      );
    }

    const requestBody = {
      blockchain: 'ethereum',
      token_address: '0x5cd6e196ca1d85b8edfdf162d3a0c77268f42c69',
      protocol: 'fluid',
      assets: ['0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'],
    } as const;

    const res = await fetch('https://api.exponential.fi/api/pool-risk/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify(requestBody),
      // Next automatically disables compression headers that browsers refuse
    });

    const contentType = res.headers.get('content-type') || '';
    const responseBody = contentType.includes('application/json')
      ? await res.json()
      : await res.text();

    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      request: requestBody,
      response: responseBody,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Unexpected error' },
      { status: 500 }
    );
  }
}
