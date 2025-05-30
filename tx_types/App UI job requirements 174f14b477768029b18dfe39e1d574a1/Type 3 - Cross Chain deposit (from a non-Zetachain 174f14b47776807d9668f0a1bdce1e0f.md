# Type 3 - Cross Chain deposit (from a non-Zetachain account to a vault with a Zetachain strategy)

![Screenshot 2025-01-08 at 11.43.31.png](Type%203%20-%20Cross%20Chain%20deposit%20(from%20a%20non-Zetachain%20174f14b47776807d9668f0a1bdce1e0f/Screenshot_2025-01-08_at_11.43.31.png)

Expected behaviour:

1. Input token is shown as native token of user chain, but user can choose another token from a list of that chain’s approved tokens (e.g.in the example above this is POL, on polygon chain). Alternative token is selected by clicking on the down arrow next to POL.
2. User wallet balance of input token is shown in bottom right hand corner of input box (e.g. in the example above it is 3.846262)
3. User enters deposit amount (must be < wallet balance of token)
4. User can also click on their wallet balance to deposit max amount of token (e.g. they click on the number 3.846262)
5. If input token is an ERC20 (i.e. not native token):
    1. User clicks approve button (if the amount hasn’t been approved in a previous tx, which it usually won’t have been)
    2. User confirms approval transaction in wallet (e.g. metamask)
    3. Message appears saying ***Approval in progress***, with rotating circle to show tx in progress
    4. Message appears saying ***Approval completed***, and **Approve** button changes to **Deposit**
6. User clicks **deposit** button
7. User confirms transaction in wallet (e.g. metamask)
8. Message appears saying ***Initial deposit transaction on local chain in progress***
9. [Initial `deposit-and-call` tx confirms on **local chain**], which triggers:
Message changes to ***Initial deposit transaction on local chain completed
and:***
Message on new line appears saying ***Cross chain transfer to vault in progress***
10. [`Deposit` event emitted by `AmanaZetachainVault` on **Zetachain**], which triggers:
Message changes to ***Cross chain transfer to vault completed
and:***
Message on new line appears saying ***Funds invested and shares issued***
    1. OR (if there is a problem with the cross-chain call from the connected chain to the vault):
    [`CrossChainDepositFailed` event emitted by WithdrawalReceiver on user’s chain], which triggers:
    Message changes to ***Cross chain transfer to vault failed*
    TERMINATE PROCESS HERE** - message disappears as soon as user performs another action (or change Deposit/Withdraw button to **Done**, waiting for user click)
11. User wallet balance and user vault balance updates automatically (without user having to refresh page)
12. Deposit amount reverts to zero and Deposit button disappears
13. ***Funds invested and shares issued*** message disappears as soon as user performs another action (or change Deposit/Withdraw button to **Done**, waiting for user click)