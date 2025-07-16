We need to relook at the getDepositOutputAmount function in VaultInputs.ts. I think (a) this function has perhaps gotten too long and too complex, and (b) it's not really giving us what we need. We want to be able to show the user the amount that their deposit will be worth in terms of the input token that they're depositing with. So, this is taking into account firstly a potentialy deposit fee (on ethereum vaults), plus any potential slippage on a swap into vault asset. Then we need to see how many shares the deposit will get on the strategy chain, then convert that into an asset amount, then finally convert that back into the inputToken asset if need be. I think we need to trim this function down to do only what it needs to do, and to make sure that we're getting back what we need to display in the FE. 


## Type 2 Deposit without fee

input amount in vault asset, e.g. 100 USDC

This will go to strategy chain as 100 USDC (no swap needed)

This will get deposited into yield source, strategy contract receives X shares

X = call convertToShares(100000000) on strategy

This is equal to Y USDC

Y = call convertToAssets(X) on strategy

Y is what we show to user as deposit output amount (difference between 100 and Y = deposit slippage)

### So we show:

Input amount: 100 USDC ($99.95 USD)

Deposit Slippage: 100 - Y ($0.1 USD)

Output amount: Y USDC ($99.90 USD)

## Type 2 Deposit with fee

input amount in vault asset, e.g. 100 USDC

Deposit Fee, e.g. 5 USDC

This will go to strategy chain as 95 USDC (no swap needed)

This will get deposited into yield source, strategy contract receives X shares

X = call convertToShares(95000000) on strategy

This is equal to Y USDC

Y = call convertToAssets(X) on strategy

Y is what we show to user as deposit output amount (difference between 100 and Y = deposit slippage)

### So we show:

Input amount: 100 USDC ($99.95 USD)

Deposit Fee: 5 USDC ($4.99 USD)

Deposit Slippage: 100 - Y ($0.1 USD)

Output amount: Y USDC ($94.90 USD)

## Type 4 Deposit without fee

input amount in user chain input token, e.g. 0.01 ETH

This gets swapped on vault (unless input token ZRC20 = vault asset) from input token ZRC20 to vault asset. 

A = input amount to go to strategy = getPathDataAndAmountOut(inputTokenZRC20, vaultAsset, 0.01 * 10 ** 18)

B = original input amount out converted to vault asset token type - call getEquivalentInputAmount(vaultAsset, inputToken,amount) function on swapHelper on Zetachain 

Swap slippage = B - A

A is the amount that goes to strategy

This will get deposited into yield source, strategy contract receives C shares

C = call convertToShares(A) on strategy

This needs to be converted back to an asset amount

D = call convertToAssets(C) on strategy

### So we show:

Input amount: 0.01 USDC (e.g. $99.95 USD)

Swap Slippage: B - A ($0.1 USD)

Deposit Slippage: B - A - D ($0.1 USD)

Output amount: D USDC ($99.90 USD)

## Type 4 Deposit with fee

input amount in user chain input token, e.g. 0.01 ETH

Deposit Fee, e.g. 0.000001 ETH - use gas calculation functions to get this

The remaining amount (0.01 - 0.00001) gets swapped on vault (unless input token ZRC20 = vault asset) from input token ZRC20 to vault asset. 

input amount to go to strategy = A

A = getPathDataAndAmountOut(inputTokenZRC20, vaultAsset, 0.01 - 0.00001)

B = original input amount out converted to vault asset token type - call getEquivalentInputAmount(vaultAsset, inputToken,amount) function on swapHelper on Zetachain 

Swap slippage = B - A

A is the amount that goes to strategy

This will get deposited into yield source, strategy contract receives C shares

C = call convertToShares(A) on strategy

This needs to be converted back to an asset amount

D = call convertToAssets(C) on strategy

### So we show:

Input amount: 0.01 ETH ($99.95 USD)

Deposit Fee: 0.000001 ETH ($4.99 USD)

Swap Slippage: B - A ($0.1 USD)

Deposit Slippage: A - D, ($0.1 USD)

Output amount: D USDC ($94.90 USD)

### Important

- Calculate these things only once (not once on display of output amount and again on actual deposit)
- That means capturing input amount after deposit and minSharesOut in state
- Use viem rather than thirdweb for RPC calls
- Focus on implementing Type 4 with fee, with conditionals for fee and for swap