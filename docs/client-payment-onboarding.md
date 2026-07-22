# Client Payment Onboarding

MakaziCloud should not use per-client server environment variables for payment
or messaging accounts. Environment variables are platform-level secrets only.

## M-Pesa

Each client organization has one M-Pesa configuration row:

```text
organization_mpesa_configs.organizationId
organization_mpesa_configs.shortcode
organization_mpesa_configs.environment
organization_mpesa_configs.consumer_key_encrypted
organization_mpesa_configs.consumer_secret_encrypted
organization_mpesa_configs.passkey_encrypted
organization_mpesa_configs.is_active
```

The normal tenant settings UI does not expose an M-Pesa tab. This keeps payment
credentials controlled during onboarding and avoids accidental tenant-side
changes to live collection accounts.

Use a controlled admin/onboarding path to create or update M-Pesa credentials.
The existing API can still support that path, and public callbacks remain active
for registered shortcodes.

Required platform secret:

```text
MPESA_CONFIG_SECRET
```

## SMS

Each client organization can have one SMS configuration row:

```text
organization_sms_configs.organizationId
organization_sms_configs.provider
organization_sms_configs.partner_id_encrypted
organization_sms_configs.api_key_encrypted
organization_sms_configs.sender_id
organization_sms_configs.is_active
```

SMS can still fall back to platform environment variables while migrating
existing clients, but per-client accounts should use the database-backed config.

Required platform secret:

```text
SMS_CONFIG_SECRET
```

## Add-Ons

Feature access is controlled through:

```text
organization_addons.organizationId
organization_addons.addon_key
organization_addons.enabled
organization_addons.config
```

This lets one client have SMS, M-Pesa, public listings, utilities, or future
modules enabled without changing another client's data or UI.
