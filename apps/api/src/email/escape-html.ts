// Escape values before interpolating them into HTML email bodies. Tenant
// names, notes, org names, etc. are user-controlled and would otherwise let
// a hostile input inject markup, tracking pixels, or phishing links into the
// rendered email.
const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[&<>"']/g, (char) => ESCAPES[char] || char);
}
