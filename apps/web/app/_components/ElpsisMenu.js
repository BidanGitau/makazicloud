"use client";

import { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";

export default function EllipsisMenu({ items, menuId = "menu" }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const safeItems = items || [];

  useEffect(() => {
    if (!open) return;

    const close = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const handleItemClick = (event, item) => {
    event.stopPropagation();
    setOpen(false);
    item.onClick?.();
  };

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Actions"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        className="inline-flex h-8 w-8 items-center justify-center text-black/55 transition-colors hover:bg-stone-100 hover:text-black"
      >
        <MoreVertical size={20} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 min-w-[170px] border border-stone-200 bg-white py-1 shadow-lg"
          onClick={(event) => event.stopPropagation()}
        >
          {safeItems.map((item, index) => (
            <button
              key={`${menuId}-${item.label}-${index}`}
              type="button"
              role="menuitem"
              onClick={(event) => handleItemClick(event, item)}
              className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-stone-50 ${
                item.destructive ? "text-red-700" : "text-black/75"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
