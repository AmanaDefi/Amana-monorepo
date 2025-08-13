import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const EXPONENTIAL_API_URL = process.env.NEXT_PUBLIC_EXPONENTIAL_API_URL || 'https://api.exponential.fi/api/pool-risk/search';
  const EXPONENTIAL_API_KEY = process.env.NEXT_PUBLIC_EXPONENTIAL_API_KEY;

  if (!EXPONENTIAL_API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  // Test the Aave USDT BNB vault that's currently being debugged
  const testRequest = {
    token_address: '0xa9251ca9DE909CB71783723713B21E4233fbf1B1', // aBnbUSDT pool token
    blockchain: 'bsc',
    protocol: 'aave',
  };

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
