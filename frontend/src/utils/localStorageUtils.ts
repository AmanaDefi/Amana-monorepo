import { ITxLocalStorage } from "@/types/types";

export function updateLocalStorageObject(
    storageKey: string,
    partialData: Partial<ITxLocalStorage> 
  ): boolean {
    if (typeof window === 'undefined' || !window.localStorage) {
      console.warn('localStorage is not available. Cannot update item.');
      return false;
    }
    console.log('updateLocalStorageObject', 'storageKey:', storageKey, 'partialData', partialData)
  
    try {
      let currentObject: Partial<ITxLocalStorage>  = {};
      const existingItemString = localStorage.getItem(storageKey);

      console.log('existingItemString !== null', existingItemString !== null, `"${storageKey}"`)
  
      if (existingItemString !== null) {
        try {
          const parsedData = JSON.parse(existingItemString);
          console.log(parsedData)
          if (typeof parsedData === 'object' && parsedData !== null && !Array.isArray(parsedData)) {
            console.log('valid parsed data')
            currentObject = parsedData;
          } else {
            if (!(typeof parsedData === 'object' && parsedData !== null && !Array.isArray(parsedData))) {
              console.log('inValid parsed data', typeof parsedData === 'object', parsedData !== null, !Array.isArray(parsedData))
              currentObject = {};
            }
          }
        } catch (error) {
          console.error(
            `Error parsing existing data for key "${storageKey}" from localStorage. ` +
            `A new object will be formed using only the partial data. Original error:`,
            error
          );
        }
      }
  
      const updatedObject = {
        ...currentObject,
        ...partialData,
      };

      console.log('updateLocalStorageObject', 'updatedObject:', updatedObject)
  
      localStorage.setItem(storageKey, JSON.stringify(updatedObject));
      return true;
    } catch (error) {
      console.error(`Failed to set/update localStorage item with key "${storageKey}":`, error);
      return false;
    }
  }

  export function getLocalStorageObject(
      storageKey: string,
  ): ITxLocalStorage | null {
      if (typeof window === 'undefined' || !window.localStorage) {
          return null;
      }
  
      try {
          const itemString = localStorage.getItem(storageKey);
          if (itemString === null) {
              return null;
          }
          const parsedData = JSON.parse(itemString);
          if (typeof parsedData === 'object' && parsedData !== null && !Array.isArray(parsedData)) {
               return parsedData as ITxLocalStorage;
          }
          return null;
      } catch (error) {
          return null;
      }
  }

  export const CheckTheTxIsInProgress = (vaultId: string) => {
    const TxVaultInfo = getLocalStorageObject(vaultId)
    return (!!TxVaultInfo && (TxVaultInfo?.crosschainInvestHash?.length > 0 || TxVaultInfo?.isTransactionProcessing || TxVaultInfo?.isTransactionStarted) && !TxVaultInfo.finishedTransaction)
  }