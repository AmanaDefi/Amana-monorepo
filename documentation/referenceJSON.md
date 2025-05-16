## Step 1 => Initial local transaction on Base (local chain)
- Get from -> tx receipt.
- Hash of tx -> '0xff53be485baa2faca5eb760771a60067d6636fb6b5c18078815ded02234f19c8'
- Tx result details -> 'https://basescan.org/tx/0xff53be485baa2faca5eb760771a60067d6636fb6b5c18078815ded02234f19c8'
- if Successful -> Tx succeeds, get receipt 
- if Failure -> Tx Reverts

## Step 2 => Cross chain call from from Base to vault on ZC
- Get from -> Blockpi API call using local tx hash: '{
  "inboundHashToCctx": {
    "inbound_hash": "0xff53be485baa2faca5eb760771a60067d6636fb6b5c18078815ded02234f19c8",
    "cctx_index": [
      "0x5fcecb507982bd2e18b2b435aabc74b69183005a1ae94e864bb9aa72fa020dc7"
    ]
  }
}'
- Hash of Tx -> '0x5fcecb507982bd2e18b2b435aabc74b69183005a1ae94e864bb9aa72fa020dc7'
- Tx results details -> '{
  "CrossChainTx": {
    "creator": "zeta1l07weaxkmn6z69qm55t53v4rfr43eys4cjz54h",
    "index": "0x5fcecb507982bd2e18b2b435aabc74b69183005a1ae94e864bb9aa72fa020dc7",
    "zeta_fees": "0",
    "relayed_message": "00000000000000000000000096152e6180e085fa57c7708e18af8f05e37b479d000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda0291300000000000000000000000000000000000000000000000000000000000f1b3000000000000000000000000000000000000000000000000000000000000e644300000000000000000000000000000000000000000000000000000000000001f49b55b8d8a7ae1e926ee2aa37892231efef0b784f08a51c0afdfac777359c5ef0",
    "cctx_status": {
      "status": "OutboundMined",
      "status_message": "",
      "error_message": "",
      "lastUpdate_timestamp": "1746612107",
      "isAbortRefunded": false,
      "created_timestamp": "1746612107",
      "error_message_revert": "",
      "error_message_abort": ""
    },
    "inbound_params": {
      "sender": "0xfcd2eDF1543c055167fAc3fA4Fd505b14c659392",
      "sender_chain_id": "8453",
      "tx_origin": "0xfcd2eDF1543c055167fAc3fA4Fd505b14c659392",
      "coin_type": "NoAssetCall",
      "asset": "",
      "amount": "0",
      "observed_hash": "0xff53be485baa2faca5eb760771a60067d6636fb6b5c18078815ded02234f19c8",
      "observed_external_height": "29911287",
      "ballot_index": "0x5fcecb507982bd2e18b2b435aabc74b69183005a1ae94e864bb9aa72fa020dc7",
      "finalized_zeta_height": "8211557",
      "tx_finalization_status": "Executed",
      "is_cross_chain_call": false,
      "status": "SUCCESS",
      "confirmation_mode": "SAFE"
    },
    "outbound_params": [
      {
        "receiver": "0x622E956626Cc6aBa655E3d92a3629b04cB038E80",
        "receiver_chainId": "7000",
        "coin_type": "NoAssetCall",
        "amount": "0",
        "tss_nonce": "0",
        "gas_limit": "0",
        "gas_price": "",
        "gas_priority_fee": "",
        "hash": "0xb96d1e4ade1ee30567434050621f292575c18dc5d9cf3987f5f3e7a42a1d7880",
        "ballot_index": "",
        "observed_external_height": "8211557",
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
      "call_on_revert": false,
      "abort_address": "0xfcd2eDF1543c055167fAc3fA4Fd505b14c659392",
      "revert_message": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGCbVbjYp64ekm7iqjeJIjHv7wt4TwilHAr9+sd3NZxe8AAAAAAAAAAAAAAAAPzS7fFUPAVRZ/rD+k/VBbFMZZOSAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABlfY3Jvc3NDaGFpbldpdGhkcmF3RmFpbGVkAAAAAAAAAA==",
      "revert_gas_limit": "1000000"
    }
  }
}'
- If Successful -> 'Look at cctx endpoint. Look at cctx_status, Must get ”OutboundMined”.'
- If Failure -> 'Look at cctx endpoint. Look at cctx_status.
Will get Reverted or Aborted'

## Step 3 => Cross chain call from vault on ZC to strategy on strategy chain
- Get from -> '{
  "inboundHashToCctx": {
    "inbound_hash": "0x5fcecb507982bd2e18b2b435aabc74b69183005a1ae94e864bb9aa72fa020dc7",
    "cctx_index": [
      "0xe4d6cc027bf4b5e82488111267cb3b91f725fc08b475e8dad0941d331c72541f"
    ]
  }
}'
- Hash of Tx -> '0xe4d6cc027bf4b5e82488111267cb3b91f725fc08b475e8dad0941d331c72541f'
- Tx results details -> '{
  "CrossChainTx": {
    "creator": "",
    "index": "0xe4d6cc027bf4b5e82488111267cb3b91f725fc08b475e8dad0941d331c72541f",
    "zeta_fees": "0",
    "relayed_message": "000000000000000000000000fcd2edf1543c055167fac3fa4fd505b14c659392000000000000000000000000fcd2edf1543c055167fac3fa4fd505b14c65939200000000000000000000000096152e6180e085fa57c7708e18af8f05e37b479d000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda0291300000000000000000000000000000000000000000000000000000000000f1b300000000000000000000000000000000000000000000000000000af1b453a9ac200000000000000000000000000000000000000000000000000000000000e6443000000000000000000000000000000000000000000000000000000000000210500000000000000000000000000000000000000000000000000000000000000009b55b8d8a7ae1e926ee2aa37892231efef0b784f08a51c0afdfac777359c5ef000000000000000000000000000000000000000000000000000000000000001f4",
    "cctx_status": {
      "status": "OutboundMined",
      "status_message": "",
      "error_message": "",
      "lastUpdate_timestamp": "1746612628",
      "isAbortRefunded": false,
      "created_timestamp": "1746612107",
      "error_message_revert": "",
      "error_message_abort": ""
    },
    "inbound_params": {
      "sender": "0xC9A9f1cd2A5524D24c856CA6c0Ab587b2e3440f4",
      "sender_chain_id": "7000",
      "tx_origin": "0xfcd2eDF1543c055167fAc3fA4Fd505b14c659392",
      "coin_type": "NoAssetCall",
      "asset": "",
      "amount": "0",
      "observed_hash": "0x5fcecb507982bd2e18b2b435aabc74b69183005a1ae94e864bb9aa72fa020dc7",
      "observed_external_height": "8211557",
      "ballot_index": "0xe4d6cc027bf4b5e82488111267cb3b91f725fc08b475e8dad0941d331c72541f",
      "finalized_zeta_height": "0",
      "tx_finalization_status": "NotFinalized",
      "is_cross_chain_call": false,
      "status": "SUCCESS",
      "confirmation_mode": "SAFE"
    },
    "outbound_params": [
      {
        "receiver": "0x5E1613bB9d1A8838eD72BE8471326B4C05102757",
        "receiver_chainId": "137",
        "coin_type": "NoAssetCall",
        "amount": "0",
        "tss_nonce": "18238",
        "gas_limit": "0",
        "gas_price": "31896000109",
        "gas_priority_fee": "26579999990",
        "hash": "0x95cc0cb8806235d00c9dcb3a41602c63e755201156941fb646a0e46d685b3a50",
        "ballot_index": "0xa1151d7d4fd68b8bbed140577182288bd0ae9a3f8eb9c64ee4c0b50823421529",
        "observed_external_height": "71218434",
        "gas_used": "534789",
        "effective_gas_price": "31896000109",
        "effective_gas_limit": "1000000",
        "tss_pubkey": "zetapub1addwnpepqtadxdyt037h86z60nl98t6zk56mw5zpnm79tsmvspln3hgt5phdc79kvfc",
        "tx_finalization_status": "Executed",
        "call_options": {
          "gas_limit": "1000000",
          "is_arbitrary_call": false
        },
        "confirmation_mode": "SAFE"
      }
    ],
    "protocol_contract_version": "V2",
    "revert_options": {
      "revert_address": "0x622E956626Cc6aBa655E3d92a3629b04cB038E80",
      "call_on_revert": true,
      "abort_address": "0x622E956626Cc6aBa655E3d92a3629b04cB038E80",
      "revert_message": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOCbVbjYp64ekm7iqjeJIjHv7wt4TwilHAr9+sd3NZxe8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADxswAAAAAAAAAAAAAAAA/NLt8VQ8BVFn+sP6T9UFsUxlk5IAAAAAAAAAAAAAAACWFS5hgOCF+lfHcI4Yr48F43tHnQAAAAAAAAAAAAAAAIM1ifzW7bbgj0x8MtT3G1S9oCkTAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIQUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAI19kaXZlc3RDb25uZWN0ZWRDaGFpblN0cmF0ZWd5RmFpbGVkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
      "revert_gas_limit": "0"
    }
  }
}'
- If Successful -> 'Look at cctx endpoint. Look at cctx_status, Must get ”OutboundMined”.'
- If Failure -> 'Look at cctx endpoint. Look at cctx_status.
Will get Reverted or Aborted'

## Step 4 => Transaction on strategy chain
- Get from -> 'Get from blockpi cctx endpoint in line above - use outbound_params hash: `{
  "CrossChainTx": {
    "creator": "",
    "index": "0xe4d6cc027bf4b5e82488111267cb3b91f725fc08b475e8dad0941d331c72541f",
    "zeta_fees": "0",
    "relayed_message": "000000000000000000000000fcd2edf1543c055167fac3fa4fd505b14c659392000000000000000000000000fcd2edf1543c055167fac3fa4fd505b14c65939200000000000000000000000096152e6180e085fa57c7708e18af8f05e37b479d000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda0291300000000000000000000000000000000000000000000000000000000000f1b300000000000000000000000000000000000000000000000000000af1b453a9ac200000000000000000000000000000000000000000000000000000000000e6443000000000000000000000000000000000000000000000000000000000000210500000000000000000000000000000000000000000000000000000000000000009b55b8d8a7ae1e926ee2aa37892231efef0b784f08a51c0afdfac777359c5ef000000000000000000000000000000000000000000000000000000000000001f4",
    "cctx_status": {
      "status": "OutboundMined",
      "status_message": "",
      "error_message": "",
      "lastUpdate_timestamp": "1746612628",
      "isAbortRefunded": false,
      "created_timestamp": "1746612107",
      "error_message_revert": "",
      "error_message_abort": ""
    },
    "inbound_params": {
      "sender": "0xC9A9f1cd2A5524D24c856CA6c0Ab587b2e3440f4",
      "sender_chain_id": "7000",
      "tx_origin": "0xfcd2eDF1543c055167fAc3fA4Fd505b14c659392",
      "coin_type": "NoAssetCall",
      "asset": "",
      "amount": "0",
      "observed_hash": "0x5fcecb507982bd2e18b2b435aabc74b69183005a1ae94e864bb9aa72fa020dc7",
      "observed_external_height": "8211557",
      "ballot_index": "0xe4d6cc027bf4b5e82488111267cb3b91f725fc08b475e8dad0941d331c72541f",
      "finalized_zeta_height": "0",
      "tx_finalization_status": "NotFinalized",
      "is_cross_chain_call": false,
      "status": "SUCCESS",
      "confirmation_mode": "SAFE"
    },
    "outbound_params": [
      {
        "receiver": "0x5E1613bB9d1A8838eD72BE8471326B4C05102757",
        "receiver_chainId": "137",
        "coin_type": "NoAssetCall",
        "amount": "0",
        "tss_nonce": "18238",
        "gas_limit": "0",
        "gas_price": "31896000109",
        "gas_priority_fee": "26579999990",
        "hash": "0x95cc0cb8806235d00c9dcb3a41602c63e755201156941fb646a0e46d685b3a50",
        "ballot_index": "0xa1151d7d4fd68b8bbed140577182288bd0ae9a3f8eb9c64ee4c0b50823421529",
        "observed_external_height": "71218434",
        "gas_used": "534789",
        "effective_gas_price": "31896000109",
        "effective_gas_limit": "1000000",
        "tss_pubkey": "zetapub1addwnpepqtadxdyt037h86z60nl98t6zk56mw5zpnm79tsmvspln3hgt5phdc79kvfc",
        "tx_finalization_status": "Executed",
        "call_options": {
          "gas_limit": "1000000",
          "is_arbitrary_call": false
        },
        "confirmation_mode": "SAFE"
      }
    ],
    "protocol_contract_version": "V2",
    "revert_options": {
      "revert_address": "0x622E956626Cc6aBa655E3d92a3629b04cB038E80",
      "call_on_revert": true,
      "abort_address": "0x622E956626Cc6aBa655E3d92a3629b04cB038E80",
      "revert_message": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOCbVbjYp64ekm7iqjeJIjHv7wt4TwilHAr9+sd3NZxe8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADxswAAAAAAAAAAAAAAAA/NLt8VQ8BVFn+sP6T9UFsUxlk5IAAAAAAAAAAAAAAACWFS5hgOCF+lfHcI4Yr48F43tHnQAAAAAAAAAAAAAAAIM1ifzW7bbgj0x8MtT3G1S9oCkTAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIQUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAI19kaXZlc3RDb25uZWN0ZWRDaGFpblN0cmF0ZWd5RmFpbGVkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
      "revert_gas_limit": "0"
    }
  }
}`'
- Hash of Tx -> '0x95cc0cb8806235d00c9dcb3a41602c63e755201156941fb646a0e46d685b3a50'
- If Successful -> 'Don't need to check this for success/failure'

## Step 5 => Cross chain call from strategy on strategy chain back to vault on ZC
- Get from -> '{
  "inboundHashToCctx": {
    "inbound_hash": "0x95cc0cb8806235d00c9dcb3a41602c63e755201156941fb646a0e46d685b3a50",
    "cctx_index": [
      "0xac069e02538d032937c3498487486563b62f2057bfc856b0ab974083b1786e37"
    ]
  }
}'
- Hash of Tx -> '0xac069e02538d032937c3498487486563b62f2057bfc856b0ab974083b1786e37'
- Tx results details -> '{
  "CrossChainTx": {
    "creator": "zeta1l07weaxkmn6z69qm55t53v4rfr43eys4cjz54h",
    "index": "0xac069e02538d032937c3498487486563b62f2057bfc856b0ab974083b1786e37",
    "zeta_fees": "0",
    "relayed_message": "000000000000000000000000fcd2edf1543c055167fac3fa4fd505b14c659392000000000000000000000000fcd2edf1543c055167fac3fa4fd505b14c65939200000000000000000000000096152e6180e085fa57c7708e18af8f05e37b479d000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda0291300000000000000000000000000000000000000000000000000000000000f262d00000000000000000000000000000000000000000000000000000000000f1b300000000000000000000000000000000000000000000000000000000000002105000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001334ca11a00000000000000000000000000000000000000000000000000000000000000279b55b8d8a7ae1e926ee2aa37892231efef0b784f08a51c0afdfac777359c5ef000000000000000000000000000000000000000000000000000000000000001f4",
    "cctx_status": {
      "status": "OutboundMined",
      "status_message": "",
      "error_message": "",
      "lastUpdate_timestamp": "1746612628",
      "isAbortRefunded": false,
      "created_timestamp": "1746612628",
      "error_message_revert": "",
      "error_message_abort": ""
    },
    "inbound_params": {
      "sender": "0x5E1613bB9d1A8838eD72BE8471326B4C05102757",
      "sender_chain_id": "137",
      "tx_origin": "0x5E1613bB9d1A8838eD72BE8471326B4C05102757",
      "coin_type": "ERC20",
      "asset": "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
      "amount": "992813",
      "observed_hash": "0x95cc0cb8806235d00c9dcb3a41602c63e755201156941fb646a0e46d685b3a50",
      "observed_external_height": "71218434",
      "ballot_index": "0xac069e02538d032937c3498487486563b62f2057bfc856b0ab974083b1786e37",
      "finalized_zeta_height": "8211637",
      "tx_finalization_status": "Executed",
      "is_cross_chain_call": true,
      "status": "SUCCESS",
      "confirmation_mode": "SAFE"
    },
    "outbound_params": [
      {
        "receiver": "0x622E956626Cc6aBa655E3d92a3629b04cB038E80",
        "receiver_chainId": "7000",
        "coin_type": "ERC20",
        "amount": "0",
        "tss_nonce": "0",
        "gas_limit": "0",
        "gas_price": "",
        "gas_priority_fee": "",
        "hash": "0x63e5f60a8aea54a51e37e72e35dac5496561759b0011c61b07940c6175b41116",
        "ballot_index": "",
        "observed_external_height": "8211637",
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
      "revert_address": "0x5E1613bB9d1A8838eD72BE8471326B4C05102757",
      "call_on_revert": true,
      "abort_address": "0x5E1613bB9d1A8838eD72BE8471326B4C05102757",
      "revert_message": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMCbVbjYp64ekm7iqjeJIjHv7wt4TwilHAr9+sd3NZxe8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAnAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPJi0AAAAAAAAAAAAAAAD80u3xVDwFUWf6w/pP1QWxTGWTkgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADxswAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB5fcmV0dXJuRnVuZHNGcm9tU3RyYXRlZ3lGYWlsZWQAAA==",
      "revert_gas_limit": "1000000"
    }
  }
}'
- If Successful -> 'Look at cctx endpoint. Look at cctx_status, Must get ”OutboundMined”.'
- If Failure -> 'Look at cctx endpoint. Look at cctx_status.
Will get Reverted or Aborted'

## Step 6 => Cross chain withdraw from vault on ZC to Base
- Get from -> '{
  "inboundHashToCctx": {
    "inbound_hash": "0xac069e02538d032937c3498487486563b62f2057bfc856b0ab974083b1786e37",
    "cctx_index": [
      "0xe2002861045fe4e627ce511f96cce55f1e7a9ab016fe818b8c64a60f0252f579"
    ]
  }
}'
- Hash to Tx -> '0xe2002861045fe4e627ce511f96cce55f1e7a9ab016fe818b8c64a60f0252f579'
- Tx results details -> '{
  "CrossChainTx": {
    "creator": "",
    "index": "0xe2002861045fe4e627ce511f96cce55f1e7a9ab016fe818b8c64a60f0252f579",
    "zeta_fees": "0",
    "relayed_message": "000000000000000000000000fcd2edf1543c055167fac3fa4fd505b14c659392000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda0291300000000000000000000000000000000000000000000000000000000000f23609b55b8d8a7ae1e926ee2aa37892231efef0b784f08a51c0afdfac777359c5ef0",
    "cctx_status": {
      "status": "OutboundMined",
      "status_message": "",
      "error_message": "",
      "lastUpdate_timestamp": "1746613000",
      "isAbortRefunded": false,
      "created_timestamp": "1746612628",
      "error_message_revert": "",
      "error_message_abort": ""
    },
    "inbound_params": {
      "sender": "0xC9A9f1cd2A5524D24c856CA6c0Ab587b2e3440f4",
      "sender_chain_id": "7000",
      "tx_origin": "0x5E1613bB9d1A8838eD72BE8471326B4C05102757",
      "coin_type": "ERC20",
      "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "amount": "992096",
      "observed_hash": "0xac069e02538d032937c3498487486563b62f2057bfc856b0ab974083b1786e37",
      "observed_external_height": "8211637",
      "ballot_index": "0xe2002861045fe4e627ce511f96cce55f1e7a9ab016fe818b8c64a60f0252f579",
      "finalized_zeta_height": "0",
      "tx_finalization_status": "NotFinalized",
      "is_cross_chain_call": true,
      "status": "SUCCESS",
      "confirmation_mode": "SAFE"
    },
    "outbound_params": [
      {
        "receiver": "0xee9d542b084dae8375f29ec670C982Bd9da9D11A",
        "receiver_chainId": "8453",
        "coin_type": "ERC20",
        "amount": "992096",
        "tss_nonce": "35551",
        "gas_limit": "0",
        "gas_price": "2739384",
        "gas_priority_fee": "1000000",
        "hash": "0x94a64b8a25a78482c000361f38b2963a9f7255d4afcddaf5fa3c54bbaedd103d",
        "ballot_index": "0x450f59d884e15f871fb5d26fa762340414e65959d518db043fb6cd99aa5fe822",
        "observed_external_height": "29911735",
        "gas_used": "137861",
        "effective_gas_price": "2739384",
        "effective_gas_limit": "500000",
        "tss_pubkey": "zetapub1addwnpepqtadxdyt037h86z60nl98t6zk56mw5zpnm79tsmvspln3hgt5phdc79kvfc",
        "tx_finalization_status": "Executed",
        "call_options": {
          "gas_limit": "500000",
          "is_arbitrary_call": false
        },
        "confirmation_mode": "SAFE"
      }
    ],
    "protocol_contract_version": "V2",
    "revert_options": {
      "revert_address": "0x622E956626Cc6aBa655E3d92a3629b04cB038E80",
      "call_on_revert": true,
      "abort_address": "0x622E956626Cc6aBa655E3d92a3629b04cB038E80",
      "revert_message": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOCbVbjYp64ekm7iqjeJIjHv7wt4TwilHAr9+sd3NZxe8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADyNgAAAAAAAAAAAAAAAA/NLt8VQ8BVFn+sP6T9UFsUxlk5IAAAAAAAAAAAAAAACWFS5hgOCF+lfHcI4Yr48F43tHnQAAAAAAAAAAAAAAAIM1ifzW7bbgj0x8MtT3G1S9oCkTAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIQUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGF9yZXR1cm5GdW5kc1RvVXNlckZhaWxlZAAAAAAAAAAA",
      "revert_gas_limit": "0"
    }
  }
}'
- If Successful -> 'Look at cctx endpoint. Look at cctx_status, Must get ”OutboundMined”.'
- If Failure -> 'Look at cctx endpoint. Look at cctx_status.
Will get Reverted or Aborted'