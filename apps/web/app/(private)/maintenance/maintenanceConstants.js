export const CATEGORIES = [
  { id: "plumbing",     label: "Plumbing" },
  { id: "electrical",  label: "Electrical" },
  { id: "structural",  label: "Structural" },
  { id: "painting",    label: "Painting" },
  { id: "cleaning",    label: "Cleaning" },
  { id: "pest_control", label: "Pest Control" },
  { id: "security",    label: "Security" },
  { id: "appliances",  label: "Appliances" },
  { id: "landscaping", label: "Landscaping" },
  { id: "other",       label: "Other" },
];

export const CATEGORY_LABEL = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.label]),
);

export const PRIORITIES = [
  { id: "low",    label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high",   label: "High" },
  { id: "urgent", label: "Urgent" },
];

export const STATUSES = [
  { id: "pending",     label: "Pending" },
  { id: "in_progress", label: "In Progress" },
  { id: "completed",   label: "Completed" },
  { id: "cancelled",   label: "Cancelled" },
];

export const STATUS_STYLE = {
  pending:     "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed:   "bg-green-100 text-green-800",
  cancelled:   "bg-gray-100 text-gray-500",
};

export const PRIORITY_STYLE = {
  low:    "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-700",
  high:   "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

export const ADVANCE_STATUSES = [
  { id: "pending",   label: "Pending" },
  { id: "approved",  label: "Approved" },
  { id: "disbursed", label: "Disbursed" },
  { id: "settled",   label: "Settled" },
];

export const ADVANCE_STATUS_STYLE = {
  pending:   "bg-yellow-100 text-yellow-800",
  approved:  "bg-blue-100 text-blue-800",
  disbursed: "bg-purple-100 text-purple-800",
  settled:   "bg-green-100 text-green-800",
};
