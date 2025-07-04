1. Local TX
0xa786c5b510113c400dca53eda1d471d7711f38229c67bf83f30b7226de9b3459

2. Cross chain Tx from Base to Vault on Zetachain
InboundHash = https://zetachain.blockpi.network/lcd/v1/public/zeta-chain/crosschain/inboundHashToCctx/0xa786c5b510113c400dca53eda1d471d7711f38229c67bf83f30b7226de9b3459

Result Details = https://zetachain.blockpi.network/lcd/v1/public/zeta-chain/crosschain/cctx/0xb0184142ae8d8363cc2d755692a2aec5ec0da24db63b1db4232a65f8eb570e14

3. Cross chain call from vault on ZC to strategy on strategy chain
InboundHash = 
https://zetachain.blockpi.network/lcd/v1/public/zeta-chain/crosschain/inboundHashToCctx/0xb0184142ae8d8363cc2d755692a2aec5ec0da24db63b1db4232a65f8eb570e14

Result Details = 
https://zetachain.blockpi.network/lcd/v1/public/zeta-chain/crosschain/cctx/0x1b5d83092e4c03a58c624f04056b128292cc99f16d4d58ef4ab287f63dbdbca6

4. Transaction on Strategy chain - Get the hash from 3rd step's data's outbound_params -> Hash. and use it on step 5th's URL

5. Cross chain call from strategy on strategy chain back to vault on ZC 
InboundHash = 
https://zetachain.blockpi.network/lcd/v1/public/zeta-chain/crosschain/inboundHashToCctx/0xe0697bffd721fc54581d5b492a49041bc818d8e77fb403171899af372345db26

Result Details = 
https://zetachain.blockpi.network/lcd/v1/public/zeta-chain/crosschain/cctx/0x03f322f2524bccac8021bf642082a1cbe0bb708aa382078897c0a1dff23bbf82



