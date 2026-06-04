import { Mail, User } from "lucide-react";
import {
  FieldSection,
  TextAreaField,
  TextField,
} from "@/app/_components/forms";

export default function TenantPersonalInfoSection() {
  return (
    <FieldSection title="Personal Information" columns={2}>
      <TextField name="full_name" label="Full Name" icon={User} required />
      <TextField
        name="email"
        label="Email Address"
        type="email"
        icon={Mail}
        placeholder="tenant@example.com"
      />
      <TextField name="national_id" label="National ID" required />
      <TextField
        name="emergency_contact"
        label="Phone Number"
        type="tel"
        placeholder="e.g. 0712345678"
        required
      />
      <TextField
        name="occupation"
        label="Occupation"
        className="md:col-span-2"
      />
      <TextAreaField
        name="notes"
        label="Notes"
        rows={3}
        className="md:col-span-2"
      />
    </FieldSection>
  );
}
