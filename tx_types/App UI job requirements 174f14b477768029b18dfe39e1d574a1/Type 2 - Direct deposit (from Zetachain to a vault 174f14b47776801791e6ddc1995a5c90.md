# Type 2 - Direct deposit (from Zetachain to a vault with a non-Zetachain strategy)

![Screenshot 2025-01-08 at 11.51.17.png](Type%202%20-%20Direct%20deposit%20(from%20Zetachain%20to%20a%20vault%20174f14b47776801791e6ddc1995a5c90/Screenshot_2025-01-08_at_11.51.17.png)

Expected behaviour:

1. Input token is locked as vault asset (this will be a ZRC20 - in the example above it shows ETH, but the underlying token is the ETH.BASE ZRC20)
2. User wallet balance of input token is shown in bottom right hand corner of input box (in this example it is 0.001247)
3. User enters deposit amount (must be < wallet balance of token, or FE shows error message and no button appears)
    
    ![Screenshot 2025-01-08 at 13.16.09.png](Type%202%20-%20Direct%20deposit%20(from%20Zetachain%20to%20a%20vault%20174f14b47776801791e6ddc1995a5c90/Screenshot_2025-01-08_at_13.16.09.png)
    
4. User can also click on their wallet balance to deposit max amount of token (in the example above it is 0.001247). This triggers the Approve button to be displayed, along with a message saying Transaction approval required - see below:
    
    ![Screenshot 2025-01-08 at 11.53.11.png](Type%201%20-%20Direct%20deposit%20(from%20Zetachain%20to%20a%20vault%20174f14b4777680f8a50be9fd7f40114b/Screenshot_2025-01-08_at_11.53.11.png)
    
5. User clicks approve button (if amount has not been approved already)
6. User confirms transaction in wallet (e.g. metamask)
7. Message changes from ***Transaction approval required*** to ***Approval in progress***, with rotating circle to show tx in progress
8. [**Approval** tx confirms on **zetachain**], which triggers:
Message appears saying ***Approval completed***, and Approve button changes to **Deposit**
9. User clicks **deposit** button
10. Message appears saying ***Initial deposit transaction on zetachain in progress***
11. [`CrossChainInvestSent` event emitted by **AmanaCrossChainVault** on **Zetachain = local tx succeeds**], which triggers:
Message changes to ***Initial deposit transaction on zetachain completed
and:***
Message on new line appears saying ***Cross chain transfer and investment of funds in progress***
12. [`FundsInvested` event emitted by **strategy** on **strategy** **chain = 1st cc tx OutboundMined**], which triggers:
Message changes to ***Cross chain transfer and investment of funds completed
and:***
New line appears saying ***Final confirmation and issue of shares by vault in progress***
    1. OR (if there is a problem with the cross-chain call from the vault to the strategy):
    [`CrossChainInvestFailed` event emitted by **AmanaCrossChainVault** on **Zetachain = 1st cc tx Reverted or Aborted**], which triggers:
    Message changes to ***Cross chain transfer and investment of funds failed
    and:***
    New line appears saying ***Return of funds to user in progress***
    2. and then:
    [`FundsReturned` event emitted by **WithdrawalReceiver** on **user chain = get hash from 2nd object in outbound_params**], which triggers:
    Message changes to ***Return of funds completed***
    TERMINATE PROCESS HERE - message disappears as soon as user performs another action (or change Deposit/Withdraw button to **Done**, waiting for user click)
13. Otherwise, if all goes well - 
[`Deposited` event emitted by vault on Zetachain = 2nd cc tx succeeds], which triggers:
Message changes to ***Final confirmation completed, shares issued by vault***
    1. OR (if there is a problem with the cross chain confirmation from the strategy back to the vault):
    [`InvestConfirmFailed` event emitted by **strategy** on strategy chain = 2nd cc tx Reverts or Aborts], which triggers:
    Message changes to ***Final confirmation failed, retrying…***
    TERMINATE PROCESS HERE - message disappears as soon as user performs another action (or change Deposit/Withdraw button to **Done**, waiting for user click)
14. User wallet balance and user vault balance updates automatically (without user having to refresh page)
15. Deposit amount reverts to zero and Deposit button disappears
16. ***Final confirmation completed, shares issued by vault*** message disappears as soon as user performs another action (or change Deposit/Withdraw button to **Done**, waiting for user click)

Tasks:

1. InputToken should already be selected when I open vault details page
2. Change message during Approval to Approval in progress
3. crossChainTxId is now generated in FE - use this to find the CrossChainInvest event
4. Wait for events long enough for deposit to complete
5. Update all confirmation messages in line with the steps above
6. Make sure wallet balance and user vault balance refresh automatically when deposit completes
7. Make sure 15 and 16 above also happen
8. Remove transaction confirmed toaster pop-up - or only show this when entire deposit completes.