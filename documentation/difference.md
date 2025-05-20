When reverted, Data looks like this - 'https://zetachain.blockpi.network/lcd/v1/public/zeta-chain/crosschain/cctx/0xf84f7b31546317e169f0671c634389adfc33be1d8a1a1db9eda1a34d39673a2fhttps://zetachain.blockpi.network/lcd/v1/public/zeta-chain/crosschain/cctx/0xf84f7b31546317e169f0671c634389adfc33be1d8a1a1db9eda1a34d39673a2f'

When success - '{
  "CrossChainTx": {
    "creator": "zeta19jr7nl82lrktge35f52x9g5y5prmvchmk40zhg",
    "index": "0x859b5241ccc9fbacb7aadc834eacddc2ecfc14d0927055935b624a6639eaad19",
    "zeta_fees": "0",
    "relayed_message": "0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000027103866a173cec06aad8dc17edd2a032d3c506298fd03e269e5b7f561b9552b2e1e",
    "cctx_status": {
      "status": "OutboundMined",
      "status_message": "",
      "error_message": "",
      "lastUpdate_timestamp": "1746631406",
      "isAbortRefunded": false,
      "created_timestamp": "1746631406",
      "error_message_revert": "",
      "error_message_abort": ""
    },
    "inbound_params": {
      "sender": "0xAB75E66C63307396FE8456Ea7c42CBBF3CF36298",
      "sender_chain_id": "8453",
      "tx_origin": "0xAB75E66C63307396FE8456Ea7c42CBBF3CF36298",
      "coin_type": "Gas",
      "asset": "0x0000000000000000000000000000000000000000",
      "amount": "5000000000000000",
      "observed_hash": "0x4e4e30d0b303d22bf83288a4e5104385247de0c19a0d4ad06abe55e324665549",
      "observed_external_height": "29920937",
      "ballot_index": "0x859b5241ccc9fbacb7aadc834eacddc2ecfc14d0927055935b624a6639eaad19",
      "finalized_zeta_height": "8214702",
      "tx_finalization_status": "Executed",
      "is_cross_chain_call": true,
      "status": "SUCCESS",
      "confirmation_mode": "SAFE"
    },
    "outbound_params": [
      {
        "receiver": "0xF4FA4D8115e78ACf52308FDBad10A5f9042991DE",
        "receiver_chainId": "7000",
        "coin_type": "Gas",
        "amount": "0",
        "tss_nonce": "0",
        "gas_limit": "0",
        "gas_price": "",
        "gas_priority_fee": "",
        "hash": "0xf086683a329ffca31a8df963e0f5a1210db9a6ff90177a1a9b404712237b90d1",
        "ballot_index": "",
        "observed_external_height": "8214702",
        "gas_used": "0",
        "effective_gas_price": "0",
        "effective_gas_limit": "0",
        "tss_pubkey": "zetapub1addwnpepqtadxdyt037h86z60nl98t6zk56mw5zpnm79tsmvspln3hgt5phdc79kvfc",
        "tx_finalization_status": "Executed",
        "call_options": {
          "gas_limit": "1500000",
          "is_arbitrary_call": false
        },
        "confirmation_mode": "SAFE"
      }
    ],
    "protocol_contract_version": "V2",
    "revert_options": {
      "revert_address": "0xee9d542b084dae8375f29ec670C982Bd9da9D11A",
      "call_on_revert": true,
      "abort_address": "0xAB75E66C63307396FE8456Ea7c42CBBF3CF36298",
      "revert_message": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGA4ZqFzzsBqrY3Bft0qAy08UGKY/QPiaeW39WG5VSsuHgAAAAAAAAAAAAAAAKt15mxjMHOW/oRW6nxCy78882KYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABhfY3Jvc3NDaGFpbkRlcG9zaXRGYWlsZWQAAAAAAAAAAA==",
      "revert_gas_limit": "1000000"
    }
  }
}'