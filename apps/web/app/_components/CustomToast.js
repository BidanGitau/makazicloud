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
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-amber-600" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-600" />;
      default:
        return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-amber-50 border-amber-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-green-50 border-green-200';
    }
  };

  const getProgressColor = () => {
    switch (type) {
      case 'success':
        return 'bg-gradient-to-r from-green-500 to-emerald-600';
      case 'error':
        return 'bg-gradient-to-r from-red-500 to-rose-600';
      case 'warning':
        return 'bg-gradient-to-r from-amber-500 to-yellow-600';
      case 'info':
        return 'bg-blue-600 ';
      default:
        return 'bg-gradient-to-r from-green-500 to-emerald-600';
    }
  };

  return (
    <div className={`${getBgColor()} rounded-xl border shadow-lg p-4 min-w-80 max-w-md backdrop-blur-sm`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 leading-relaxed">
            {message}
          </p>
        </div>
        <button
          onClick={closeToast}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors duration-200"
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
        progressClassName: "!bg-gradient-to-r !from-green-500 !to-emerald-600",
      }
    ),

  error: (message) =>
    toast.error(
      ({ closeToast }) => (
        <CustomToast type="error" message={message} closeToast={closeToast} />
      ),
      {
        className: "!bg-transparent !shadow-none !border-none !p-0 !rounded-none",
        progressClassName: "!bg-gradient-to-r !from-red-500 !to-rose-600",
      }
    ),

  warning: (message) =>
    toast.warning(
      ({ closeToast }) => (
        <CustomToast type="warning" message={message} closeToast={closeToast} />
      ),
      {
        className: "!bg-transparent !shadow-none !border-none !p-0 !rounded-none",
        progressClassName: "!bg-gradient-to-r !from-amber-500 !to-yellow-600",
      }
    ),

  info: (message) =>
    toast.info(
      ({ closeToast }) => (
        <CustomToast type="info" message={message} closeToast={closeToast} />
      ),
      {
        className: "!bg-transparent !shadow-none !border-none !p-0 !rounded-none",
        progressClassName: "!bg-gradient-to-r !from-blue-500 !to-blue-700",
      }
    ),
};


export const CustomToastContainer = () => (
  <ToastContainer
    position="top-right"
    autoClose={4000}
    hideProgressBar={false}
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
    progressStyle={{
      height: '3px',
      borderRadius: '0 0 12px 12px',
    }}
    icon={false}
    closeButton={false}
  />
);


export default CustomToast;
