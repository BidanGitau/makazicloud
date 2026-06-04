import {
  DateField,
  FieldSection,
  NumberField,
  SelectField,
  SwitchField,
  useWatch,
} from "@/app/_components/forms";
import { BILLING_CYCLE_OPTIONS } from "../utils/tenantFormConfig";

export default function TenantLeaseFinanceSection({ isEditMode }) {
  return (
    <FieldSection title="Lease & Finance" columns={2}>
      <DateField
        name="lease_start"
        label="Lease Start"
        required
        disabled={isEditMode}
      />
      <NumberField
        name="deposit_amount"
        label="Deposit (KSh)"
        min={0}
        disabled
      />
      <NumberField
        name="rent_amount"
        label="Rent (KSh)"
        min={0}
        disabled
        className="md:col-span-2"
      />
      {!isEditMode && (
        <NumberField
          name="initial_payment"
          label="First Payment (KSh)"
          min={0}
          placeholder="Defaults to selected unit rent"
          className="md:col-span-2"
        />
      )}
      <BillingCycleFields />
    </FieldSection>
  );
}

function BillingCycleFields() {
  const enabled = useWatch({ name: "billing_cycle_enabled" });
  return (
    <>
      <SwitchField
        name="billing_cycle_enabled"
        label="Custom billing cycle"
        description="Bill less frequently than monthly"
        className="md:col-span-2"
      />
      {enabled && (
        <SelectField
          name="billing_cycle_months"
          label="Billing cycle"
          options={BILLING_CYCLE_OPTIONS}
          required
          allowClear={false}
        />
      )}
    </>
  );
}
