import { getMockBlockpi } from '@/hooks/useInboundToCctxData';
import { useState } from 'react';

export const TestCctxSimulation = ({ refetch }: { refetch?: () => void }) => {
  const mockBlockpi = getMockBlockpi();
  const [currentScenario, setCurrentScenario] = useState<string>('idle');
  const [log, setLog] = useState<string[]>([]);

  const simulateWithdraw = async () => {
    setCurrentScenario('pending');
    setLog([]);
    // 1. Simulate pending
    mockBlockpi.setScenario('pending');
    setLog(logs => [
      ...logs,
      `[SIM] status: Pending, Cctx_index: ${mockBlockpi.cctxIndex}`
    ]);
    if (refetch) refetch();
    // 2. Wait, then simulate success
    setTimeout(() => {
      mockBlockpi.setScenario('success');
      setCurrentScenario('success');
      setLog(logs => [
        ...logs,
        `[SIM] status: OutboundMined, Cctx_index: ${mockBlockpi.cctxIndex}`
      ]);
      if (refetch) refetch();
    }, 3000);
  };

  return (
    <div className="text-white">
      <h3 className="text-lg font-semibold mb-2">CCTX Withdraw Simulation</h3>
      <button
        onClick={simulateWithdraw}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
      >
        Simulate Withdraw Step
      </button>
      <div className="mt-2 text-sm">
        Current Scenario: <span className="font-medium">{currentScenario}</span>
      </div>
      <div className="mt-2 text-xs text-gray-400">
        {log.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  );
};
