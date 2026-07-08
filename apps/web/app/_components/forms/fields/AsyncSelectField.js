"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import FieldWrapper from "./_FieldWrapper";


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


  const seenRef = useRef(new Map());


  const initialOptions = useMemo(() => {
    if (!initialOption) return [];
    return Array.isArray(initialOption) ? initialOption : [initialOption];
  }, [initialOption]);

  const mergedOptions = useMemo(() => {
    const map = new Map();
    initialOptions.forEach((option) => {
      if (option?.value != null) map.set(option.value, option);
    });
    results.forEach((option) => {
      if (option?.value != null) map.set(option.value, option);
    });
    seenRef.current.forEach((option) => {
      if (option?.value != null && !map.has(option.value)) {
        map.set(option.value, option);
      }
    });
    return Array.from(map.values());
  }, [initialOptions, results]);

  useEffect(() => {
    initialOptions.forEach((opt) => {
      if (opt?.value != null) seenRef.current.set(opt.value, opt);
    });
  }, [initialOptions]);


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
      render={({ field, fieldState: { error } }) => (
          <FieldWrapper
            label={label}
            name={name}
            error={error?.message}
            helper={helper}
            required={required}
            className={className}
          >
            <input
              type="search"
              id={name}
              placeholder={placeholder}
              disabled={disabled}
              value={query}
              onChange={(event) => {
                const value = event.target.value;
                setQuery(value);
                runSearch(value);
              }}
              className={`h-11 w-full border bg-white px-3 py-2.5 text-sm text-black outline-none transition-colors placeholder:text-black/40 focus:border-blue-700 focus:ring-1 focus:ring-blue-700 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-black/45 ${
                error ? "border-red-500" : "border-stone-300"
              }`}
            />
            <select
              name={field.name}
              ref={field.ref}
              disabled={disabled || loading}
              value={field.value ?? ""}
              onChange={(event) => {
                const value = event.target.value;
                const option = mergedOptions.find(
                  (item) => String(item.value) === String(value),
                );
                field.onChange(value);
                if (option?.value != null) seenRef.current.set(option.value, option);
                onValueChange?.(value, option);
              }}
              onBlur={field.onBlur}
              className={`mt-2 h-11 w-full border bg-white px-3 py-2.5 text-sm text-black outline-none transition-colors focus:border-blue-700 focus:ring-1 focus:ring-blue-700 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-black/45 ${
                error ? "border-red-500" : "border-stone-300"
              }`}
            >
              <option value="">
                {loading ? "Loading..." : placeholder || "Select..."}
              </option>
              {mergedOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FieldWrapper>
        )}
    />
  );
}
