import { apiFetch } from "./api/client";

/**
 * CRUD factory for the NestJS `/data/:table` controller.
 *
 *   const Tenants = createCRUD("tenants", { defaultOrder: { column: "created_at", ascending: false } });
 *   const list   = await Tenants.getAll({ match: { status: "active" }, signal });
 *   const one    = await Tenants.getById(id);
 *   const made   = await Tenants.create({ ... });
 *   const next   = await Tenants.update(id, { ... });
 *   await Tenants.remove(id);
 *
 * Errors throw `ApiError`. Callers handle them (TanStack Query / try-catch
 * in pages / loaders). The factory deliberately does not swallow failures —
 * a 500 from the backend must reach the UI so the user sees "couldn't load"
 * instead of an empty list.
 *
 * Every method accepts an `opts.signal` (AbortSignal). Pass it from
 * useEffect cleanup or React Router loaders to cancel in-flight requests
 * when the consumer unmounts or the navigation changes.
 */
export function createCRUD(
  table,
  { defaultOrder = null, singlePK = "id", readOnly = false } = {},
) {
  const requireId = (id, op) => {
    if (id === null || id === undefined || id === "") {
      throw new Error(`${table}: ${op} requires a valid ID`);
    }
  };

  const buildQuery = ({ match, filter, order, limit, offset } = {}) => {
    const params = new URLSearchParams();

    const setOp = (col, op, value) => {
      if (value === null || value === undefined) return;
      const aliases = {
        "=": "eq",
        eq: "eq",
        "!=": "neq",
        "<>": "neq",
        neq: "neq",
        ">": "gt",
        gt: "gt",
        ">=": "gte",
        gte: "gte",
        "<": "lt",
        lt: "lt",
        "<=": "lte",
        lte: "lte",
        in: "in",
        like: "like",
        ilike: "ilike",
        is: "is",
      };
      const key = aliases[String(op).toLowerCase()] || "eq";
      const formatted = Array.isArray(value) ? value.join(",") : value;
      if (key === "eq" || key === "is") params.set(col, formatted);
      else params.set(`${col}[${key}]`, formatted);
    };

    Object.entries(match || {}).forEach(([col, val]) => {
      if (val === null || val === undefined) return;
      if (typeof val === "object" && !Array.isArray(val) && val.operator) {
        setOp(col, val.operator, val.value);
      } else if (Array.isArray(val)) {
        setOp(col, "in", val);
      } else {
        setOp(col, "eq", val);
      }
    });

    (filter || []).forEach((f) => {
      if (f?.column) setOp(f.column, f.operator || "=", f.value);
    });

    if (order?.column) {
      params.set("orderBy", order.column);
      params.set("order", order.ascending === false ? "desc" : "asc");
    }
    if (limit !== null && limit !== undefined) params.set("limit", limit);
    if (offset !== null && offset !== undefined) params.set("offset", offset);

    const qs = params.toString();
    return qs ? `?${qs}` : "";
  };

  const normalizeRows = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (payload?.data) return payload.data;
    return payload;
  };

  const api = {
    async getAll(opts = {}) {
      const { signal, ...query } = opts;
      const qs = buildQuery({
        match: query.match,
        filter: query.filter,
        order: query.order ?? defaultOrder,
        limit: query.limit ?? null,
        offset: query.offset ?? null,
      });
      const payload = await apiFetch(`/data/${table}${qs}`, { signal });
      const data = normalizeRows(payload);
      return Array.isArray(data) ? data : data ? [data] : [];
    },

    async getById(id, { signal } = {}) {
      requireId(id, "getById");
      const payload = await apiFetch(`/data/${table}/${id}`, { signal });
      const data = normalizeRows(payload);
      return Array.isArray(data) ? data[0] || null : data;
    },
  };

  if (!readOnly) {
    Object.assign(api, {
      async create(payload, { signal } = {}) {
        if (!payload) throw new Error(`${table}: create requires a payload`);
        // Backend takes one row per POST. Fan out for arrays.
        if (Array.isArray(payload)) {
          const results = [];
          for (const row of payload) {
            results.push(
              await apiFetch(`/data/${table}`, { method: "POST", body: row, signal }),
            );
          }
          return results;
        }
        return apiFetch(`/data/${table}`, { method: "POST", body: payload, signal });
      },

      async update(id, updates, { signal } = {}) {
        if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
          throw new Error(`${table}: update requires an updates object`);
        }
        if (typeof id === "object") {
          throw new Error(`${table}: update by filter is not supported`);
        }
        requireId(id, "update");
        return apiFetch(`/data/${table}/${id}`, {
          method: "PATCH",
          body: updates,
          signal,
        });
      },

      async remove(id, { signal } = {}) {
        if (typeof id === "object") {
          throw new Error(`${table}: remove by filter is not supported`);
        }
        requireId(id, "remove");
        return apiFetch(`/data/${table}/${id}`, { method: "DELETE", signal });
      },
    });
  }

  return api;
}
