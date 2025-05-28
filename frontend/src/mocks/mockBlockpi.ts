import { mockCctxScenarios } from './mockCctxData';
import { BlockPIResponse, BlockPIStatus } from '@/service/blockpi';

export class MockBlockpi {
  private currentScenario: keyof typeof mockCctxScenarios = 'success';
  private listeners: ((data: BlockPIResponse) => void)[] = [];
  public cctxIndex = mockCctxScenarios.success.CrossChainTxs?.[0].index;

  setScenario(scenario: keyof typeof mockCctxScenarios) {
    this.currentScenario = scenario;
    this.notify();
  }

  // Allow listeners to subscribe to changes
  subscribe(listener: (data: BlockPIResponse) => void) {
    this.listeners.push(listener);
  }

  private notify() {
    const data = mockCctxScenarios[this.currentScenario];
    this.listeners.forEach(listener => listener(data));
  }

  async getInboundHashToCctxData(localchainHash: string): Promise<BlockPIResponse | null> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    return mockCctxScenarios[this.currentScenario];
  }

  // Alias for getInboundHashToCctxData to match the real BlockPI service
  async getInboundHashToCctx(localchainHash: string): Promise<BlockPIResponse | null> {
    return this.getInboundHashToCctxData(localchainHash);
  }

  async getTransactionStatus(localchainHash: string): Promise<BlockPIStatus | null> {
    const data = await this.getInboundHashToCctxData(localchainHash);
    const status = data?.CrossChainTxs?.[0]?.cctx_status?.status;
    
    if (status && ["OutboundMined", "Reverted", "Pending", "Failed", "Success"].includes(status)) {
      return status as BlockPIStatus;
    }
    return null;
  }

  async waitForTransactionConfirmation(
    localchainHash: string,
    timeout: number = 300000 // 5 minutes
  ): Promise<BlockPIResponse | null> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const data = await this.getInboundHashToCctxData(localchainHash);
      
      if (!data) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }

      const status = data.CrossChainTxs?.[0]?.cctx_status?.status;
      
      if (!status) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }
      
      if (status === "OutboundMined" || status === "Success") {
        return data;
      }
      
      if (status === "Reverted" || status === "Failed") {
        throw new Error(`Transaction failed with status: ${status}`);
      }

      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    throw new Error("Transaction confirmation timeout");
  }

  async isTransactionConfirmed(localchainHash: string): Promise<boolean> {
    try {
      const status = await this.getTransactionStatus(localchainHash);
      return status === "OutboundMined" || status === "Success";
    } catch (error) {
      console.error("[MockBlockPI] Error checking transaction confirmation:", error);
      return false;
    }
  }

  // Simulate the withdrawal process step by step
  async simulateWithdrawProcess() {
    // 1. Set to pending
    this.setScenario('pending');
    console.log('[SIM] status:', mockCctxScenarios.pending.CrossChainTxs?.[0].cctx_status.status, 'Cctx_index:', this.cctxIndex);

    // 2. Wait, then set to success
    setTimeout(() => {
      this.setScenario('success');
      console.log('[SIM] status:', mockCctxScenarios.success.CrossChainTxs?.[0].cctx_status.status, 'Cctx_index:', this.cctxIndex);
    }, 3000);
  }
}
