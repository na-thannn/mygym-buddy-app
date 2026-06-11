# SMTP Email Delivery Design

## Scope

Finish the existing SMTP email path for guest meeting confirmations and temporary login emails. Do not add new email features or an admin test UI in this pass.

## Architecture

`src/server/email.ts` remains the single server-side mail boundary. It will parse SMTP environment variables, create a Nodemailer transport only when the required configuration is present, send email through that transport, and return the existing `{ sent, skipped }` result shape so current API routes do not need contract changes.

## Configuration

Required settings are `SMTP_HOST` and `SMTP_FROM`. `SMTP_PORT` defaults to `587`. `SMTP_SECURE` accepts `true` or `false` and defaults to `false`. `SMTP_USER` and `SMTP_PASS` are optional, but authentication is only enabled when both are present. Invalid ports should be treated as missing/failed configuration rather than causing a booking request to crash.

## Behavior

When required SMTP settings are missing, email delivery is skipped and the caller receives `{ sent: false, skipped: true }`. When SMTP is configured, `sendEmail` attempts delivery and returns `{ sent: true, skipped: false }` on success. SMTP exceptions are logged through the existing development error logger and return `{ sent: false, skipped: false }`.

## Templates

The existing guest meeting confirmation and temporary password emails stay as plain-text templates. The temporary login link continues to use `APP_BASE_URL`, defaulting to the local dev server URL.

## Testing

Add focused tests for the mailer:

- missing required SMTP settings skips delivery
- valid SMTP settings call Nodemailer with host, port, secure, auth, sender, recipient, subject, and body
- failed SMTP delivery returns an unsent, unskipped result
- guest meeting and temporary password templates include the expected details

## Documentation

Keep `.env.example` and `README.md` aligned with the supported SMTP variables and include practical provider guidance.
