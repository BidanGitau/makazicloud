"use client";

import { useMemo } from "react";
import { useFormData } from "./useFormData";


export function usePropertyStructure(propertyId, blockId) {
  const { properties, blocks: allBlocks, units: allUnits, isLoading } = useFormData({ includeUnits: true });

  const propertyBlocks = useMemo(
    () => allBlocks.filter((b) => b.property_id === propertyId),
    [allBlocks, propertyId],
  );

  const hasBlocks = propertyBlocks.length > 0;

  const propertyUnits = useMemo(() => {
    const byProperty = allUnits.filter((u) => u.property_id === propertyId);
    if (!hasBlocks || !blockId) return byProperty;
    return byProperty.filter((u) => u.block_id === blockId);
  }, [allUnits, propertyId, blockId, hasBlocks]);

  return { properties, propertyBlocks, hasBlocks, propertyUnits, allUnits, isLoading };
}
