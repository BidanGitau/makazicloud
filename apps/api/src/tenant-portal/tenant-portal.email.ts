import { escapeHtml } from "../email/escape-html";

type PortalInviteEmailInput = {
  to: string;
  acceptUrl: string;
  expiresAt: Date;
  tenantName: string;
  organizationName: string | null;
  propertyName: string | null;
  unitNumber: string | null;
};

const EMAIL_FROM =
  process.env.EMAIL_FROM || "MakaziCloud <noreply@support.makazicloud.com>";


export async function sendPortalInviteEmail(
  input: PortalInviteEmailInput,
): Promise<{ sent: boolean; reason?: string; messageId?: string }> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return { sent: false, reason: "RESEND_API_KEY is not configured." };
  }

  const orgName = input.organizationName || "MakaziCloud";
  const subject = `${orgName}: activate your tenant portal`;
  const html = renderHtml(input, orgName);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: input.to,
      subject,
      html,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
  };

  if (!response.ok) {
    return { sent: false, reason: payload?.message || "Resend rejected the request" };
  }
  return { sent: true, messageId: payload?.id };
}

function renderHtml(input: PortalInviteEmailInput, orgName: string) {
  const safe = {
    tenantName: escapeHtml(input.tenantName || "Tenant"),
    organizationName: escapeHtml(orgName),
    propertyName: escapeHtml(input.propertyName || "your property"),
    unitNumber: input.unitNumber ? escapeHtml(input.unitNumber) : "",


    acceptUrl: input.acceptUrl,
    expires: escapeHtml(input.expiresAt.toUTCString()),
  };

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 540px;">
      <h2 style="margin: 0 0 12px;">Activate your tenant portal</h2>
      <p>Hi <strong>${safe.tenantName}</strong>,</p>
      <p>
        ${safe.organizationName} has invited you to access your tenant portal for
        <strong>${safe.propertyName}${safe.unitNumber ? ` &middot; Unit ${safe.unitNumber}` : ""}</strong>.
        From the portal you can view payments, raise maintenance requests and
        track your balance.
      </p>
      <p style="margin: 24px 0;">
        <a
          href="${safe.acceptUrl}"
          style="display:inline-block;background:#1d4ed8;color:#fff;
                 padding:12px 20px;text-decoration:none;
                 font-weight:700;letter-spacing:0.04em;text-transform:uppercase;
                 font-size:12px;"
        >Activate Portal</a>
      </p>
      <p style="font-size: 12px; color: #555;">
        Or copy this link into your browser:<br />
        <span style="word-break: break-all;">${safe.acceptUrl}</span>
      </p>
      <p style="font-size: 12px; color: #555;">
        This link can only be used once and expires on ${safe.expires}.
      </p>
    </div>
  `;
}
