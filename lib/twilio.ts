import twilio from "twilio";

/**
 * Twilio WhatsApp "From" must not contain whitespace (error 21212 Invalid 'From' Phone Number).
 * Copy-paste into .env / Vercel often introduces a space after "+", e.g. whatsapp:+ 14155238886.
 * We normalize once when reading env — the single source used for every messages.create call.
 */
function readTwilioWhatsAppFrom(raw: string | undefined): string | undefined {
  if (raw == null) return undefined;
  const normalized = raw.trim().replace(/\s/g, "");
  return normalized.length > 0 ? normalized : undefined;
}

const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
const fromNumber = readTwilioWhatsAppFrom(process.env.TWILIO_WHATSAPP_NUMBER);

const hasTwilioConfig = Boolean(accountSid && authToken && fromNumber);
const client = hasTwilioConfig ? twilio(accountSid!, authToken!) : null;

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  if (phone.startsWith("+")) {
    return phone;
  }
  if (digits.startsWith("0")) {
    return `+972${digits.slice(1)}`;
  }
  if (digits.startsWith("972")) {
    return `+${digits}`;
  }
  return `+972${digits}`;
}

export type WhatsAppSendResult =
  | { success: true; sid: string }
  | {
      success: false;
      reason: "twilio_not_configured" | "send_failed" | "invalid_phone";
      twilioCode?: number;
      twilioMessage?: string;
    };

function twilioErrorFields(error: unknown): { code?: number; message?: string } {
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const code = record.code;
    const message = record.message;
    return {
      code: typeof code === "number" ? code : undefined,
      message: typeof message === "string" ? message : undefined,
    };
  }
  return {};
}

export async function sendWhatsApp(toPhone: string, message: string): Promise<WhatsAppSendResult> {
  if (!hasTwilioConfig || !client || !fromNumber) {
    return { success: false, reason: "twilio_not_configured" };
  }

  const trimmed = toPhone.trim();
  const digitsOnly = trimmed.replace(/\D/g, "");
  if (!trimmed || digitsOnly.length < 9) {
    return { success: false, reason: "invalid_phone" };
  }

  try {
    const formattedPhone = formatPhone(toPhone);
    const result = await client.messages.create({
      from: fromNumber,
      to: `whatsapp:${formattedPhone}`,
      body: message,
    });

    return { success: true, sid: result.sid };
  } catch (error) {
    const { code, message } = twilioErrorFields(error);
    console.error("WhatsApp send failed:", error);
    return {
      success: false,
      reason: "send_failed",
      twilioCode: code,
      twilioMessage: message,
    };
  }
}

export function isTwilioConfigured() {
  return hasTwilioConfig;
}
