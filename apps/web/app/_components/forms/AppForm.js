"use client";

import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form as AntForm } from "antd";

/**
 * AppForm — single entry point for every form in the app.
 *
 * Wraps react-hook-form's `useForm` with optional zod schema validation,
 * exposes the form context to children (so <TextField name="x" /> can
 * register itself), and renders an AntD <Form> for layout/spacing.
 *
 * Props:
 *   schema          zod schema — optional, if omitted no validation runs
 *   defaultValues   default values object
 *   onSubmit        async (values, helpers) => void  — helpers.reset(), helpers.setError()
 *   onError         (errors) => void — fires when validation fails
 *   children        any form fields / sections
 *   layout          "vertical" | "horizontal" | "inline"  (default "vertical")
 *   className       extra wrapper classes
 *   resetOnSuccess  reset form after a successful submit
 *   id              optional form id (useful for external submit buttons)
 *
 * Example:
 *   const schema = z.object({ email: z.string().email() });
 *   <AppForm schema={schema} defaultValues={{ email: "" }} onSubmit={save}>
 *     <TextField name="email" label="Email" />
 *     <SubmitButton>Save</SubmitButton>
 *   </AppForm>
 */
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
  values, // pass to reset the form when external data changes (e.g. edit mode)
}) {
  const methods = useForm({
    defaultValues,
    resolver: schema ? zodResolver(schema) : undefined,
    mode: "onBlur",
  });

  // If `values` is provided and changes (e.g. editing an existing record
  // after the data finishes loading), reset the form to the new values.
  useEffect(() => {
    if (values) methods.reset(values);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values]);

  const handleSubmit = methods.handleSubmit(async (vals) => {
    if (!onSubmit) return;
    try {
      await onSubmit(vals, methods);
      if (resetOnSuccess) methods.reset(defaultValues);
    } catch (err) {
      // Surface server-side errors via setError if the thrown error contains
      // a `fieldErrors` object (e.g. `{ email: "Already taken" }`).
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
        // Submit via native form so SubmitButton works without `htmlType="submit"` complications
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
