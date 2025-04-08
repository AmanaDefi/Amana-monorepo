import { toast, ToastOptions } from "react-toastify";

// Define a default toast style
const defaultToastStyle = {
  borderRadius: "4px",
  padding: "16px",
  backgroundColor: "#23262f",
  color: "#FFFFFF",
  fontSize: "18px",
  border: "1px solid #353945",
};

// Common toast configuration
const commonToastConfig: ToastOptions = {
  position: "bottom-left",
  closeButton: true, // Using the default close button
  progressStyle: {
    background: "#4B4D59",
    height: "4px",
  },
  autoClose: 5000,
  hideProgressBar: false,
  // Custom close button styling using CSS classes and the toastify API
  // rather than direct JSX
  className: "custom-toast",
  bodyClassName: "custom-toast-body",
  progressClassName: "custom-toast-progress",
  closeOnClick: true,
};

// Loading Toast
export const loadingToast = (message: string) => {
  toast(message, {
    style: { ...defaultToastStyle },
    ...commonToastConfig,
    progressStyle: {
      ...commonToastConfig.progressStyle,
      background: "#06afbc",
    },
    className: "custom-toast custom-toast-loading",
  });
};

// Success Toast
export const successToast = (message: string) => {
  toast.success(message, {
    style: {
      ...defaultToastStyle,
    },
    ...commonToastConfig,
    progressStyle: {
      ...commonToastConfig.progressStyle,
      background: "#34C759",
    },
    className: "custom-toast custom-toast-success",
  });
};

// Error Toast
export const errorToast = (message: string) => {
  toast.error(message, {
    style: {
      ...defaultToastStyle,
    },
    ...commonToastConfig,
    progressStyle: {
      ...commonToastConfig.progressStyle,
      background: "#D43D44",
    },
    className: "custom-toast custom-toast-error",
  });
};

// Warning Toast
export const warningToast = (message: string) => {
  toast.warning(message, {
    style: {
      ...defaultToastStyle,
      border: "1px solid #FFD60A",
      color: "#FFD60A",
    },
    ...commonToastConfig,
    progressStyle: {
      ...commonToastConfig.progressStyle,
      background: "#FFD60A",
    },
    className: "custom-toast custom-toast-warning",
  });
};

// Info Toast
export const infoToast = (message: string) => {
  toast.info(message, {
    style: {
      ...defaultToastStyle,
      border: "1px solid #0EA5E9",
      color: "#0EA5E9",
    },
    ...commonToastConfig,
    progressStyle: {
      ...commonToastConfig.progressStyle,
      background: "#0EA5E9",
    },
    className: "custom-toast custom-toast-info",
  });
};