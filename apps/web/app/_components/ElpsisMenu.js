"use client";

import { Dropdown, Button } from "antd";
import { MoreVertical } from "lucide-react";

export default function EllipsisMenu({ items }) {
  const toMenuItems = (source, prefix = "item") =>
    source.map((item, idx) => {
      const key = `${prefix}-${idx}`;
      const base = {
        key,
        label: item.label,
        danger: item.destructive ? true : undefined,
      };

      if (Array.isArray(item.children) && item.children.length > 0) {
        return {
          ...base,
          children: toMenuItems(item.children, key),
        };
      }

      return {
        ...base,
        onClick: item.onClick,
      };
    });

  const menuItems = toMenuItems(items || []);

  return (
    <Dropdown
      menu={{ items: menuItems }}
      trigger={["click"]}
      placement="bottomRight"
    >
      <Button type="text">
        <MoreVertical size={20} />
      </Button>
    </Dropdown>
  );
}
