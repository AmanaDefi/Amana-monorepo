import { useAPYStore } from "@/store/APYStore";
import { useTransactionStore } from "@/store/transactionStore";

export interface APYDisplayConfig {
  apyValue?: number;
  vaultId: string;
}

export interface APYDisplayResult {
  displayText: string;
  textClass: string;
  arrowColor: string;
  shouldRotate: boolean;
  shouldRotateRight: boolean;
  isDefined: boolean;
}

export const useAPYDisplay = ({
  apyValue,
  vaultId,
}: APYDisplayConfig): APYDisplayResult => {
  const { getAPYDirection, hasAPYChangeData, activeTransactionVaultId } =
    useAPYStore();
  const { finishedTransaction } = useTransactionStore();

  const isDefined = typeof apyValue === "number";
  const isNegative = isDefined && apyValue < 0;

  const apyDirection = getAPYDirection(vaultId);
  const hasChangeData = hasAPYChangeData(vaultId);

  const displayText = isDefined
    // ? `${isNegative ? "-" : ""}${(Math.abs(apyValue!) * 100).toFixed(2)}%`
    // : "--";
    
    ? `${isNegative ? "-" : ""}${Math.abs(apyValue!).toFixed(2)}%`
    : "N/A";

  const textClass = [
    "font-bold text-xl leading-5",
    isNegative || !isDefined ? "text-white" : "text-green-accent",
  ].join(" ");

  let arrowColor: string;
  let shouldRotate = false;
  let shouldRotateRight = false;

  if (!isDefined) {
    arrowColor = "#666666";
  } else {
    const shouldShowAPYChange =
      hasChangeData &&
      finishedTransaction &&
      activeTransactionVaultId === vaultId;

    if (shouldShowAPYChange) {
      switch (apyDirection) {
        case "up":
          arrowColor = "#05D47F";
          shouldRotate = false;
          break;
        case "down":
          arrowColor = "#FF1E1E";
          shouldRotate = true;
          break;
        case "unchanged":
          arrowColor = "#FFA500";
          shouldRotateRight = true;
          break;
      }
    } else {
      if (isNegative) {
        arrowColor = "#FF1E1E";
        shouldRotate = true;
      } else {
        arrowColor = "#05D47F";
        shouldRotate = false;
      }
    }
  }

  return {
    displayText,
    textClass,
    arrowColor,
    shouldRotate,
    shouldRotateRight,
    isDefined,
  };
};
