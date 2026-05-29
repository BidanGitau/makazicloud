"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { Select, Spin } from "antd";
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


  useEffect(() => {
    if (!initialOption) return;
    const initials = Array.isArray(initialOption) ? initialOption : [initialOption];
    initials.forEach((opt) => {
      if (opt?.value != null) seenRef.current.set(opt.value, opt);
    });

  }, []);


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
      render={({ field, fieldState: { error } }) => {


        const merged = useMemo(() => {
          const map = new Map();
          results.forEach((o) => map.set(o.value, o));
          if (field.value != null && seenRef.current.has(field.value)) {
            const opt = seenRef.current.get(field.value);
            if (!map.has(opt.value)) map.set(opt.value, opt);
          }
          return Array.from(map.values());

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
