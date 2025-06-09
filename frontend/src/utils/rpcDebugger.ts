// RPC Call Debugger and Rate Limiter
export class RPCDebugger {
  private static instance: RPCDebugger;
  private callCounts: Map<string, number> = new Map();
  private callTimestamps: Map<string, number[]> = new Map();
  private totalCalls = 0;
  private resetInterval: NodeJS.Timeout | null = null;

  // Rate limiting settings
  private readonly MAX_CALLS_PER_SECOND = 100;
  private readonly MAX_CALLS_PER_FUNCTION_PER_SECOND = 10;
  private readonly WARNING_THRESHOLD = 500;
  private readonly CRITICAL_THRESHOLD = 2000;

  static getInstance(): RPCDebugger {
    if (!RPCDebugger.instance) {
      RPCDebugger.instance = new RPCDebugger();
    }
    return RPCDebugger.instance;
  }

  constructor() {
    // Reset counters every second
    this.resetInterval = setInterval(() => {
      this.resetCounters();
    }, 1000);
  }

  private resetCounters() {
    const now = Date.now();
    
    // Clean old timestamps (older than 1 second)
    this.callTimestamps.forEach((timestamps, key) => {
      this.callTimestamps.set(
        key,
        timestamps.filter(timestamp => now - timestamp < 1000)
      );
    });

    this.totalCalls = Array.from(this.callTimestamps.values())
      .reduce((sum, timestamps) => sum + timestamps.length, 0);
  }

  trackCall(functionName: string, params?: any): boolean {
    const now = Date.now();
    
    // Get or create timestamp array for this function
    const timestamps = this.callTimestamps.get(functionName) || [];
    
    // Filter out old timestamps
    const recentTimestamps = timestamps.filter(timestamp => now - timestamp < 1000);
    
    // Check if we're exceeding limits
    if (recentTimestamps.length >= this.MAX_CALLS_PER_FUNCTION_PER_SECOND) {
      console.error(`🚫 [RPC-LIMITER] BLOCKED: ${functionName} exceeded ${this.MAX_CALLS_PER_FUNCTION_PER_SECOND} calls/second`, {
        functionName,
        callsInLastSecond: recentTimestamps.length,
        params: params ? JSON.stringify(params).substring(0, 200) : undefined,
        timestamp: new Date().toISOString()
      });
      return false; // Block the call
    }

    if (this.totalCalls >= this.MAX_CALLS_PER_SECOND) {
      console.error(`🚫 [RPC-LIMITER] BLOCKED: Total RPC calls exceeded ${this.MAX_CALLS_PER_SECOND} calls/second`, {
        totalCalls: this.totalCalls,
        functionName,
        timestamp: new Date().toISOString()
      });
      return false; // Block the call
    }

    // Add this call to tracking
    recentTimestamps.push(now);
    this.callTimestamps.set(functionName, recentTimestamps);
    
    // Update counters
    const currentCount = this.callCounts.get(functionName) || 0;
    this.callCounts.set(functionName, currentCount + 1);
    this.totalCalls++;

    // Log warnings
    if (this.totalCalls >= this.CRITICAL_THRESHOLD) {
      console.error(`🔥 [RPC-LIMITER] CRITICAL: ${this.totalCalls} total RPC calls! Investigation needed!`, {
        functionName,
        totalCalls: this.totalCalls,
        functionCalls: recentTimestamps.length,
        timestamp: new Date().toISOString()
      });
    } else if (this.totalCalls >= this.WARNING_THRESHOLD) {
      console.warn(`⚠️ [RPC-LIMITER] WARNING: ${this.totalCalls} total RPC calls approaching limit`, {
        functionName,
        totalCalls: this.totalCalls,
        functionCalls: recentTimestamps.length,
        timestamp: new Date().toISOString()
      });
    }

    // Log each call in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📞 [RPC-CALL] ${functionName}`, {
        functionCalls: recentTimestamps.length,
        totalCalls: this.totalCalls,
        params: params ? JSON.stringify(params).substring(0, 100) : undefined,
        timestamp: new Date().toISOString()
      });
    }

    return true; // Allow the call
  }

  getStats() {
    return {
      totalCalls: this.totalCalls,
      functionCalls: Object.fromEntries(this.callCounts),
      recentCalls: Object.fromEntries(
        Array.from(this.callTimestamps.entries()).map(([key, timestamps]) => [
          key,
          timestamps.filter(t => Date.now() - t < 1000).length
        ])
      )
    };
  }

  logStats() {
    const stats = this.getStats();
    console.log('📊 [RPC-STATS]', {
      ...stats,
      timestamp: new Date().toISOString()
    });
  }

  destroy() {
    if (this.resetInterval) {
      clearInterval(this.resetInterval);
    }
  }
}

// Wrapper function for readContract calls
export async function safeReadContract(params: any, functionName: string = 'readContract') {
  const rpcTracker = RPCDebugger.getInstance();
  
  if (!rpcTracker.trackCall(functionName, params)) {
    throw new Error(`RPC call to ${functionName} blocked due to rate limiting`);
  }

  try {
    const { readContract } = await import('thirdweb');
    return await readContract(params);
  } catch (error) {
    console.error(`❌ [RPC-ERROR] ${functionName} failed:`, error);
    throw error;
  }
}

// Export singleton instance
export const rpcDebugger = RPCDebugger.getInstance(); 