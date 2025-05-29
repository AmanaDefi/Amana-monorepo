# Type 2 - Direct Withdrawal (User on Zetachain withdrawing from a vault with a non-Zetachain strategy)

![Screenshot 2025-01-08 at 13.28.44.png](Type%201%20-%20Direct%20Withdrawal%20(User%20on%20Zetachain%20with%20175f14b477768007a209f2f36d92b270/Screenshot_2025-01-08_at_13.28.44.png)

- This type of deposit uses the `executeDirectWithdrawal` function in actions.ts
- The default and only `withdrawToken` here will be the vault asset. e.g. for a vault which takes USDC.ETH, the `withdrawToken` will be USDC.ETH

### Expected behaviour:

- This type of deposit uses the `executeDirectWithdrawal` function in actions.ts
- The default and only `withdrawToken` here will be the vault asset. e.g. for a vault which takes USDC.ETH, the `withdrawToken` will be USDC.ETH
1. Withdraw token is locked as vault asset (this will be a ZRC20 - in the example above it shows ETH, but the underlying token is the ETH.BASE ZRC20)
2. User maxWithdraw from vault is shown in bottom right hand corner of input box (in this example it is 0.001247 in terms of the vault asset, e.g. ETH in this case - NOTE - the example above is slightly incorrect in this case, it is showing vault balance of shares, which needs to be changed to maxWithdraw)
3. User enters withdraw amount (must be < maxWithdraw, or FE shows ***Insufficient balance***, and withdraw button does not appear)
    
    ![Screenshot 2025-01-08 at 13.31.51.png](Type%201%20-%20Direct%20Withdrawal%20(User%20on%20Zetachain%20with%20175f14b477768007a209f2f36d92b270/Screenshot_2025-01-08_at_13.31.51.png)
    
4. User can also click on their wallet balance to withdraw max amount of token (in the example above it is 0.0012). 
5. If the amount entered is a legitimate amount, then the withdraw button appears, along with a message that says ***Withdraw confirmation required***
    
    ![Screenshot 2025-01-08 at 13.33.25.png](Type%201%20-%20Direct%20Withdrawal%20(User%20on%20Zetachain%20with%20175f14b477768007a209f2f36d92b270/Screenshot_2025-01-08_at_13.33.25.png)
    
6. User clicks withdraw button
7. Message appears saying Withdrawing 0.001 ETH***,*** with rotating circle to show tx in progress, and the withdraw button gets greyed out and deactivated so the user can’t click it again.
    
    ![Screenshot 2025-01-08 at 13.34.35.png](Type%201%20-%20Direct%20Withdrawal%20(User%20on%20Zetachain%20with%20175f14b477768007a209f2f36d92b270/Screenshot_2025-01-08_at_13.34.35.png)
    
8. User confirms transaction in wallet (e.g. metamask)
9. Message appears saying ***Initial withdraw transaction on zetachain in progress***
10. [`DivestSent` event emitted by **`AmanaConnectedChainVault`** on **Zetachain = local tx succeeds**], which triggers:
Message changes to ***Initial withdraw transaction on zetachain completed
and:***
Message on new line appears saying ***Divestment of funds from strategy in progress***
11. [`FundsDivested` event emitted by **strategy** on **strategy** **chain = 1st cc tx OutboundMined**], which triggers:
Message changes to ***Divestment of funds from strategy completed
and:***
New line appears saying ***Withdrawal confirmation and return of funds in progress***
    1. OR (if there is a problem with the cross-chain call from the vault to the strategy):
    [`DivestFailed` event emitted by **AmanaConnectedChainVault** on **Zetachain = 1st cc tx Reverts or Aborts**], which triggers:
    Message changes to ***Divestment of funds from strategy failed, please try again later*
    TERMINATE PROCESS HERE** - message disappears as soon as user performs another action (or change Deposit/Withdraw button to **Done**, waiting for user click)
12. Otherwise - all going well - 
[`ReturnFundsToUserSent` event emitted by `AmanaConnectedChainVault` on Zetachain = 2nd cc tx OutboundMined], which triggers:
Message changes to ***Withdrawal confirmation completed, funds returned***
13. User wallet balance and user vault balance updates automatically (without user having to refresh page)
14. Withdraw amount reverts to zero and button disappears
15. ***Withdrawal confirmation completed, funds returned*** message disappears as soon as user performs another action (or change Deposit/Withdraw button to **Done**, waiting for user click)