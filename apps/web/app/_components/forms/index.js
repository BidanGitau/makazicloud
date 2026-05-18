// Form primitives — single entry point.
//
// Usage:
//   import {
//     AppForm, FieldSection, SubmitButton,
//     TextField, PasswordField, NumberField,
//     SelectField, DateField, TextAreaField,
//     SwitchField, CheckboxField,
//   } from "@/app/_components/forms";

export { default as AppForm } from "./AppForm";
export { default as FieldSection } from "./FieldSection";
export { default as SubmitButton } from "./SubmitButton";
export { default as TextField } from "./fields/TextField";
export { default as PasswordField } from "./fields/PasswordField";
export { default as NumberField } from "./fields/NumberField";
export { default as SelectField } from "./fields/SelectField";
export { default as AsyncSelectField } from "./fields/AsyncSelectField";
export { default as DateField } from "./fields/DateField";
export { default as TextAreaField } from "./fields/TextAreaField";
export { default as SwitchField } from "./fields/SwitchField";
export { default as CheckboxField } from "./fields/CheckboxField";

// Re-export the bits of RHF you commonly need so consumers stay on one import:
export { useFormContext, useFieldArray, useWatch, Controller } from "react-hook-form";
