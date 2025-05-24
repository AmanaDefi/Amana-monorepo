So My Assistant, This explainer file is for you -

Step 1 - Get Local hash from local chain tx.

Step 2 - Use that local hash on inboundhashtocctx url to get the cctx_index (it looks like this - '{
  "inboundHashToCctx": {
    "inbound_hash": "0xff53be485baa2faca5eb760771a60067d6636fb6b5c18078815ded02234f19c8",
    "cctx_index": [
      "0x5fcecb507982bd2e18b2b435aabc74b69183005a1ae94e864bb9aa72fa020dc7"
    ]
  }
}')

After we get the cctx_index, use it to on cctx url to get status.

Step 3 - For the step 3, we need the previous step's cctx_index and will put it on the inboundhashtocctx url (/inboundHashToCctx/{cctx_index hash of previous step that we got when we used the local tx hash to get that cctx_index for eg - '0x5fcecb507982bd2e18b2b435aabc74b69183005a1ae94e864bb9aa72fa020dc7'}) to get the new cctx_index (so we would get an data from inboundhashtocctx like this - '{
  "inboundHashToCctx": {
    "inbound_hash": "0x5fcecb507982bd2e18b2b435aabc74b69183005a1ae94e864bb9aa72fa020dc7",
    "cctx_index": [
      "0xe4d6cc027bf4b5e82488111267cb3b91f725fc08b475e8dad0941d331c72541f"
    ]
  }
}')
Do you get it? Simply put we have to use previous cctx_index to get new cctx_index that we'll use now on cctx url to get the status data for the tx.

=> The rest is as you understood - 'Step 4: Strategy chain transaction (extraction step)
Extracts outbound_params[0].hash from Step 3's cctx data
This hash represents the actual strategy chain transaction
No API call made, just data extraction
Step 5: Back to vault
Uses the hash extracted in Step 4 to call inboundHashToCctx/{hash_from_step4}
And so on...' this is what you said in the chat.