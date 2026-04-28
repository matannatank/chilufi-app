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

export async function sendWhatsApp(toPhone: string, message: string) {
  if (!hasTwilioConfig || !client || !fromNumber) {
    return { success: false, reason: "twilio_not_configured" };
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
    console.error("WhatsApp send failed:", error);
    return { success: false, reason: "send_failed", error };
  }
}

export function isTwilioConfigured() {
  return hasTwilioConfig;
}
