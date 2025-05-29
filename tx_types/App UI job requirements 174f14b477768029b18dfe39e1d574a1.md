# App UI job requirements

Context:

I have a frontend built in React-NextJS, using thirdweb for a lot of the web3 functionality.

This frontend should enable the functionality detailed here: 

[App Functionality Requirements](https://www.notion.so/App-Functionality-Requirements-173f14b4777680d59593ec9a7c2d3676?pvs=21)

Basically, users should be able to **see a list of vaults**, and **deposit** to and **withdraw** from these vaults from this frontend.

They should be able to do this from **any of the zetachain-connected EVM chains** (zetachain, ethereum, polygon, base, bsc)

A lot of this is built already. The problems are as follows:

- ~~Deposit button doesn’t display when I try to deposit~~
- Confirmations are not showing accurately
- Confirmation UI doesn’t look great - the confirmation graphic doesn’t line up with the confirmation message perfectly
- Confirmation messages aren’t accurate - e.g. the first message says “Deposit completed” when it should be something like “Local transaction completed” - see the detailed descriptions of the four deposit types and four withdrawal types for what these should say.
- For a deposit, the input token should automatically be selected as the most obvious choice for that vault - for example, if it is an eth vault, the automatic selection should be eth (for the given chain). Or maybe the simplest is we default to the native token of the connected chain.
- If a user cancels the metamask confirmation during approval, the approve button remains greyed out - I suspect the case might be the same for deposit. Expected behaviour - the approve (or deposit / withdraw) button should become active again if user cancels the metamask confirmation.

## Deposits

There are essentially four types of deposit transactions that need to be catered for:

[Type 1 - Direct deposit (from Zetachain to a vault with a Zetachain strategy)](App%20UI%20job%20requirements%20174f14b477768029b18dfe39e1d574a1/Type%201%20-%20Direct%20deposit%20(from%20Zetachain%20to%20a%20vault%20174f14b4777680f8a50be9fd7f40114b.md)

[Type 2 - Direct deposit (from Zetachain to a vault with a non-Zetachain strategy)](App%20UI%20job%20requirements%20174f14b477768029b18dfe39e1d574a1/Type%202%20-%20Direct%20deposit%20(from%20Zetachain%20to%20a%20vault%20174f14b47776801791e6ddc1995a5c90.md)

[Type 3 - Cross Chain deposit (from a non-Zetachain account to a vault with a Zetachain strategy)](App%20UI%20job%20requirements%20174f14b477768029b18dfe39e1d574a1/Type%203%20-%20Cross%20Chain%20deposit%20(from%20a%20non-Zetachain%20174f14b47776807d9668f0a1bdce1e0f.md)

[Type 4 - Cross Chain deposit (from a non-Zetachain account to a vault with a non-Zetachain strategy)](App%20UI%20job%20requirements%20174f14b477768029b18dfe39e1d574a1/Type%204%20-%20Cross%20Chain%20deposit%20(from%20a%20non-Zetachain%20174f14b4777680839706fe94b3d34961.md)

## Withdrawals

There are also four types of withdrawal transactions:

[Type 1 - Direct Withdrawal (User on Zetachain withdrawing to a vault with a Zetachain strategy)](App%20UI%20job%20requirements%20174f14b477768029b18dfe39e1d574a1/Type%201%20-%20Direct%20Withdrawal%20(User%20on%20Zetachain%20with%20175f14b477768007a209f2f36d92b270.md)

[Type 2 - Direct Withdrawal (User on Zetachain withdrawing from a vault with a non-Zetachain strategy)](App%20UI%20job%20requirements%20174f14b477768029b18dfe39e1d574a1/Type%202%20-%20Direct%20Withdrawal%20(User%20on%20Zetachain%20with%20175f14b47776805289beca39db120e68.md)

[Type 3 - Cross chain withdrawal (from a non-Zetachain chain to a vault with a Zetachain strategy)](App%20UI%20job%20requirements%20174f14b477768029b18dfe39e1d574a1/Type%203%20-%20Cross%20chain%20withdrawal%20(from%20a%20non-Zetach%20175f14b4777680f7a580d64521287a7f.md)

[Type 4 - Cross chain withdrawal (from a non-Zetachain account to a vault with a non-Zetachain strategy)](App%20UI%20job%20requirements%20174f14b477768029b18dfe39e1d574a1/Type%204%20-%20Cross%20chain%20withdrawal%20(from%20a%20non-Zetach%20175f14b47776806b8558ccb60d35eec6.md)

## Key considerations:

- We also need to look at the speed and responsiveness of the FE - at the moment there may be some ways that things are being done that are not optimal, e.g. how certain addresses and chain ID’s etc are retrieved - we should minimize blockchain calls where we can, if hardcoding these is going to speed up the site. Balanced against this is the consideration that certain elements could be hacked, or that they could just become outdated, e.g. if a strategy attached to a certain vault changes.

## Additional tasks:

1. Add slippage as a parameter to the FE:
    1. User should be able to set the max slippage that they will accept on the swap that is involved with cross chain tx’s
    2. The only time a swap isn’t needed is if the user is on the same connected chain as the strategy to which they want to deposit. E.g. if they are on Base and they are depositing into a vault which has a strategy also on Base.
    3. The slippage parameter gets added into the payload of the depositAndCall call.
    4. At the moment this is hardcoded as 200 on the FE
2. Add something to the frontend that shows predicted slippage of the swap involved in the deposit or withdrawal that the user is considering
    1. This will have to ping the swap router to see getAmountsOut, using the input amount that the user has put in, and knowing the inputToken and the vault asset (on deposit).
    2. This should update dynamically as the user changes the input amount
    3. If the user is specifying a max slippage that is less than the slippage predicted, then the deposit button should grey out
    4. All of the above needs to be implemented appropriately for the withdraw tx as well

Btw - I really like the new Euler UI:

![Screenshot 2025-01-16 at 09.19.45.png](App%20UI%20job%20requirements%20174f14b477768029b18dfe39e1d574a1/Screenshot_2025-01-16_at_09.19.45.png)