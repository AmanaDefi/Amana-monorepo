import { ITxLocalStorage } from "@/types/types";

export function updateLocalStorageObject(
  storageKey: string,
  partialData: Partial<ITxLocalStorage>,
): boolean {
  if (typeof window === "undefined" || !window?.localStorage) {
    return false;
  }

  try {
    let currentObject: Partial<ITxLocalStorage> = {};
    const existingItemString = localStorage.getItem(storageKey);

    if (existingItemString !== null) {
      try {
        const parsedData = JSON.parse(existingItemString);
        if (
          typeof parsedData === "object" &&
          parsedData !== null &&
          !Array.isArray(parsedData)
        ) {
          currentObject = parsedData;
        } else {
          if (
            !(
              typeof parsedData === "object" &&
              parsedData !== null &&
              !Array.isArray(parsedData)
            )
          ) {
            currentObject = {};
          }
        }
      } catch (error) {
        console.log(
          `Error parsing existing data for key "${storageKey}" from localStorage. ` +
            `A new object will be formed using only the partial data. Original error:`,
          error,
        );
      }
    }

    const updatedObject = {
      ...currentObject,
      ...partialData,
    };

    localStorage.setItem(storageKey, JSON.stringify(updatedObject));
    return true;
  } catch (error) {
    console.log(
      `Failed to set/update localStorage item with key "${storageKey}":`,
      error,
    );
    return false;
  }
}

export function getLocalStorageObject(
  storageKey: string,
): ITxLocalStorage | null {
  if (typeof window === "undefined" || !window?.localStorage) {
    return null;
  }

  try {
    const itemString = localStorage.getItem(storageKey);
    if (itemString === null) {
      return null;
    }
    const parsedData = JSON.parse(itemString);
    if (
      typeof parsedData === "object" &&
      parsedData !== null &&
      !Array.isArray(parsedData)
    ) {
      return parsedData as ITxLocalStorage;
    }
    return null;
  } catch (error) {
    return null;
  }
}

export const CheckTheTxIsInProgress = (vaultId: string) => {
  const TxVaultInfo = getLocalStorageObject(vaultId);
  return (
    !!TxVaultInfo &&
    (TxVaultInfo?.crosschainInvestHash?.length > 0 ||
      TxVaultInfo?.isTransactionProcessing ||
      TxVaultInfo?.isTransactionStarted) &&
    !TxVaultInfo.finishedTransaction
  );
};
