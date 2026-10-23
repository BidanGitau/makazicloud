"use client";

import { DownloadPDFButton } from "@/app/_components/DownloadPDFButton";
import ModalSlider from "@/app/_components/ModalSlider";
import { breakdownColumns, payoutModes } from "../constants";
import DisburseConfirmDialog from "./DisburseConfirmDialog";
import DisbursementOverview from "./DisbursementOverview";

const fieldLabel =
  "mb-1.5 block text-[10px] font-bold uppercase tracking-[0.22em] text-black/55";
const fieldControl =
  "h-9 w-full border border-stone-300 bg-white px-3 text-sm text-black placeholder:text-black/40 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700 disabled:bg-stone-50 disabled:text-black/50";

/** "Monthly Disbursement" slider: pick a property and month, review, release. */
export default function DisbursementSlider({
  disbursement: d,
  properties,
  includeDeposits,
  onIncludeDepositsChange,
  canExport,
}) {
  const locked = Boolean(d.existingClose);
  const canDownload =
    canExport &&
    d.exportData.length > 0 &&
    d.propertyId &&
    d.payoutMode &&
    d.reference.trim();

  return (
    <>
      <ModalSlider isOpen={d.isOpen} onClose={d.close} title="Monthly Disbursement">
        <div className="space-y-5">
          <div>
            <p className="section-label">— Owner Payment —</p>
            <h2
              className="mt-2 text-2xl font-black uppercase tracking-tight text-black sm:text-base"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Disburse funds
            </h2>
            <p className="mt-1 text-sm text-black/55">
              Capture commission, repairs, and advances first. Once released, this month cannot be amended.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={fieldLabel}>Month</span>
              <input
                type="month"
                max={d.currentMonth}
                value={d.disburseMonth}
                onChange={(event) => d.setDisburseMonth(event.target.value)}
                className={fieldControl}
              />
            </label>
            <label className="block">
              <span className={fieldLabel}>Property</span>
              <select
                value={d.propertyId}
                onChange={(event) => d.setPropertyId(event.target.value)}
                className={fieldControl}
              >
                <option value="">Select Property</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={fieldLabel}>How to pay</span>
              <select
                value={d.payoutMode}
                disabled={locked}
                onChange={(event) => d.setPayoutMode(event.target.value)}
                className={fieldControl}
              >
                {payoutModes.map((mode) => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={fieldLabel}>Payment ref</span>
              <input
                type="text"
                value={d.reference}
                disabled={locked}
                onChange={(event) => d.setReference(event.target.value)}
                placeholder="Transaction number, cheque number, or note"
                className={fieldControl}
              />
            </label>
          </div>

          <label className="block">
            <span className={fieldLabel}>Notes</span>
            <textarea
              value={d.notes}
              disabled={locked}
              onChange={(event) => d.setNotes(event.target.value)}
              placeholder="Notes"
              rows={3}
              className="w-full resize-none border border-stone-300 bg-white px-3 py-2 text-sm text-black placeholder:text-black/40 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700 disabled:bg-stone-50 disabled:text-black/50"
            />
          </label>

          <label className="flex items-start gap-2 border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-black">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={includeDeposits}
              disabled={locked}
              onChange={(event) => onIncludeDepositsChange(event.target.checked)}
            />
            <span>
              Include deposits if any
              <span className="mt-0.5 block text-[11px] text-black/50">
                Add deposits collected this month to the amount paid to the owner. Commission stays on rent only.
              </span>
            </span>
          </label>

          <DisbursementOverview
            totals={d.closeTotals}
            overview={d.overview}
            includeDeposits={includeDeposits}
          />

          {!d.propertyId && (
            <p className="border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-black/55">
              Choose a property to load rent paid this month. Figures stay at zero until then.
            </p>
          )}
          {locked && (
            <p className="border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {d.closeRange.label} is already disbursed for this property. No further amendments are allowed.
            </p>
          )}
          {d.propertyId && !locked && !d.hasCollection && (
            <p className="border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              No rent has been paid for {d.closeRange.label} yet, so funds cannot be disbursed.
            </p>
          )}
          {!canDownload && canExport && d.exportData.length > 0 && (
            <p className="text-xs text-amber-700">
              Select a property, payment method, and reference before generating the disbursement PDF.
            </p>
          )}

          <div className="flex flex-col gap-3 border-t border-stone-200 pt-4 sm:flex-row sm:items-center sm:justify-end">
            {canDownload ? (
              <DownloadPDFButton
                fileName={`owner-disbursement-${d.disburseMonth}`}
                title="Owner Disbursement Report"
                data={d.exportData}
                columns={breakdownColumns}
                metadata={d.pdfMetadata}
                sections={d.pdfSections}
                label="Generate PDF"
              />
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex h-9 items-center justify-center whitespace-nowrap bg-blue-700 px-4 text-[11px] font-bold uppercase tracking-[0.2em] text-white opacity-45"
              >
                Generate PDF
              </button>
            )}
            <button
              type="button"
              onClick={d.requestRelease}
              disabled={!d.canRelease || d.savingClose}
              className="inline-flex h-9 items-center justify-center whitespace-nowrap bg-black px-4 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-black/80 disabled:opacity-45"
            >
              {locked ? "Already disbursed" : "Disburse funds"}
            </button>
          </div>
        </div>
      </ModalSlider>

      {d.confirmRelease ? (
        <DisburseConfirmDialog
          monthLabel={d.closeRange.label}
          propertyName={d.selectedProperty?.name || "this property"}
          amount={locked ? d.closeTotals.payout : d.closeTotals.canDisburse}
          saving={d.savingClose}
          onCancel={d.cancelRelease}
          onConfirm={d.release}
        />
      ) : null}
    </>
  );
}
