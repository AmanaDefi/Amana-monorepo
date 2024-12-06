import { ParseEventLogsResult } from "thirdweb";
import { TransactionResult } from "../types/types"

export const formatTotalAssets = (totalAssets: string, decimals: number): string => {
  const value = Number(totalAssets) / Math.pow(10, decimals);
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export const formatUSDCBalance = (usdcBalance: string): string => {
  const value = Number(usdcBalance) / Math.pow(10, 6);
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export const getWalletAddressOnceCreated = (
  eventLog: ParseEventLogsResult<any, boolean> | undefined,
  transactionResult: TransactionResult | undefined,
  prevTransaction: TransactionResult | null,
  updatePrevTransaction: (transaction: TransactionResult | null) => void
): string | null => {
  if (transactionResult && transactionResult !== prevTransaction) {
    updatePrevTransaction(transactionResult);
    if (eventLog && eventLog.length > 0) {
      const latestEvent = eventLog[eventLog.length - 1];
      if (latestEvent && latestEvent.topics[1]) {
        return formatAddress(latestEvent.topics[1]);
      }
    }
  }
  return null;
};


export function formatAddress(rawAddress: string): string {
  if (!rawAddress.startsWith("0x")) {
    rawAddress = "0x" + rawAddress;
  }

  const formattedAddress = "0x" + rawAddress.slice(-40);

  return formattedAddress;
}

export const NumberFormatter = Intl.NumberFormat("en", {
  //@ts-ignore
  notation: "compact",
});


export function getVaultErrorMessage(
  value: string,
  inputValue: string | undefined,
  setShowModal: Function
): string {

  // Input > Balance
  if (Number(value) > Number(inputValue)) {
    setShowModal(false)
    return "Insufficient balance"
  }

  else {
    if (Number(value) == 0) {
      setShowModal(false)
    }
    else {
      setShowModal(true)
    }
    return ""
  }
}

export function formatCurrency(amount: number): string {
  if (Number.isNaN(amount)) {
    return "0.00";
  }
  // Convert the amount to a string and split it into integer and decimal parts
  const [integerPart, decimalPart] = amount == 0 ? amount.toFixed(2).toString().split('.') : amount.toString().split('.');

  // Use a regular expression to add commas to the integer part
  const formattedIntegerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  // Combine the formatted integer part with the decimal part
  return `${formattedIntegerPart}.${decimalPart}`;
}

function findFirstNonZeroPosition(num: number): number {
  // Convert the number to a string, ensuring precision
  const numStr: string = num.toFixed(40); // Adjust precision as needed

  // Check if the number is in scientific notation
  if (numStr.includes('e')) {
    const parts: string[] = numStr.split('e');
    const decimalPart: string = parts[0].split('.')[1] || '';
    const exponent: number = parseInt(parts[1], 10);

    // Find the first non-zero digit
    const firstNonZeroIndex: number = decimalPart.search(/[1-9]/);
    if (firstNonZeroIndex !== -1) {
      return exponent + (firstNonZeroIndex + 1); // Adjust for the exponent
    }
  }

  // Split the string into integer and decimal parts
  const parts: string[] = numStr.split('.');

  // If there's no decimal part, return -1 (indicating no non-zero found)
  if (parts.length < 2) {
    return -1;
  }

  const decimalPart: string = parts[1];

  // Iterate through the decimal part to find the first non-zero digit
  for (let i = 0; i < decimalPart.length; i++) {
    if (decimalPart[i] !== '0') {
      return i; // Return the index of the first non-zero digit
    }
  }

  return -1; // Return -1 if no non-zero digit is found
}

export function formatBalance(balance: number) {

  const position = findFirstNonZeroPosition(balance);
  let remaining: string;
  if (balance >= 1) {
    remaining = balance.toFixed(2)
  }
  else if (balance == 0) {
    remaining = "0.00"
  }
  else {
    remaining = '0.' + balance.toString().split(".")[1]?.slice(0, position + 1);
  }
  return remaining;
}

