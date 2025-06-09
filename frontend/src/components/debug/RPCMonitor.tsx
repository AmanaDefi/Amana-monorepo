"use client";

import { useEffect, useState } from "react";
import { rpcDebugger } from "@/utils/rpcDebugger";

interface RPCStats {
  totalCalls: number;
  functionCalls: Record<string, number>;
  recentCalls: Record<string, number>;
}

export default function RPCMonitor() {
  const [stats, setStats] = useState<RPCStats>({
    totalCalls: 0,
    functionCalls: {},
    recentCalls: {}
  });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateStats = () => {
      setStats(rpcDebugger.getStats());
    };

    // Update stats every 2 seconds
    const interval = setInterval(updateStats, 2000);
    
    // Initial update
    updateStats();

    return () => clearInterval(interval);
  }, []);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const highestFunctionCalls = Object.entries(stats.recentCalls)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className={`px-3 py-2 rounded-lg text-sm font-mono transition-colors ${
          stats.totalCalls > 100 ? 'bg-red-500 text-white' :
          stats.totalCalls > 50 ? 'bg-yellow-500 text-black' :
          'bg-green-500 text-white'
        }`}
      >
        RPC: {stats.totalCalls}/s
      </button>

      {isVisible && (
        <div className="absolute bottom-12 right-0 bg-black/90 text-white p-4 rounded-lg min-w-80 max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-sm">RPC Monitor</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="border-b border-gray-600 pb-2">
              <div className="flex justify-between">
                <span>Total calls/second:</span>
                <span className={stats.totalCalls > 100 ? 'text-red-400' : 'text-green-400'}>
                  {stats.totalCalls}
                </span>
              </div>
            </div>

            <div>
              <div className="font-semibold mb-1">Recent calls/second:</div>
              {highestFunctionCalls.length > 0 ? (
                <div className="space-y-1">
                  {highestFunctionCalls.map(([func, count]) => (
                    <div key={func} className="flex justify-between">
                      <span className="truncate max-w-40">{func}:</span>
                      <span className={count > 10 ? 'text-red-400' : count > 5 ? 'text-yellow-400' : 'text-green-400'}>
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-400">No recent calls</div>
              )}
            </div>

            <div className="border-t border-gray-600 pt-2">
              <div className="font-semibold mb-1">Total function calls:</div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {Object.entries(stats.functionCalls)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 10)
                  .map(([func, count]) => (
                    <div key={func} className="flex justify-between">
                      <span className="truncate max-w-40">{func}:</span>
                      <span>{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-gray-600">
            <button
              onClick={() => {
                rpcDebugger.logStats();
                console.log('🔍 [RPC-MONITOR] Stats logged to console');
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs"
            >
              Log to Console
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 