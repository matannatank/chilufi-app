import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;

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
