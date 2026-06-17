"use client";

import { toast, ToastContainer, Slide } from "react-toastify";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  X
} from "lucide-react";


const CustomToast = ({ type, message, closeToast }) => {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-white" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-white" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-white" />;
      case 'info':
        return <Info className="w-5 h-5 text-white" />;
      default:
        return <CheckCircle className="w-5 h-5 text-white" />;
    }
  };

  const getBgColor = () => {
    return 'bg-blue-700 border-blue-700';
  };

  return (
    <div className={`${getBgColor()} rounded-xl border shadow-lg p-4 min-w-80 max-w-md backdrop-blur-sm`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-white leading-relaxed">
            {message}
          </p>
        </div>
        <button
          onClick={closeToast}
          className="flex-shrink-0 text-white/70 transition-colors duration-200 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};


export const showToast = {
  success: (message) =>
    toast.success(
      ({ closeToast }) => (
        <CustomToast type="success" message={message} closeToast={closeToast} />
      ),
      {
        className: "!bg-transparent !shadow-none !border-none !p-0 !rounded-none",
      }
    ),

  error: (message) =>
    toast.error(
      ({ closeToast }) => (
        <CustomToast type="error" message={message} closeToast={closeToast} />
      ),
      {
        className: "!bg-transparent !shadow-none !border-none !p-0 !rounded-none",
      }
    ),

  warning: (message) =>
    toast.warning(
      ({ closeToast }) => (
        <CustomToast type="warning" message={message} closeToast={closeToast} />
      ),
      {
        className: "!bg-transparent !shadow-none !border-none !p-0 !rounded-none",
      }
    ),

  info: (message) =>
    toast.info(
      ({ closeToast }) => (
        <CustomToast type="info" message={message} closeToast={closeToast} />
      ),
      {
        className: "!bg-transparent !shadow-none !border-none !p-0 !rounded-none",
      }
    ),
};


export const CustomToastContainer = () => (
  <ToastContainer
    position="top-right"
    autoClose={4000}
    hideProgressBar
    newestOnTop={true}
    closeOnClick={false}
    rtl={false}
    pauseOnFocusLoss
    draggable
    pauseOnHover
    theme="light"
    transition={Slide}
    className="!mt-20 !mr-4 !z-[9999]"
    toastClassName="!mb-4"
    icon={false}
    closeButton={false}
  />
);


export default CustomToast;
