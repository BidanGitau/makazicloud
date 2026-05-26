"use client";

import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form as AntForm } from "antd";


export default function AppForm({
  schema,
  defaultValues = {},
  onSubmit,
  onError,
  children,
  layout = "vertical",
  className = "",
  resetOnSuccess = false,
  id,
  values,
}) {
  const methods = useForm({
    defaultValues,
    resolver: schema ? zodResolver(schema) : undefined,
    mode: "onBlur",
  });


  useEffect(() => {
    if (values) methods.reset(values);

  }, [values]);

  const handleSubmit = methods.handleSubmit(async (vals) => {
    if (!onSubmit) return;
    try {
      await onSubmit(vals, methods);
      if (resetOnSuccess) methods.reset(defaultValues);
    } catch (err) {


      if (err?.fieldErrors && typeof err.fieldErrors === "object") {
        Object.entries(err.fieldErrors).forEach(([field, message]) => {
          methods.setError(field, { type: "server", message });
        });
      } else {
        methods.setError("root", {
          type: "server",
          message: err?.message || "Something went wrong",
        });
      }
    }
  }, onError);

  return (
    <FormProvider {...methods}>
      <AntForm
        id={id}
        layout={layout}
        onFinish={handleSubmit}
        onFinishFailed={(e) => onError?.(e.errors)}
        component="form"
        className={`app-form ${className}`}
        noValidate

        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        {children}
      </AntForm>
    </FormProvider>
  );
}
