import { showToast } from "@/app/_components/CustomToast";
import { apiFetch } from "@/app/_lib/api/client";
import { buildOwnerDisbursementSms } from "./ownerDisbursementSms";

/** Sends the owner the disbursement brief SMS; returns true when sent. */
export async function sendOwnerBrief(row, propertiesById = {}) {
  const property = propertiesById[row.property_id] || {};
  const phone = row.owner_phone || property.owner_phone;
  if (!phone) {
    showToast.error("Add an owner phone on the property first.");
    return false;
  }
  const message = buildOwnerDisbursementSms({
    ownerName: row.owner_name || property.owner_name,
    propertyName: row.property_name || property.name,
    closeMonth: row.close_month,
    gross: row.gross_collection,
    commissionAmount: row.commission_amount,
    commissionRate:
      row.commission_rate ?? property.commission_rate ?? 0,
    maintenance: row.maintenance_amount,
    advances: row.advances_amount,
    payout: row.owner_payout,
  });
  try {
    await apiFetch("/sms/owner-brief", {
      method: "POST",
      body: {
        messages: [{ phoneNumber: phone, message }],
      },
    });
    showToast.success("Collection brief SMS sent to owner.");
    return true;
  } catch (err) {
    console.error(err);
    showToast.error(err?.message || "Failed to send owner SMS.");
    return false;
  }
}
