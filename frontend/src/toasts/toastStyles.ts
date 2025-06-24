import { toast, ToastOptions } from "react-toastify";

const baseConfig: ToastOptions = {
  position: "bottom-left",
  autoClose: 5000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  closeButton: false,
};

export const loadingToast = (message: string) => {
  return toast.loading(message, {
    ...baseConfig,
    autoClose: false,
  });
};

export const successToast = (message: string) => {
  return toast.success(message, baseConfig);
};

export const errorToast = (message: string) => {
  return toast.error(message, {
    ...baseConfig,
    autoClose: 7000,
  });
};

export const warningToast = (message: string) => {
  return toast.warning(message, baseConfig);
};

export const infoToast = (message: string) => {
  return toast.info(message, baseConfig);
};
