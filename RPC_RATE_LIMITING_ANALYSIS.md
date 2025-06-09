# 🔍 RPC Rate Limiting Analysis & Solutions

## 📊 **Problem Summary**
Your thirdweb account is hitting rate limits (500/s) with spikes of 5000+ to 50000+ calls in under 2 seconds, causing application freezes.

## 🎯 **Root Causes Identified**

### 1. **Infinite useEffect Loops** ⚠️ CRITICAL
- **Location**: `frontend/src/hooks/useMultichainTokenBalance.ts`
- **Issue**: `balance.value` in dependency array causes infinite re-renders
- **Impact**: Each balance change triggers new balance fetch → infinite loop

### 2. **Excessive APY Calculations** ⚠️ HIGH
- **Location**: `frontend/src/hooks/hooks.ts` - `useUpdateAPYs`
- **Issue**: Multiple `readContract` calls per vault (receipt token + APY calculations)
- **Impact**: ~10-15 RPC calls per vault × number of vaults = massive call volume

### 3. **Background Refresh Intervals** ⚠️ MEDIUM
- **Location**: `frontend/src/hooks/hooks.ts` - `useUpdateVaultBalanceAndTotalPerVault`
- **Issue**: 10-second intervals with 12 attempts = 2 minutes of constant polling
- **Impact**: Continuous RPC calls even when not needed

### 4. **Chain Switching Triggers** ⚠️ MEDIUM
- **Issue**: Every chain switch triggers complete re-fetch of all balances and APYs
- **Impact**: Burst of calls during user interactions

### 5. **Missing Memoization** ⚠️ LOW
- **Issue**: Unnecessary re-calculations due to object recreation in dependencies
- **Impact**: Additional unnecessary calls

## 🛠️ **Solutions Implemented**

### ✅ **1. RPC Call Debugger & Rate Limiter**
**File**: `frontend/src/utils/rpcDebugger.ts`

**Features**:
- Real-time call tracking and rate limiting
- Blocks calls exceeding 100/second total or 10/second per function
- Detailed logging with timestamps
- Visual warnings at 500+ calls, critical alerts at 2000+

**Usage**:
```typescript
import { safeReadContract, rpcDebugger } from "@/utils/rpcDebugger";

// Replace readContract calls with:
const result = await safeReadContract(params, "functionName");

// Monitor stats:
rpcDebugger.logStats();
```

### ✅ **2. Fixed Infinite Loop in Token Balance Hook**
**File**: `frontend/src/hooks/useMultichainTokenBalance.ts`

**Changes**:
- Removed `balance.value` from dependency array
- Fixed useCallback dependencies to prevent infinite loops
- Removed retry logic that was causing additional calls

**Before**:
```typescript
}, [token, walletAddress, activeChain, nativeBalance, balance.value]); // ❌ Infinite loop
```

**After**:
```typescript
}, [token?.address, token?.symbol, token?.isNative, walletAddress, activeChain?.id, nativeBalance.formatted]); // ✅ Stable dependencies
```

### ✅ **3. Optimized APY Calculation Hook**
**File**: `frontend/src/hooks/useOptimizedAPY.ts`

**Features**:
- 30-second throttling between calculations
- Batch processing (3 vaults at a time)
- Caching system (5-minute cache duration)
- Abort controllers for cleanup
- Temporary default APYs to prevent rate limiting

### ✅ **4. Real-time RPC Monitor Component**
**File**: `frontend/src/components/debug/RPCMonitor.tsx`

**Features**:
- Live RPC call counter in bottom-right corner
- Color-coded alerts (green < 50, yellow < 100, red > 100)
- Detailed breakdown of function calls
- Development-only visibility

## 🚀 **Immediate Actions Required**

### 1. **Replace APY Hook Usage**
Update all containers using the problematic APY hook:

```typescript
// Replace this:
import { useUpdateAPYs } from "@/hooks/hooks";

// With this:
import { useOptimizedAPYs } from "@/hooks/useOptimizedAPY";
```

**Files to update**:
- `frontend/src/containers/VaultsContainer.tsx`
- `frontend/src/containers/VaultsDetailContainer.tsx`
- `frontend/src/containers/VaultsGridContainer.tsx`

### 2. **Add RPC Tracking to Critical Functions**
Wrap high-frequency `readContract` calls:

```typescript
// In actions.ts, replace critical calls:
const balance = await safeReadContract({
  contract,
  method: "function convertToAssets(uint256) view returns (uint256)",
  params: [shares],
}, "fetchUserVaultBalance");
```

### 3. **Monitor and Test**
1. Open browser console
2. Look for RPC monitor in bottom-right corner
3. Watch for rate limiting warnings
4. Test chain switching and vault interactions

## 📈 **Expected Improvements**

### Before Fixes:
- 5000-50000+ calls in 2 seconds
- Application freezes
- Rate limit errors

### After Fixes:
- < 100 calls per second sustained
- Burst protection during chain switches
- Graceful degradation with caching
- Real-time monitoring and alerts

## 🔧 **Additional Recommendations**

### 1. **Implement Request Queuing**
```typescript
// Future enhancement: Queue system for RPC calls
class RPCQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private readonly DELAY_BETWEEN_CALLS = 100; // ms

  async add<T>(call: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await call();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.process();
    });
  }
}
```

### 2. **Add Circuit Breaker Pattern**
```typescript
class CircuitBreaker {
  private failures = 0;
  private readonly threshold = 5;
  private readonly timeout = 30000; // 30 seconds
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      throw new Error('Circuit breaker is open');
    }
    // Implementation...
  }
}
```

### 3. **Implement Smart Caching Strategy**
- Cache vault data for 5 minutes
- Cache token balances for 30 seconds
- Cache APY calculations for 10 minutes
- Invalidate cache on user transactions

### 4. **Add Retry Logic with Exponential Backoff**
```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => 
        setTimeout(resolve, baseDelay * Math.pow(2, i))
      );
    }
  }
  throw new Error('Max retries exceeded');
}
```

## 🎯 **Testing Checklist**

- [ ] Monitor RPC calls during app startup
- [ ] Test chain switching (should be < 50 calls)
- [ ] Test vault page navigation
- [ ] Verify APY calculations are throttled
- [ ] Check balance updates don't cause loops
- [ ] Confirm rate limiting blocks excessive calls
- [ ] Test application recovery after rate limiting

## 📞 **Emergency Debugging**

If rate limiting still occurs:

1. **Check Console**: Look for `🚫 [RPC-LIMITER] BLOCKED` messages
2. **Monitor Component**: Click RPC monitor button to see live stats
3. **Log Analysis**: Run `rpcDebugger.logStats()` in console
4. **Identify Culprit**: Look for functions with high call counts
5. **Temporary Fix**: Disable problematic features temporarily

## 🔄 **Next Steps**

1. **Deploy fixes** to development environment
2. **Monitor RPC usage** for 24 hours
3. **Gradually re-enable** real APY calculations with caching
4. **Implement** additional optimizations based on monitoring data
5. **Consider upgrading** thirdweb plan if sustained high usage is legitimate

---

**Status**: ✅ Critical fixes implemented, monitoring in place, ready for testing 