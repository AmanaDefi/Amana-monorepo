import { ITxLocalStorage } from "@/types/types";

export const VAULTS_INFO_KEY = "vaultsInfo";

export function updateLocalStorageObject(
  subKey: string,
  partialData: Partial<ITxLocalStorage> | null,
): boolean {
  if (typeof window === "undefined" || !window?.localStorage) {
    return false;
  }

  try {
    let vaultsData: { [key: string]: Partial<ITxLocalStorage> } = {};

    const existingVaultsInfoString = localStorage.getItem(VAULTS_INFO_KEY);

    if (existingVaultsInfoString !== null) {
      try {
        const parsedVaultsData = JSON.parse(existingVaultsInfoString);
        if (
          typeof parsedVaultsData === "object" &&
          parsedVaultsData !== null &&
          !Array.isArray(parsedVaultsData)
        ) {
          vaultsData = parsedVaultsData;
        } else {
          console.warn(
            `Found invalid data for key "${VAULTS_INFO_KEY}" in localStorage. ` +
              `Starting with an empty object for vaults data.`,
          );
          vaultsData = {};
        }
      } catch (error) {
        console.error(
          `Error parsing existing data for key "${VAULTS_INFO_KEY}" from localStorage. ` +
            `A new object will be created. Original error:`,
          error,
        );
        vaultsData = {};
      }
    }

    if (!partialData) {
      vaultsData[subKey] = {};
    } else {
      vaultsData[subKey] = {
        ...(vaultsData[subKey] || {}),
        ...partialData,
      };
    }

    localStorage.setItem(VAULTS_INFO_KEY, JSON.stringify(vaultsData));
    return true;
  } catch (error) {
    console.error(
      `Failed to update localStorage for key "${VAULTS_INFO_KEY}" (subKey: "${subKey}"). Error:`,
      error,
    );
    return false;
  }
}

export function getLocalStorageObject(subKey: string): ITxLocalStorage | null {
  if (typeof window === "undefined" || !window?.localStorage) {
    return null;
  }

  try {
    const vaultsInfoString = localStorage.getItem(VAULTS_INFO_KEY);

    if (vaultsInfoString === null) {
      return null;
    }

    let parsedVaultsData: { [key: string]: ITxLocalStorage };
    try {
      const parsedData = JSON.parse(vaultsInfoString);

      if (
        typeof parsedData === "object" &&
        parsedData !== null &&
        !Array.isArray(parsedData)
      ) {
        parsedVaultsData = parsedData;
      } else {
        console.warn(
          `Found invalid data format for key "${VAULTS_INFO_KEY}" in localStorage. Expected an object.`,
        );
        return null;
      }
    } catch (parseError) {
      console.error(
        `Error parsing data for key "${VAULTS_INFO_KEY}" from localStorage:`,
        parseError,
      );
      return null;
    }

    const specificItem = parsedVaultsData[subKey];

    if (
      typeof specificItem === "object" &&
      specificItem !== null &&
      !Array.isArray(specificItem)
    ) {
      return specificItem as ITxLocalStorage;
    } else {
      return null;
    }
  } catch (error) {
    console.error(
      `Failed to retrieve from localStorage for key "${VAULTS_INFO_KEY}" (subKey: "${subKey}"). Error:`,
      error,
    );
    return null;
  }
}

export const CheckTheTxIsInProgress = (vaultId: string) => {
  const TxVaultInfo = getLocalStorageObject(vaultId);
  console.log(TxVaultInfo);
  return (
    !!TxVaultInfo &&
    (TxVaultInfo?.crosschainInvestHash?.length > 0 ||
      TxVaultInfo?.isTransactionProcessing ||
      TxVaultInfo?.isTransactionStarted) &&
    !TxVaultInfo.finishedTransaction
  );
};
