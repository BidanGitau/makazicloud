"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export default function ModalSlider({ isOpen, onClose, title, children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-blue-900/40" onClick={onClose} />

      <div className="absolute right-0 top-0 h-full w-full sm:w-[55%] bg-white shadow-2xl flex flex-col rounded-l-xl overflow-hidden">
        {title ? (
          <div className="flex justify-between items-center px-6 py-4 border-b shadow-sm bg-white">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <button onClick={onClose} className="absolute right-4 top-4 text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>,
    document.body
  );
}
