# Type 1 - Direct deposit (from Zetachain to a vault with a Zetachain strategy)

![Screenshot 2025-01-13 at 18.06.11.png](Type%201%20-%20Direct%20deposit%20(from%20Zetachain%20to%20a%20vault%20174f14b4777680f8a50be9fd7f40114b/Screenshot_2025-01-13_at_18.06.11.png)

- This type of deposit uses the executeDirectDeposit function in actions.ts
- The default and only inputToken here will be the vault asset. e.g. for a vault which takes USDC.ETH, the inputToken will be USDC.ETH

Expected behaviour:

1. Input token is locked as vault asset (this will be a ZRC20 - in the example above it shows ETH, but the underlying token is the ETH.BASE ZRC20)
2. User wallet balance of input token is shown in bottom right hand corner of input box (in this example it is 0.001247)
3. User enters deposit amount (must be < wallet balance of token, or FE shows ***Insufficient balance***, and approve/deposit button does not appear)
    
    ![Screenshot 2025-01-08 at 13.16.09.png](Type%201%20-%20Direct%20deposit%20(from%20Zetachain%20to%20a%20vault%20174f14b4777680f8a50be9fd7f40114b/Screenshot_2025-01-08_at_13.16.09.png)
    
4. User can also click on their wallet balance to deposit max amount of token (in the example above it is 0.001247). 
5. If the amount to be deposited has not been approved before (which will usually be the case), then:
    1. A legitimate amount being entered triggers the Approve button to be displayed, along with a message saying Transaction approval required - see below:
        
        ![Screenshot 2025-01-08 at 11.53.11.png](Type%201%20-%20Direct%20deposit%20(from%20Zetachain%20to%20a%20vault%20174f14b4777680f8a50be9fd7f40114b/Screenshot_2025-01-08_at_11.53.11.png)
        
    2. User clicks approve button
    3. User confirms transaction in wallet (e.g. metamask)
    4. Message changes from ***Transaction approval required*** to ***Approval in progress***, with rotating circle to show tx in progress
    5. [**Approval** tx confirms on **zetachain**], which triggers:
    Message appears saying ***Approval completed***, and Approve button changes to **Deposit**
6. User clicks **deposit** button
7. User confirms transaction in wallet (e.g. metamask)
8. Message appears saying ***Deposit in progress,*** with rotating circle to show tx in progress
9. [**deposit** tx confirms on **zetachain,** `Deposit` event gets emitted by `AmanaZetachainVault`], which triggers:
Message changes to ***Deposit completed***
10. User wallet balance and user vault balance updates automatically (without user having to refresh page)
11. Deposit amount reverts to zero and Deposit button disappears
12. ***Deposit completed*** message disappears as soon as user performs another action (or change Deposit/Withdraw button to **Done**, waiting for user click)

Task 1: Input token should show USDC.ETH straight away (currently it shows no selection)

Task 2: On deposit, the confirmation shows Waiting on CrossChainInvest, this is not correct