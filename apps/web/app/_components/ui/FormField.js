/**
 * Shared form field components — Input, Textarea, Select.
 * Extracted from TenantForm; used across all forms.
 */
import {
  formFieldClass,
  formLabelClass,
  formHelpTextClass,
} from "@/app/_components/ui/formStyles";

export function Input({ label, className = "", error, ...props }) {
  return (
    <div className={className}>
      <label className={formLabelClass}>{label}</label>
      <input
        {...props}
        className={`${formFieldClass} ${error ? "border-red-500 focus:ring-red-500" : ""}`}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function Textarea({ label, className = "", ...props }) {
  return (
    <div className={className}>
      <label className={formLabelClass}>{label}</label>
      <textarea {...props} className={formFieldClass} />
    </div>
  );
}

/**
 * @param {Array} options - Array of objects with { id, name } or { id, unit_number }
 * @param {string} [placeholder] - Empty option label shown at top
 * @param {string} [helpText] - Optional helper text rendered below the select
 */
export function Select({
  label,
  options,
  placeholder,
  helpText,
  error,
  className = "",
  ...props
}) {
  return (
    <div className={className}>
      <label className={formLabelClass}>{label}</label>
      <select
        {...props}
        className={`${formFieldClass} ${error ? "border-red-500 focus:ring-red-500" : ""}`}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.name || opt.unit_number}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {helpText && <p className={formHelpTextClass}>{helpText}</p>}
    </div>
  );
}
