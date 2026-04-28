import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildMessage } from "@/lib/messages";
import { isTwilioConfigured, sendWhatsApp } from "@/lib/twilio";
import type { Location, UserRole } from "@/types";

type NotifyType =
  | "new_offer"
  | "new_application"
  | "chosen"
  | "cancelled_w_app"
  | "cancelled_after_match";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
}

const supabaseAdmin = serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey)
  : null;

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({
      sent: 0,
      failed: 0,
      skipped: true,
      reason: "missing_service_role_key",
    });
  }

  const body = (await req.json()) as {
    type?: NotifyType;
    offerId?: string;
  };

  if (!body.type || !body.offerId) {
    return NextResponse.json({ error: "Missing type or offerId" }, { status: 400 });
  }

  const { data: offerRow, error: offerError } = await supabaseAdmin
    .from("swap_offers")
    .select(
      "id, poster_id, shift_date, start_time, end_time, location, chosen_applicant_id, profiles!swap_offers_poster_id_fkey(full_name, role, has_hazmat, has_license)",
    )
    .eq("id", body.offerId)
    .single();

  if (offerError || !offerRow) {
    return NextResponse.json({ error: "Offer not found" }, { status: 404 });
  }

  const poster = Array.isArray(offerRow.profiles)
    ? offerRow.profiles[0]
    : offerRow.profiles;

  if (!poster) {
    return NextResponse.json({ error: "Poster profile missing" }, { status: 400 });
  }

  const offer = {
    id: offerRow.id,
    shift_date: offerRow.shift_date,
    start_time: offerRow.start_time,
    end_time: offerRow.end_time,
    location: offerRow.location as Location,
    poster: {
      full_name: poster.full_name,
      role: poster.role as UserRole,
      has_hazmat: poster.has_hazmat,
      has_license: poster.has_license,
    },
  };

  let recipients: Array<{ phone: string; name: string }> = [];

  switch (body.type) {
    case "new_offer": {
      const { data: users } = await supabaseAdmin
        .from("profiles")
        .select("phone, full_name, id")
        .neq("id", offerRow.poster_id);
      recipients =
        users?.map((user) => ({ phone: user.phone, name: user.full_name })) ?? [];
      break;
    }
    case "new_application": {
      const { data: posterProfile } = await supabaseAdmin
        .from("profiles")
        .select("phone, full_name")
        .eq("id", offerRow.poster_id)
        .single();
      if (posterProfile) {
        recipients = [{ phone: posterProfile.phone, name: posterProfile.full_name }];
      }
      break;
    }
    case "chosen":
    case "cancelled_after_match": {
      if (offerRow.chosen_applicant_id) {
        const { data: chosenProfile } = await supabaseAdmin
          .from("profiles")
          .select("phone, full_name")
          .eq("id", offerRow.chosen_applicant_id)
          .single();
        if (chosenProfile) {
          recipients = [{ phone: chosenProfile.phone, name: chosenProfile.full_name }];
        }
      }
      break;
    }
    case "cancelled_w_app": {
      const { data: apps } = await supabaseAdmin
        .from("applications")
        .select("applicant_id")
        .eq("offer_id", body.offerId)
        .eq("status", "pending");

      if (apps && apps.length > 0) {
        const ids = apps.map((application) => application.applicant_id);
        const { data: profiles } = await supabaseAdmin
          .from("profiles")
          .select("phone, full_name, id")
          .in("id", ids);
        recipients =
          profiles?.map((profile) => ({
            phone: profile.phone,
            name: profile.full_name,
          })) ?? [];
      }
      break;
    }
    default:
      return NextResponse.json({ error: "Unknown notification type" }, { status: 400 });
  }

  if (!isTwilioConfigured()) {
    return NextResponse.json({
      sent: 0,
      failed: 0,
      skipped: true,
      reason: "twilio_not_configured",
      recipients: recipients.length,
    });
  }

  const message = buildMessage(body.type, offer);
  const results = await Promise.all(
    recipients.map((recipient) => sendWhatsApp(recipient.phone, message)),
  );

  const sent = results.filter((result) => result.success).length;
  const failed = results.length - sent;

  return NextResponse.json({ sent, failed, skipped: false });
}
