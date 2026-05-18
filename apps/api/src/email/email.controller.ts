import { Body, Controller, Post, UseGuards } from "@nestjs/common";

import { RequirePermissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import { TenantGuard } from "../tenancy/tenant.guard";
import { escapeHtml } from "./escape-html";

type WelcomeEmailInput = {
  tenantName?: string;
  tenantEmail?: string;
  nationalId?: string;
  emergencyContact?: string;
  occupation?: string;
  propertyName?: string;
  unitNumber?: string;
  leaseStart?: string;
  rentAmount?: string | number;
  depositAmount?: string | number;
  notes?: string;
};

const emailFrom =
  process.env.EMAIL_FROM || "MakaziCloud <noreply@contact.makazicloud.com>";

@Controller("email")
@UseGuards(TenantGuard, PermissionsGuard)
export class EmailController {
  @Post("welcome")
  @RequirePermissions("tenants:create")
  async sendWelcome(@Body() input: WelcomeEmailInput) {
    if (!input.tenantEmail) {
      return { success: true, skipped: true, reason: "Tenant email is missing." };
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return {
        success: true,
        skipped: true,
        reason: "RESEND_API_KEY is not configured.",
      };
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: emailFrom,
        to: input.tenantEmail,
        subject: `Welcome ${input.tenantName || "Tenant"} - Your Tenancy Details`,
        html: this.renderWelcomeEmail(input),
      }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        error: payload?.message || "Failed to send welcome email.",
      };
    }

    return { success: true, messageId: payload?.id };
  }

  private renderWelcomeEmail(input: WelcomeEmailInput) {
    const safe = {
      tenantName: escapeHtml(input.tenantName || "Tenant"),
      propertyName: escapeHtml(input.propertyName || "N/A"),
      unitNumber: escapeHtml(input.unitNumber || "N/A"),
      leaseStart: escapeHtml(input.leaseStart || "N/A"),
      nationalId: escapeHtml(input.nationalId || "N/A"),
      emergencyContact: escapeHtml(input.emergencyContact || "N/A"),
      occupation: escapeHtml(input.occupation || "N/A"),
      notes: input.notes ? escapeHtml(input.notes) : "",
    };
    // Numbers run through Number(...).toLocaleString so the raw user string
    // never reaches the HTML — no escaping needed for them.
    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h1>Welcome to Your New Home!</h1>
        <p>Dear <strong>${safe.tenantName}</strong>,</p>
        <p>Welcome. Below are your tenancy details for your records.</p>
        <ul>
          <li><strong>Property:</strong> ${safe.propertyName}</li>
          <li><strong>Unit:</strong> ${safe.unitNumber}</li>
          <li><strong>Lease Start:</strong> ${safe.leaseStart}</li>
          <li><strong>Monthly Rent:</strong> KSh ${Number(input.rentAmount || 0).toLocaleString("en-KE")}</li>
          <li><strong>Deposit:</strong> KSh ${Number(input.depositAmount || 0).toLocaleString("en-KE")}</li>
          <li><strong>National ID:</strong> ${safe.nationalId}</li>
          <li><strong>Emergency Contact:</strong> ${safe.emergencyContact}</li>
          <li><strong>Occupation:</strong> ${safe.occupation}</li>
        </ul>
        ${safe.notes ? `<p><strong>Notes:</strong> ${safe.notes}</p>` : ""}
      </div>
    `;
  }
}
