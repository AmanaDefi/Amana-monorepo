import { BlockPIResponse } from '@/service/blockpi';

export const mockWithdrawCctxData: BlockPIResponse = {
  CrossChainTxs: [{
    creator: "zeta1l07weaxkmn6z69qm55t53v4rfr43eys4cjz54h",
    index: "0x5fcecb507982bd2e18b2b435aabc74b69183005a1ae94e864bb9aa72fa020dc7",
    cctx_status: {
      status: "OutboundMined",
      status_message: "",
      error_message: "",
      lastUpdate_timestamp: "1746612107",
      isAbortRefunded: false,
      created_timestamp: "1746612107"
    },
    inbound_params: {
      sender: "0xfcd2eDF1543c055167fAc3fA4Fd505b14c659392",
      sender_chain_id: "8453",
      tx_origin: "0xfcd2eDF1543c055167fAc3fA4Fd505b14c659392",
      coin_type: "NoAssetCall",
      asset: "",
      amount: "0",
      observed_hash: "0xff53be485baa2faca5eb760771a60067d6636fb6b5c18078815ded02234f19c8",
      observed_external_height: "29911287",
      ballot_index: "0x5fcecb507982bd2e18b2b435aabc74b69183005a1ae94e864bb9aa72fa020dc7",
      finalized_zeta_height: "8211557",
      tx_finalization_status: "Executed",
      is_cross_chain_call: false,
      status: "SUCCESS",
      confirmation_mode: "SAFE"
    },
    outbound_params: [{
      receiver: "0x622E956626Cc6aBa655E3d92a3629b04cB038E80",
      receiver_chainId: "7000",
      coin_type: "NoAssetCall",
      amount: "0",
      tss_nonce: "0",
      gas_limit: "0",
      gas_price: "",
      gas_priority_fee: "",
      hash: "0xb96d1e4ade1ee30567434050621f292575c18dc5d9cf3987f5f3e7a42a1d7880",
      ballot_index: "",
      observed_external_height: "8211557",
      gas_used: "0",
      effective_gas_price: "0",
      effective_gas_limit: "0",
      tss_pubkey: "zetapub1addwnpepqtadxdyt037h86z60nl98t6zk56mw5zpnm79tsmvspln3hgt5phdc79kvfc",
      tx_finalization_status: "Executed",
      call_options: {
        gas_limit: "1500000",
        is_arbitrary_call: false
      },
      confirmation_mode: "SAFE"
    }]
  }]
};

// Different status scenarios for testing
const base = mockWithdrawCctxData.CrossChainTxs?.[0];
export const mockCctxScenarios: Record<string, BlockPIResponse> = {
  success: mockWithdrawCctxData,
  pending: {
    ...mockWithdrawCctxData,
    CrossChainTxs: [
      base ? {
        creator: base.creator ?? "",
        index: base.index ?? "",
        cctx_status: {
          status: "Pending",
          status_message: base.cctx_status.status_message ?? "",
          error_message: base.cctx_status.error_message ?? "",
          lastUpdate_timestamp: base.cctx_status.lastUpdate_timestamp ?? "",
          isAbortRefunded: base.cctx_status.isAbortRefunded ?? false,
          created_timestamp: base.cctx_status.created_timestamp ?? ""
        },
        inbound_params: base.inbound_params ?? {
          sender: "",
          sender_chain_id: "",
          tx_origin: "",
          coin_type: "",
          asset: "",
          amount: "",
          observed_hash: "",
          status: "",
          confirmation_mode: ""
        },
        outbound_params: base.outbound_params ?? []
      } : undefined as any
    ]
  },
  failed: {
    ...mockWithdrawCctxData,
    CrossChainTxs: [
      base ? {
        creator: base.creator ?? "",
        index: base.index ?? "",
        cctx_status: {
          status: "Failed",
          status_message: base.cctx_status.status_message ?? "",
          error_message: "Transaction failed",
          lastUpdate_timestamp: base.cctx_status.lastUpdate_timestamp ?? "",
          isAbortRefunded: base.cctx_status.isAbortRefunded ?? false,
          created_timestamp: base.cctx_status.created_timestamp ?? ""
        },
        inbound_params: base.inbound_params ?? {
          sender: "",
          sender_chain_id: "",
          tx_origin: "",
          coin_type: "",
          asset: "",
          amount: "",
          observed_hash: "",
          status: "",
          confirmation_mode: ""
        },
        outbound_params: base.outbound_params ?? []
      } : undefined as any
    ]
  }
};
