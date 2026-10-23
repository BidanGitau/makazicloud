import {
  DateField,
  FieldSection,
  NumberField,
  SelectField,
  SwitchField,
  useWatch,
} from "@/app/_components/forms";
import { BILLING_CYCLE_OPTIONS, PRORATE_CUTOFF_DAY } from "../utils/tenantFormConfig";
import { suggestedMoveInRent } from "../utils/tenantFormUtils";
import { formatCurrency } from "@/app/_lib/formatters";

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
      />
      <NumberField
        name="opening_balance"
        label="Opening Balance (KSh)"
        min={0}
        placeholder="0"
        helper="For existing tenants with arrears before this system started."
        disabled={isEditMode}
      />
      <BillingCycleFields />
      {!isEditMode && <MoveInProrationFields />}
    </FieldSection>
  );
}

function MoveInProrationFields() {
  const [enabled, cycleEnabled, leaseStart, rent, deposit, agreed] = useWatch({
    name: [
      "prorate_first_month",
      "billing_cycle_enabled",
      "lease_start",
      "rent_amount",
      "deposit_amount",
      "move_in_rent",
    ],
  });
  if (cycleEnabled) return null;

  const suggestion = suggestedMoveInRent(leaseStart, rent);
  const hasAgreed = agreed !== "" && agreed !== null && agreed !== undefined;
  const partMonth = hasAgreed ? Number(agreed) || 0 : suggestion?.amount ?? 0;
  const dueAtMoveIn = partMonth + Number(rent || 0) + Number(deposit || 0);

  return (
    <>
      <SwitchField
        name="prorate_first_month"
        label="Prorate move-in month"
        description={`Charge only the days left in the move-in month (free from the ${PRORATE_CUTOFF_DAY}th), plus next month's rent and the deposit on move-in. Normal rent day applies after that.`}
        className="md:col-span-2"
      />
      {enabled && suggestion && (
        <>
          <NumberField
            name="move_in_rent"
            label="Move-in month rent (KSh)"
            min={0}
            placeholder={String(suggestion.amount)}
            helper={
              suggestion.free
                ? `Suggested: free (moves in on or after the ${PRORATE_CUTOFF_DAY}th). Enter an agreed amount to charge.`
                : `Suggested: ${formatCurrency(suggestion.amount)} for ${suggestion.daysStayed} of ${suggestion.daysInMonth} days. Leave blank or enter the agreed amount.`
            }
          />
          <div className="flex flex-col justify-center border border-stone-200 bg-stone-50 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
              Due on move-in
            </p>
            <p className="mt-1 text-lg font-black tabular-nums text-black">
              {formatCurrency(dueAtMoveIn)}
            </p>
            <p className="text-[11px] text-black/55">
              Part month + next month + deposit
            </p>
          </div>
        </>
      )}
    </>
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
