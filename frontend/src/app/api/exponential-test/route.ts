import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Test request for Aave USDT BNB vault
    const testRequest = {
      token_address: '0xa9251ca9DE909CB71783723713B21E4233fbf1B1', // aBnbUSDT
      blockchain: 'bsc',
      protocol: 'aave',
    };

    console.log('[Test API] Making request:', testRequest);

    const response = await fetch('https://api.exponential.fi/v1/risk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.EXPONENTIAL_API_KEY}`,
      },
      body: JSON.stringify(testRequest),
    });

    const data = await response.json();
    
    console.log('[Test API] Response status:', response.status);
    console.log('[Test API] Response data:', JSON.stringify(data, null, 2));

    return NextResponse.json({
      success: true,
      status: response.status,
      data,
      request: testRequest,
    });
  } catch (error) {
    console.error('[Test API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// Add a POST endpoint to reset cache and cooldown
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    if (action === 'reset') {
      // Clear localStorage cache
      console.log('[Test API] Resetting cache and cooldown');
      
      return NextResponse.json({
        success: true,
        message: 'Cache and cooldown reset. Please refresh the page.',
        instructions: [
          '1. Open browser console',
          '2. Run: localStorage.removeItem("exponential_risk_ratings_cache")',
          '3. Refresh the page',
        ]
      });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Invalid action. Use "reset" to clear cache.',
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
