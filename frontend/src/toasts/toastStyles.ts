import { toast } from "react-toastify";

// Define a default toast style
const defaultToastStyle = {
  borderRadius: "4px",
  padding: "16px",
  backgroundColor: "#23262f",
  color: "#FFFFFF",
  fontSize: "18px",
  border: "1px solid #353945",
};

// Loading Toast
export const loadingToast = (message: string) => {
  toast(message, {
    style: { ...defaultToastStyle },
    position: "bottom-left",

  });
};

// Success Toast
export const successToast = (message: string) => {
  toast.success(message, {
    style: {
      ...defaultToastStyle,
      border: "1px solid #34C759",
    },
    position: "bottom-left",
  });
};

// Error Toast
export const errorToast = (message: string) => {
  toast.error(message, {
    style: {
      ...defaultToastStyle,
      border: "1px solid #D43D44",
      color: "#D43D44",
    },
    position: "bottom-left",
  });
};