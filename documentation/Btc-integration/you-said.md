**You are 100% correct.**  
Your logs clearly show:

- **publicKey is present and valid:**  
  ```
  publicKey: '039dca...302815'
  ```
- **signTransaction is present:**  
  ```
  hasSignTransaction: true
  ```
- **The error is:**  
  ```
  errorMessage: 'invalid psbt'
  ```

**This means:**  
- The wallet is connected and ready to sign.
- The problem is NOT the publicKey.
- The problem is that the transaction you are passing to `signTransaction` is NOT a valid Bitcoin PSBT (Partially Signed Bitcoin Transaction).

---

## **What’s Wrong?**

Your current `createCommitTransaction` and `createRevealTransaction` functions are returning a dummy object like:
```js
{
  type: 'commit',
  inscriptionContent: '0x5a0000...',
}
```
**This is NOT a real Bitcoin transaction or PSBT.**  
Wallets expect a real PSBT (see [bitcoinjs-lib-Examples](https://github.com/coinables/bitcoinjs-lib-Examples)), not a placeholder object.

---

## **What You Need to Do**

### **1. Use `bitcoinjs-lib` to Build a Real PSBT**

- **Install the library:**
  ```bash
  npm install bitcoinjs-lib
  ```
- **Construct a real PSBT in your `createCommitTransaction` and `createRevealTransaction` functions.**
- You need to:
  - Gather UTXOs for the sender address.
  - Build a transaction with proper inputs and outputs.
  - Add the inscription data (for commit/reveal, this may involve Taproot or Ordinals-style scripting).
  - Serialize the transaction as a PSBT.

**Example for a simple P2WPKH transaction:**  
(see [bitcoinjs-lib-Examples/p2wpkh.js](https://github.com/coinables/bitcoinjs-lib-Examples/blob/master/p2wpkh.js))
```js
const bitcoin = require('bitcoinjs-lib');
const network = bitcoin.networks.testnet; // or mainnet

const psbt = new bitcoin.Psbt({ network });
// Add inputs (UTXOs)
psbt.addInput({
  hash: '...',
  index: 0,
  witnessUtxo: {
    script: Buffer.from('...', 'hex'),
    value: 100000,
  },
  // ...other fields as needed
});
// Add outputs
psbt.addOutput({
  address: 'destination_btc_address',
  value: 90000, // amount in satoshis
});
// Add inscription data if needed (for Taproot/Ordinals, see their docs)
// Finalize and export PSBT
const psbtHex = psbt.toHex();
```
- Pass this PSBT to your wallet’s `signTransaction`.

---

## **Summary Table**

| What you have now         | What you need to do                |
|--------------------------|------------------------------------|
| Dummy object `{ type, inscriptionContent }` | Real PSBT using `bitcoinjs-lib` |
| Wallet throws `invalid psbt` | Wallet signs and broadcasts real tx |

---

## **References & Next Steps**

- [bitcoinjs-lib documentation](https://github.com/bitcoinjs/bitcoinjs-lib)
- [bitcoinjs-lib-Examples](https://github.com/coinables/bitcoinjs-lib-Examples)
- [Crafting a Blockchain Transaction with JavaScript (Medium)](https://medium.com/@cruzw/crafting-a-blockchain-transaction-with-javascript-3946bda1df7b)

---

**Action:**  
> Replace your dummy transaction construction with real PSBT creation using `bitcoinjs-lib`.  
> Once you do this, your wallet will be able to sign and broadcast the transaction, and the `invalid psbt` error will disappear.

If you want a code template for a real commit/reveal PSBT, let me know!