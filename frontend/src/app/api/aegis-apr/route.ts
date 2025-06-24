import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch('https://api.aegis.im/api/project-stats');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'success' || !data.data?.efficient_apr) {
      throw new Error('Invalid response from Aegis API');
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch Aegis APR:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Aegis APR' },
      { status: 500 }
    );
  }
} 