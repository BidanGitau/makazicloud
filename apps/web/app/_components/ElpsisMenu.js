"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreVertical } from "lucide-react";

const MENU_MARGIN = 8;
const MIN_MENU_HEIGHT = 160;
const DEFAULT_MENU_HEIGHT = 240;

function getMenuPosition(anchor) {
  const rect = anchor?.getBoundingClientRect();
  if (!rect) return null;

  return {
    top: rect.bottom + 4,
    right: Math.max(MENU_MARGIN, window.innerWidth - rect.right),
    maxHeight: Math.max(
      MIN_MENU_HEIGHT,
      window.innerHeight - rect.bottom - MENU_MARGIN * 2,
    ),
  };
}

export default function EllipsisMenu({ items, menuId = "menu" }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({
    top: 0,
    right: 0,
    maxHeight: DEFAULT_MENU_HEIGHT,
  });
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const safeItems = items || [];

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = () => {
    const nextPosition = getMenuPosition(rootRef.current);
    if (nextPosition) setPosition(nextPosition);
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();

    const closeOnOutsideClick = (event) => {
      if (
        !rootRef.current?.contains(event.target) &&
        !menuRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
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
          updatePosition();
          setOpen((current) => !current);
        }}
        className="inline-flex h-8 w-8 items-center justify-center text-black/55 transition-colors hover:bg-stone-100 hover:text-black"
      >
        <MoreVertical size={20} />
      </button>

      {open && mounted && createPortal(
        <div
          ref={menuRef}
          role="menu"
          className="fixed z-[9999] min-w-[170px] overflow-y-auto border border-stone-200 bg-white py-1 shadow-2xl"
          style={{
            top: position.top,
            right: position.right,
            maxHeight: position.maxHeight,
          }}
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
        </div>,
        document.body,
      )}
    </div>
  );
}
