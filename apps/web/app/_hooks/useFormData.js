"use client";

import { useState, useEffect } from "react";
import { Properties, Blocks, Tenants, Units } from "@/app/_lib/repositories";

const CACHE_TTL = 5 * 60 * 1000;


const cache = {
  properties: { data: null, time: 0, inflight: null },
  blocks: { data: null, time: 0, inflight: null },
  tenants: { data: null, time: 0, inflight: null },
  units: { data: null, time: 0, inflight: null },
};

const fresh = (entry) => entry.data && Date.now() - entry.time < CACHE_TTL;

const fetchers = {
  properties: () =>
    Properties.getAll({ select: "id,name,rent_due_day" }),
  blocks: () =>
    Blocks.getAll({ select: "id,name,property_id" }),
  tenants: () =>
    Tenants.getAll({
      select:
        "id,full_name,status,billing_cycle_enabled,billing_cycle_months,unit_id(id,property_id,block_id,rent_amount)",
    }),
  units: () =>
    Units.getAll({
      select: "id,property_id,block_id,unit_number,rent_amount,deposit_amount",
    }),
};

async function loadResource(name) {
  const entry = cache[name];
  if (fresh(entry)) return entry.data;
  if (entry.inflight) return entry.inflight;
  entry.inflight = fetchers[name]()
    .then((rows) => {
      entry.data = rows || [];
      entry.time = Date.now();
      entry.inflight = null;
      return entry.data;
    })
    .catch((err) => {
      entry.inflight = null;
      throw err;
    });
  return entry.inflight;
}

async function loadAll({ includeBlocks, includeTenants, includeUnits }) {
  const [properties, blocks, tenants, units] = await Promise.all([
    loadResource("properties"),
    includeBlocks ? loadResource("blocks") : Promise.resolve([]),
    includeTenants ? loadResource("tenants") : Promise.resolve([]),
    includeUnits ? loadResource("units") : Promise.resolve([]),
  ]);


  let joinedTenants = tenants;
  if (includeTenants && includeUnits) {
    const unitsById = new Map((units || []).map((u) => [u.id, u]));
    joinedTenants = (tenants || []).map((t) => ({
      ...t,
      unit_id:
        t.unit_id && typeof t.unit_id === "object"
          ? t.unit_id
          : unitsById.get(t.unit_id) || t.unit_id,
    }));
  }

  return {
    properties: properties || [],
    blocks: blocks || [],
    tenants: joinedTenants || [],
    units: units || [],
  };
}


export function invalidateFormDataCache() {
  Object.values(cache).forEach((entry) => {
    entry.data = null;
    entry.time = 0;
    entry.inflight = null;
  });
}


export function useFormData({
  includeBlocks = true,
  includeTenants = false,
  includeUnits = false,
} = {}) {
  const allFresh =
    fresh(cache.properties) &&
    (!includeBlocks || fresh(cache.blocks)) &&
    (!includeTenants || fresh(cache.tenants)) &&
    (!includeUnits || fresh(cache.units));

  const initialData = () => {
    if (!allFresh) return null;
    const units = cache.units.data || [];
    const tenants = cache.tenants.data || [];
    let joinedTenants = tenants;
    if (includeTenants && includeUnits) {
      const unitsById = new Map(units.map((u) => [u.id, u]));
      joinedTenants = tenants.map((t) => ({
        ...t,
        unit_id:
          t.unit_id && typeof t.unit_id === "object"
            ? t.unit_id
            : unitsById.get(t.unit_id) || t.unit_id,
      }));
    }
    return {
      properties: cache.properties.data || [],
      blocks: includeBlocks ? cache.blocks.data || [] : [],
      tenants: joinedTenants,
      units,
    };
  };

  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(!allFresh);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (allFresh) {
      setData(initialData());
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    loadAll({ includeBlocks, includeTenants, includeUnits })
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setIsLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load form data:", err);
        setError(err);
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };

  }, [includeBlocks, includeTenants, includeUnits]);

  return {
    properties: data?.properties || [],
    blocks: data?.blocks || [],
    tenants: includeTenants ? data?.tenants || [] : [],
    units: includeUnits ? data?.units || [] : [],
    isLoading,
    error,
  };
}
