# GraphQL Запити для заміни функцій з actions.ts

## 1. Заміна `fetchUserVaultBalance` та `fetchUserVaultMaxRedeem`

Замість викликів:
- `fetchUserVaultBalance(userAddress, vaultAddress, decimals)`
- `fetchUserVaultMaxRedeem(decimals, userAddress, vaultAddress)`

Використовуйте:

```graphql
query GetUserVaultPosition($vaultId: ID!, $userAddress: Bytes!) {
  userPosition(id: "${vaultId}-${userAddress}") {
    id
    vault {
      id
      name
      symbol
      decimals
    }
    user
    sharesBalance
    assetsBalance
    totalDeposited
    totalWithdrawn
    firstDepositAt
    lastInteractionAt
    depositCount
    withdrawalCount
  }
}
```

## 2. Заміна `fetchTotalAssets`

Замість виклику:
- `fetchTotalAssets(vaultAddress)`

Використовуйте:

```graphql
query GetVaultTotalAssets($vaultId: ID!) {
  vault(id: $vaultId) {
    id
    tvl
    sharesSupply
    pricePerShare
    totalDeposited
    totalWithdrawn
  }
}
```

## 3. Заміна `useUpdateVaultBalanceAndTotal` (для всіх vault'ів користувача)

Замість хука `useUpdateVaultBalanceAndTotal`:

```graphql
query GetUserAllVaultPositions($userAddress: Bytes!) {
  userPositions(where: { user: $userAddress }) {
    id
    vault {
      id
      name
      symbol
      decimals
      tvl
      pricePerShare
      strategyNetwork
    }
    sharesBalance
    assetsBalance
    totalDeposited
    totalWithdrawn
    lastInteractionAt
  }
}
```

## 4. Отримання історії депозитів користувача

```graphql
query GetUserDeposits($userAddress: Bytes!, $vaultId: ID) {
  deposits(
    where: { 
      user: $userAddress
      vault: $vaultId
    }
    orderBy: timestamp
    orderDirection: desc
    first: 50
  ) {
    id
    vault {
      name
      symbol
    }
    amount
    shares
    timestamp
    transactionHash
    pricePerShare
    crossChainTxId
  }
}
```

## 5. Отримання історії виводів користувача

```graphql
query GetUserWithdrawals($userAddress: Bytes!, $vaultId: ID) {
  withdrawals(
    where: { 
      user: $userAddress
      vault: $vaultId
    }
    orderBy: timestamp
    orderDirection: desc
    first: 50
  ) {
    id
    vault {
      name
      symbol
    }
    amount
    shares
    timestamp
    transactionHash
    pricePerShare
    crossChainTxId
  }
}
```

## 6. Отримання статистики vault'а за день

```graphql
query GetVaultDayData($vaultId: ID!, $days: Int!) {
  vaultDayDatas(
    where: { vault: $vaultId }
    orderBy: date
    orderDirection: desc
    first: $days
  ) {
    id
    date
    tvl
    sharesSupply
    dailyDeposit
    dailyWithdraw
    pricePerShare
    depositCount
    withdrawalCount
    uniqueDepositors
    uniqueWithdrawers
  }
}
```

## 7. Отримання всіх vault'ів з основною інформацією

```graphql
query GetAllVaults {
  vaults(first: 20) {
    id
    name
    symbol
    asset
    decimals
    strategy
    strategyNetwork
    tvl
    sharesSupply
    pricePerShare
    totalDeposited
    totalWithdrawn
    createdAtTimestamp
  }
}
```

## 8. Отримання топ депозиторів vault'а

```graphql
query GetTopDepositors($vaultId: ID!) {
  userPositions(
    where: { vault: $vaultId }
    orderBy: assetsBalance
    orderDirection: desc
    first: 10
  ) {
    user
    assetsBalance
    sharesBalance
    totalDeposited
    depositCount
    firstDepositAt
  }
}
```

## 9. Отримання останніх транзакцій vault'а

```graphql
query GetRecentVaultActivity($vaultId: ID!) {
  deposits(
    where: { vault: $vaultId }
    orderBy: timestamp
    orderDirection: desc
    first: 10
  ) {
    id
    user
    amount
    shares
    timestamp
    transactionHash
  }
  
  withdrawals(
    where: { vault: $vaultId }
    orderBy: timestamp
    orderDirection: desc
    first: 10
  ) {
    id
    user
    amount
    shares
    timestamp
    transactionHash
  }
}
```

## 10. Отримання детальної інформації про позицію користувача з історією

```graphql
query GetUserPositionDetails($vaultId: ID!, $userAddress: Bytes!) {
  userPosition(id: "${vaultId}-${userAddress}") {
    id
    vault {
      id
      name
      symbol
      decimals
      pricePerShare
    }
    user
    sharesBalance
    assetsBalance
    totalDeposited
    totalWithdrawn
    totalSharesReceived
    totalSharesRedeemed
    firstDepositAt
    lastInteractionAt
    depositCount
    withdrawalCount
  }
  
  deposits(
    where: { 
      vault: $vaultId
      user: $userAddress
    }
    orderBy: timestamp
    orderDirection: desc
    first: 20
  ) {
    amount
    shares
    timestamp
    transactionHash
    pricePerShare
  }
  
  withdrawals(
    where: { 
      vault: $vaultId
      user: $userAddress
    }
    orderBy: timestamp
    orderDirection: desc
    first: 20
  ) {
    amount
    shares
    timestamp
    transactionHash
    pricePerShare
  }
}
```

## Переваги використання сабграфа:

1. **Швидкість**: Один запит замість множинних викликів контрактів
2. **Історія**: Доступ до історичних даних депозитів/виводів
3. **Агрегація**: Готові агреговані дані (денна статистика, топи користувачів)
4. **Кешування**: Автоматичне кешування даних
5. **Реальний час**: Автоматичне оновлення при нових подіях
6. **Зменшення навантаження**: Менше RPC викликів до блокчейну

## Інтеграція з фронтендом:

Замість хуків типу `useUpdateVaultBalanceAndTotal`, створіть хуки що використовують GraphQL:

```typescript
const useUserVaultPositions = (userAddress: string) => {
  return useQuery(GET_USER_ALL_VAULT_POSITIONS, {
    variables: { userAddress },
    pollInterval: 30000, // Оновлювати кожні 30 секунд
  });
};
``` 