/** Toggles `item` in a Set held in React state (expanded rows, selections). */
export function toggleSetItem(setter, item) {
  setter((current) => {
    const next = new Set(current);
    if (next.has(item)) next.delete(item);
    else next.add(item);
    return next;
  });
}
