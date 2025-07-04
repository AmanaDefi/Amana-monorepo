## Sequence of a Type 4 deposit Failure (from Conn Chain)

- Initial local transaction on Local chain -
Local Hash - 0x4e4e30d0b303d22bf83288a4e5104385247de0c19a0d4ad06abe55e324665549 | https://basescan.org/tx/

- Cross chain Tx from Base (Local Chain) to Vault on Zetachain -
Blockpi API call using Tx hash from local chain -
inboundHashtocctx - https://zetachain.blockpi.network/lcd/v1/public/zeta-chain/crosschain/inboundHashToCctx/0x4e4e30d0b303d22bf83288a4e5104385247de0c19a0d4ad06abe55e324665549 | 
result TX details - https://zetachain.blockpi.network/lcd/v1/public/zeta-chain/crosschain/cctx/0x859b5241ccc9fbacb7aadc834eacddc2ecfc14d0927055935b624a6639eaad19 | 

- Cross chain call from vault on ZC to strategy on strategy chain | 
inboundhashtocctx - https://zetachain.blockpi.network/lcd/v1/public/zeta-chain/crosschain/inboundHashToCctx/0x859b5241ccc9fbacb7aadc834eacddc2ecfc14d0927055935b624a6639eaad19 | 
result TX detatils - https://zetachain.blockpi.network/lcd/v1/public/zeta-chain/crosschain/cctx/0xf84f7b31546317e169f0671c634389adfc33be1d8a1a1db9eda1a34d39673a2f | Look at cctx endpoint.
