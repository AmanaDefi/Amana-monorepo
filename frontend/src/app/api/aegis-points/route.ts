import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('user_address');
    
    if (!userAddress) {
      return NextResponse.json(
        { error: 'user_address is required' },
        { status: 400 }
      );
    }

    // TODO: Add your Fuul API Bearer token here
    const FUUL_API_TOKEN = process.env.FUUL_API_TOKEN;
    
    if (!FUUL_API_TOKEN) {
      return NextResponse.json(
        { 
          success: true,
          totalPoints: 0,
          isConfigError: true,
          message: 'API not configured'
        }
      );
    }

    const url = `https://api.fuul.xyz/api/v1/payouts?user_address=${userAddress}&type=onchain-current`;
    
    const options = {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'Authorization': `Bearer ${FUUL_API_TOKEN}`
      }
    };

    const response = await fetch(url, options);
    
    if (!response.ok) {
      // Handle different HTTP status codes
      if (response.status === 404) {
        // User not found in Aegis system - return 0 points
        return NextResponse.json({
          success: true,
          totalPoints: 0,
          isNewUser: true,
          message: 'User not found in Aegis system'
        });
      } else if (response.status === 401 || response.status === 403) {
        // Authentication error
        return NextResponse.json({
          success: true,
          totalPoints: 0,
          isConfigError: true,
          message: 'API authentication failed'
        });
      } else {
        // Other API errors
        throw new Error(`Fuul API error: ${response.status}`);
      }
    }
    
    const data = await response.json();
    
    // Calculate total points from the response
    let totalPoints = 0;
    if (data.data && Array.isArray(data.data)) {
      totalPoints = data.data.reduce((sum: number, payout: any) => {
        return sum + (payout.amount || 0);
      }, 0);
    }
    
    return NextResponse.json({
      success: true,
      totalPoints,
      rawData: data
    });
    
  } catch (error) {
    console.error('Failed to fetch Aegis points:', error);
    return NextResponse.json(
      { 
        success: true,
        totalPoints: 0,
        isApiError: true,
        message: 'Failed to fetch points'
      }
    );
  }
} 