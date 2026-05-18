"use client";

import { useState, useEffect } from "react";
import { Properties, Blocks, Tenants, Units } from "@/app/_lib/repositories";

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Per-resource cache. Each resource fetches on first request and stays warm
// for CACHE_TTL. A consumer that doesn't ask for tenants/units never pays
// for them — visiting only the dashboard no longer downloads 10k tenant
// rows just because some other page might need them.
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

async function loadAll({ includeTenants, includeUnits }) {
  const wanted = ["properties", "blocks"];
  if (includeTenants) wanted.push("tenants");
  if (includeUnits) wanted.push("units");

  const [properties, blocks, tenants, units] = await Promise.all([
    loadResource("properties"),
    loadResource("blocks"),
    includeTenants ? loadResource("tenants") : Promise.resolve([]),
    includeUnits ? loadResource("units") : Promise.resolve([]),
  ]);

  // Client-side join: replace tenant.unit_id (string) with the full unit
  // object. Only meaningful when both tenants and units are loaded.
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

/**
 * Drop every cached resource. Call after any mutation that affects properties,
 * blocks, tenants, or units so the next useFormData mount fetches fresh data.
 */
export function invalidateFormDataCache() {
  Object.values(cache).forEach((entry) => {
    entry.data = null;
    entry.time = 0;
    entry.inflight = null;
  });
}

/**
 * Loads form-related resources from a shared, per-resource cache.
 *
 *   const { properties, blocks } = useFormData();
 *   const { properties, blocks, tenants } = useFormData({ includeTenants: true });
 *
 * Only the resources you ask for are fetched. Properties and blocks are
 * always loaded (they're small and used everywhere). Tenants and units are
 * opt-in — pages that don't need them won't trigger the fetch.
 */
export function useFormData({
  includeTenants = false,
  includeUnits = false,
} = {}) {
  const allFresh =
    fresh(cache.properties) &&
    fresh(cache.blocks) &&
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
      blocks: cache.blocks.data || [],
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
    loadAll({ includeTenants, includeUnits })
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeTenants, includeUnits]);

  return {
    properties: data?.properties || [],
    blocks: data?.blocks || [],
    tenants: includeTenants ? data?.tenants || [] : [],
    units: includeUnits ? data?.units || [] : [],
    isLoading,
    error,
  };
}
