import { mockCctxScenarios } from './mockCctxData';

export class MockBlockpi {
  private currentScenario: keyof typeof mockCctxScenarios = 'success';
  private listeners: ((data: any) => void)[] = [];
  public cctxIndex = mockCctxScenarios.success.CrossChainTxs[0].index;

  setScenario(scenario: keyof typeof mockCctxScenarios) {
    this.currentScenario = scenario;
    this.notify();
  }

  // Allow listeners to subscribe to changes
  subscribe(listener: (data: any) => void) {
    this.listeners.push(listener);
  }
  private notify() {
    const data = mockCctxScenarios[this.currentScenario];
    this.listeners.forEach(listener => listener(data));
  }

  async getInboundHashToCctxData(localchainHash: string) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    return mockCctxScenarios[this.currentScenario];
  }

  // Simulate the withdrawal process step by step
  async simulateWithdrawProcess() {
    // 1. Set to pending
    this.setScenario('pending');
    console.log('[SIM] status:', mockCctxScenarios.pending.CrossChainTxs[0].cctx_status.status, 'Cctx_index:', this.cctxIndex);

    // 2. Wait, then set to success
    setTimeout(() => {
      this.setScenario('success');
      console.log('[SIM] status:', mockCctxScenarios.success.CrossChainTxs[0].cctx_status.status, 'Cctx_index:', this.cctxIndex);
    }, 3000);
  }
}
