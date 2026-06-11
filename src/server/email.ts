import nodemailer from "nodemailer";
import logDevError, { isDevLoggingEnabled } from "@/lib/error-logger";

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type SendEmailResult = {
  sent: boolean;
  skipped: boolean;
};

type SmtpConfig = {
  host: string;
  from: string;
  port: number;
  secure: boolean;
  auth?: {
    user: string;
    pass: string;
  };
};

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const config = readSmtpConfig();

  if (!config) {
    if (isDevLoggingEnabled()) {
      console.warn(`[email skipped] ${input.subject} -> ${input.to}`);
    }
    return { sent: false, skipped: true };
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    ...(config.auth ? { auth: config.auth } : {}),
  });

  try {
    await transporter.sendMail({
      from: config.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    return { sent: true, skipped: false };
  } catch (error) {
    await logDevError({
      error,
      req: { method: "EMAIL", url: "smtp", body: { to: input.to, subject: input.subject } },
    }).catch(() => {});
    return { sent: false, skipped: false };
  }
}

export async function sendGuestMeetingConfirmationEmail(input: {
  to: string;
  guestName: string;
  coachName: string;
  scheduledAt: string;
}): Promise<SendEmailResult> {
  const when = formatSaigonDateTime(input.scheduledAt);
  return sendEmail({
    to: input.to,
    subject: "HL Fitness coach meeting confirmed",
    text: [
      `Hi ${input.guestName},`,
      "",
      `Your meeting with ${input.coachName} at HL Fitness is confirmed for ${when}.`,
      "Address: 303 Le Thanh Nghi.",
      "",
      "If you need to change the time, contact HL Fitness directly.",
    ].join("\n"),
  });
}

export async function sendTemporaryPasswordEmail(input: {
  to: string;
  guestName: string;
  password: string;
}): Promise<SendEmailResult> {
  const baseUrl = process.env.APP_BASE_URL || "http://127.0.0.1:5173";
  return sendEmail({
    to: input.to,
    subject: "Your HL Fitness member login",
    text: [
      `Hi ${input.guestName},`,
      "",
      "Your HL Fitness member account is ready.",
      `Login: ${baseUrl}/auth`,
      `Temporary password: ${input.password}`,
      "",
      "You will be asked to change this password when you first sign in.",
    ].join("\n"),
  });
}

function formatSaigonDateTime(isoDateTime: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Saigon",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(isoDateTime));
}

function readSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const from = process.env.SMTP_FROM?.trim();

  if (!host || !from) return null;

  const portValue = process.env.SMTP_PORT?.trim() || "587";
  const port = Number(portValue);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) return null;

  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;
  const auth = user && pass ? { user, pass } : undefined;

  return {
    host,
    from,
    port,
    secure: process.env.SMTP_SECURE?.trim().toLowerCase() === "true",
    auth,
  };
}
