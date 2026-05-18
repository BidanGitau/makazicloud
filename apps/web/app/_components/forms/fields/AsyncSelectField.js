"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { Select, Spin } from "antd";
import FieldWrapper from "./_FieldWrapper";

/**
 * AsyncSelectField — server-side typeahead bound to RHF.
 *
 * Use this when the option set is too large to ship to the browser up-front
 * (thousands of tenants, properties across orgs, products, etc.). It debounces
 * keystrokes, cancels in-flight requests on each new query, and remembers
 * options it has already seen so the chosen value always renders its label.
 *
 * Props:
 *   name             RHF field name (stores the selected value's `value`)
 *   label, placeholder, helper, required, disabled, className
 *   loadOptions(query, { signal }) -> Promise<[{ value, label, raw? }]>
 *     The fetcher. Should be cancellable via `signal`. `raw` is optional —
 *     attach the full object so consumers can read it via `onValueChange`.
 *   initialOption    [{ value, label }] | { value, label }
 *     Pre-seed the option so the selected value renders without a fetch
 *     (e.g. when prefilling from a tenantId).
 *   debounceMs       250
 *   minQueryLength   1  (the loader is not called below this length)
 *   onValueChange    (value, option) => void  — fires on user picks only
 */
export default function AsyncSelectField({
  name,
  label,
  placeholder,
  helper,
  required = false,
  disabled = false,
  className = "",
  loadOptions,
  initialOption,
  debounceMs = 250,
  minQueryLength = 1,
  onValueChange,
}) {
  const { control } = useFormContext();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  // Cache of every option this field has ever seen (selected or searched).
  // Keeps the selected option's label rendered even after the user types
  // something else and the result set rotates.
  const seenRef = useRef(new Map());

  // Seed cache with the prefilled option(s) once.
  useEffect(() => {
    if (!initialOption) return;
    const initials = Array.isArray(initialOption) ? initialOption : [initialOption];
    initials.forEach((opt) => {
      if (opt?.value != null) seenRef.current.set(opt.value, opt);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced + cancellable loader. Each keystroke aborts the previous fetch.
  const abortRef = useRef(null);
  const timerRef = useRef(null);
  useEffect(() => () => {
    abortRef.current?.abort();
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const runSearch = useCallback(
    (q) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
      const trimmed = q.trim();
      if (trimmed.length < minQueryLength) {
        setResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      timerRef.current = setTimeout(async () => {
        const controller = new AbortController();
        abortRef.current = controller;
        try {
          const opts = (await loadOptions(trimmed, { signal: controller.signal })) || [];
          opts.forEach((o) => o?.value != null && seenRef.current.set(o.value, o));
          setResults(opts);
        } catch (err) {
          if (err?.name !== "AbortError") {
            // Surface in console but don't crash the field — leave results empty.
            console.warn(`AsyncSelectField(${name}) search failed:`, err);
            setResults([]);
          }
        } finally {
          setLoading(false);
        }
      }, debounceMs);
    },
    [loadOptions, debounceMs, minQueryLength, name],
  );

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        // Union of (current results ∪ cached seen options) so the selected
        // value's label always renders even if it's not in the search hits.
        const merged = useMemo(() => {
          const map = new Map();
          results.forEach((o) => map.set(o.value, o));
          if (field.value != null && seenRef.current.has(field.value)) {
            const opt = seenRef.current.get(field.value);
            if (!map.has(opt.value)) map.set(opt.value, opt);
          }
          return Array.from(map.values());
          // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [results, field.value]);

        return (
          <FieldWrapper
            label={label}
            name={name}
            error={error?.message}
            helper={helper}
            required={required}
            className={className}
          >
            <Select
              id={name}
              showSearch
              filterOption={false}
              placeholder={placeholder}
              disabled={disabled}
              loading={loading}
              options={merged}
              value={field.value ?? undefined}
              onSearch={(value) => {
                setQuery(value);
                runSearch(value);
              }}
              onChange={(value, option) => {
                field.onChange(value);
                if (option?.value != null) seenRef.current.set(option.value, option);
                onValueChange?.(value, option);
              }}
              onBlur={field.onBlur}
              allowClear
              notFoundContent={
                loading ? (
                  <div className="flex items-center justify-center py-2">
                    <Spin size="small" />
                  </div>
                ) : query.trim().length < minQueryLength ? (
                  <span className="text-xs text-black/45">
                    Type to search…
                  </span>
                ) : (
                  <span className="text-xs text-black/45">No matches</span>
                )
              }
              status={error ? "error" : undefined}
              size="large"
              style={{ width: "100%" }}
            />
          </FieldWrapper>
        );
      }}
    />
  );
}
