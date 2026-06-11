import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendEmail, sendGuestMeetingConfirmationEmail, sendTemporaryPasswordEmail } from "./email";

const mocks = vi.hoisted(() => ({
  createTransport: vi.fn(),
  sendMail: vi.fn(),
  logDevError: vi.fn(),
  isDevLoggingEnabled: vi.fn(),
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: mocks.createTransport,
  },
}));

vi.mock("@/lib/error-logger", () => ({
  default: mocks.logDevError,
  isDevLoggingEnabled: mocks.isDevLoggingEnabled,
}));

const SMTP_ENV_KEYS = [
  "APP_BASE_URL",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_SECURE",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
];

describe("SMTP email delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of SMTP_ENV_KEYS) {
      delete process.env[key];
    }
    mocks.createTransport.mockReturnValue({ sendMail: mocks.sendMail });
    mocks.sendMail.mockResolvedValue({ messageId: "message-1" });
    mocks.logDevError.mockResolvedValue(undefined);
    mocks.isDevLoggingEnabled.mockReturnValue(false);
  });

  it("skips delivery when required SMTP settings are missing", async () => {
    process.env.SMTP_HOST = "smtp.example.com";

    const result = await sendEmail({
      to: "member@example.com",
      subject: "Hello",
      text: "Body",
    });

    expect(result).toEqual({ sent: false, skipped: true });
    expect(mocks.createTransport).not.toHaveBeenCalled();
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });

  it("skips delivery when SMTP_PORT is invalid", async () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "not-a-port";
    process.env.SMTP_FROM = "HL Fitness <no-reply@example.com>";

    const result = await sendEmail({
      to: "member@example.com",
      subject: "Hello",
      text: "Body",
    });

    expect(result).toEqual({ sent: false, skipped: true });
    expect(mocks.createTransport).not.toHaveBeenCalled();
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });

  it("sends through Nodemailer when SMTP is configured", async () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "465";
    process.env.SMTP_SECURE = "true";
    process.env.SMTP_USER = "smtp-user";
    process.env.SMTP_PASS = "smtp-pass";
    process.env.SMTP_FROM = "HL Fitness <no-reply@example.com>";

    const result = await sendEmail({
      to: "member@example.com",
      subject: "Welcome",
      text: "Plain text body",
    });

    expect(result).toEqual({ sent: true, skipped: false });
    expect(mocks.createTransport).toHaveBeenCalledWith({
      host: "smtp.example.com",
      port: 465,
      secure: true,
      auth: {
        user: "smtp-user",
        pass: "smtp-pass",
      },
    });
    expect(mocks.sendMail).toHaveBeenCalledWith({
      from: "HL Fitness <no-reply@example.com>",
      to: "member@example.com",
      subject: "Welcome",
      text: "Plain text body",
      html: undefined,
    });
  });

  it("returns an unsent result when SMTP delivery fails", async () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_FROM = "HL Fitness <no-reply@example.com>";
    mocks.sendMail.mockRejectedValue(new Error("SMTP unavailable"));

    const result = await sendEmail({
      to: "member@example.com",
      subject: "Hello",
      text: "Body",
    });

    expect(result).toEqual({ sent: false, skipped: false });
    expect(mocks.logDevError).toHaveBeenCalledWith({
      error: expect.any(Error),
      req: { method: "EMAIL", url: "smtp", body: { to: "member@example.com", subject: "Hello" } },
    });
  });

  it("builds a guest meeting confirmation email with meeting details", async () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_FROM = "HL Fitness <no-reply@example.com>";

    await sendGuestMeetingConfirmationEmail({
      to: "guest@example.com",
      guestName: "Alex",
      coachName: "Jordan",
      scheduledAt: "2026-06-05T03:00:00.000Z",
    });

    expect(mocks.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "guest@example.com",
        subject: "HL Fitness coach meeting confirmed",
        text: expect.stringContaining("Hi Alex,"),
      }),
    );
    expect(mocks.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("Your meeting with Jordan at HL Fitness is confirmed"),
      }),
    );
    expect(mocks.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("Address: 303 Le Thanh Nghi."),
      }),
    );
  });

  it("builds a temporary password email with the configured app URL", async () => {
    process.env.APP_BASE_URL = "https://fitness.example.com";
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_FROM = "HL Fitness <no-reply@example.com>";

    await sendTemporaryPasswordEmail({
      to: "guest@example.com",
      guestName: "Alex",
      password: "TempPass123",
    });

    expect(mocks.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "guest@example.com",
        subject: "Your HL Fitness member login",
        text: expect.stringContaining("Login: https://fitness.example.com/auth"),
      }),
    );
    expect(mocks.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("Temporary password: TempPass123"),
      }),
    );
  });
});
