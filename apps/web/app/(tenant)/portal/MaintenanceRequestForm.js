"use client";

import { z } from "zod";
import {
  AppForm,
  SelectField,
  SubmitButton,
  TextAreaField,
  TextField,
} from "@/app/_components/forms";
import { apiFetch } from "@/app/_lib/api/client";
import { showToast } from "@/app/_components/CustomToast";
import { Section } from "./portal-ui";

// Mirrors MAINTENANCE_CATEGORIES + MAINTENANCE_PRIORITIES in the API.
const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "security", label: "Security" },
  { value: "cleaning", label: "Cleaning" },
];

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const schema = z.object({
  category: z.enum(["general", "plumbing", "electrical", "security", "cleaning"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  title: z
    .string()
    .min(1, "Add a request title")
    .max(160, "Title is too long (160 characters max)"),
  description: z.string().optional(),
});

const defaultValues = {
  category: "general",
  priority: "medium",
  title: "",
  description: "",
};

export default function MaintenanceRequestForm({ onCreated }) {
  const handleSubmit = async (values) => {
    try {
      await apiFetch("/tenant-portal/maintenance-requests", {
        method: "POST",
        body: values,
      });
      showToast.success("Maintenance request sent.");
      await onCreated?.();
    } catch (error) {
      showToast.error(error.message || "Failed to send request");
      throw error;
    }
  };

  return (
    <Section title="New Complaint / Maintenance">
      <AppForm
        schema={schema}
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        resetOnSuccess
        className="space-y-4"
      >
        <SelectField name="category" label="Category" options={CATEGORIES} />
        <SelectField name="priority" label="Priority" options={PRIORITIES} />
        <TextField name="title" label="Title" required maxLength={160} />
        <TextAreaField
          name="description"
          label="Description"
          rows={4}
          placeholder="Describe the issue…"
        />
        <SubmitButton fullWidth>Send Request</SubmitButton>
      </AppForm>
    </Section>
  );
}
