import { toast } from "react-toastify";

import { loadingToast, successToast, errorToast } from "./toastStyles";

export function showLoadingToast(message: string = "Transaction pending!") {
  loadingToast(message)
}

export function showSuccessToast(message: string = "Transaction successful!") {
  toast.dismiss();
  successToast(message);
}

export function showErrorToast(
  error: any = "An error occurred while interacting with the contract."
) {
  const errorMessage = extractRevertReason(error);
  toast.dismiss();
  errorToast(errorMessage)
}

function extractRevertReason(error: any): string {
  if (error.reason) {
    return error.reason;
  }

  if (error.data && error.data.message) {
    return error.data.message;
  }

  return error;
}
