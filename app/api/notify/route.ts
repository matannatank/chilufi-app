import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  buildMessage,
  buildShiftCommanderRequestMessage,
  type ShiftCommanderRequestNotifyType,
} from "@/lib/messages";
import {
  sendWebPushForOfferEvent,
  sendWebPushForShiftCommanderRequest,
  isWebPushConfigured,
} from "@/lib/push-send";
import { isTwilioConfigured, sendWhatsApp } from "@/lib/twilio";
import type { Location, Shift, UserRole } from "@/types";

type NotifyType =
  | "new_offer"
  | "new_application"
  | "chosen"
  | "cancelled_w_app"
  | "cancelled_after_match"
  | "cancelled_during_approval"
  | "commander_approval_needed"
  | "commander_approved"
  | "commander_rejected"
  | "auto_approved";

type Recipient = { phone: string; name: string; userId: string };

const SHIFT_COMMANDER_REQUEST_TYPES = new Set<ShiftCommanderRequestNotifyType>([
  "shift_commander_request_submitted",
  "shift_commander_request_approved",
  "shift_commander_request_rejected",
]);

function isShiftCommanderRequestType(
  type: string | undefined,
): type is ShiftCommanderRequestNotifyType {
  return Boolean(type && SHIFT_COMMANDER_REQUEST_TYPES.has(type as ShiftCommanderRequestNotifyType));
}

async function deliverNotifications(
  recipients: Recipient[],
  message: string,
  pushSend: () => Promise<{
    skipped: boolean;
    reason?: string;
    targetUserCount: number;
    attempted: number;
    sent: number;
    failed: number;
    loadFailed?: boolean;
  }>,
) {
  const withPhone = recipients.filter((recipient) => recipient.phone.trim().length > 0);
  const skippedNoPhone = recipients.length - withPhone.length;

  let whatsappSent = 0;
  let whatsappFailed = 0;
  let failures:
    | Array<{
        phoneSuffix: string;
        reason: string;
        twilioCode?: number;
        twilioMessage?: string;
      }>
    | undefined;

  if (isTwilioConfigured()) {
    const results = await Promise.all(
      withPhone.map((recipient) => sendWhatsApp(recipient.phone, message)),
    );
    whatsappSent = results.filter((result) => result.success).length;
    whatsappFailed = results.length - whatsappSent;
    const flat = results.flatMap((result, index) => {
      if (result.success) {
        return [];
      }
      const phoneSuffix = withPhone[index]?.phone.slice(-4) ?? "";
      return [
        {
          phoneSuffix,
          reason: result.reason,
          twilioCode: result.twilioCode,
          twilioMessage: result.twilioMessage,
        },
      ];
    });
    failures = flat.length > 0 ? flat : undefined;
  }

  const pushResult = isWebPushConfigured()
    ? await pushSend()
    : {
        skipped: true as const,
        reason: "web_push_not_configured" as const,
        targetUserCount: 0,
        attempted: 0,
        sent: 0,
        failed: 0,
      };

  return NextResponse.json({
    whatsapp: {
      sent: whatsappSent,
      failed: whatsappFailed,
      skipped: !isTwilioConfigured(),
      reason: !isTwilioConfigured() ? "twilio_not_configured" : undefined,
      recipientCount: recipients.length,
      attempted: isTwilioConfigured() ? withPhone.length : 0,
      skippedNoPhone,
      failures,
    },
    push: pushResult,
  });
}

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
      whatsapp: {
        sent: 0,
        failed: 0,
        skipped: true,
        reason: "missing_service_role_key",
      },
      push: {
        skipped: true,
        reason: "missing_service_role_key",
        targetUserCount: 0,
        attempted: 0,
        sent: 0,
        failed: 0,
      },
    });
  }

  const body = (await req.json()) as {
    type?: string;
    offerId?: string;
    requestId?: string;
    rejectionReason?: string;
  };

  if (isShiftCommanderRequestType(body.type) && body.requestId) {
    const { data: requestRow, error: requestError } = await supabaseAdmin
      .from("shift_commander_requests")
      .select("id, user_id, shift, status, rejection_reason, profiles!shift_commander_requests_user_id_fkey(full_name, phone)")
      .eq("id", body.requestId)
      .single();

    if (requestError || !requestRow) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const requesterProfile = Array.isArray(requestRow.profiles)
      ? requestRow.profiles[0]
      : requestRow.profiles;

    if (!requesterProfile) {
      return NextResponse.json({ error: "Requester profile missing" }, { status: 400 });
    }

    const notifyPayload = {
      requesterName: requesterProfile.full_name,
      shift: requestRow.shift as Shift,
      rejectionReason: body.rejectionReason ?? requestRow.rejection_reason,
    };

    let recipients: Recipient[] = [];

    if (body.type === "shift_commander_request_submitted") {
      const { data: admins } = await supabaseAdmin
        .from("app_admins")
        .select("user_id, profiles!app_admins_user_id_fkey(full_name, phone)");

      recipients =
        admins?.map((admin) => {
          const profile = Array.isArray(admin.profiles) ? admin.profiles[0] : admin.profiles;
          return {
            userId: admin.user_id,
            name: profile?.full_name ?? "מנהל",
            phone: profile?.phone ?? "",
          };
        }) ?? [];
    } else {
      recipients = [
        {
          userId: requestRow.user_id,
          name: requesterProfile.full_name,
          phone: requesterProfile.phone,
        },
      ];
    }

    const message = buildShiftCommanderRequestMessage(body.type, notifyPayload);
    const recipientUserIds = recipients.map((recipient) => recipient.userId);

    return deliverNotifications(recipients, message, () =>
      sendWebPushForShiftCommanderRequest(
        supabaseAdmin,
        body.type as ShiftCommanderRequestNotifyType,
        notifyPayload,
        recipientUserIds,
      ),
    );
  }

  if (!body.type || !body.offerId) {
    return NextResponse.json({ error: "Missing type or offerId" }, { status: 400 });
  }

  const { data: offerRow, error: offerError } = await supabaseAdmin
    .from("swap_offers")
    .select(
      "id, poster_id, shift_date, start_time, end_time, location, chosen_applicant_id, profiles!swap_offers_poster_id_fkey(full_name, role, shift, has_hazmat, has_license)",
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

  let chosenProfile:
    | {
        id: string;
        full_name: string;
        phone: string;
        shift: Shift | null;
      }
    | null = null;

  if (offerRow.chosen_applicant_id) {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, phone, shift")
      .eq("id", offerRow.chosen_applicant_id)
      .maybeSingle();
    chosenProfile = data;
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
      shift: (poster.shift as Shift | null) ?? null,
      has_hazmat: poster.has_hazmat,
      has_license: poster.has_license,
    },
    chosen: chosenProfile
      ? {
          full_name: chosenProfile.full_name,
          shift: chosenProfile.shift,
        }
      : null,
    rejection_reason: body.rejectionReason ?? null,
  };

  let recipients: Recipient[] = [];

  switch (body.type) {
    case "new_offer": {
      const { data: users } = await supabaseAdmin
        .from("profiles")
        .select("phone, full_name, id")
        .neq("id", offerRow.poster_id);
      recipients =
        users?.map((user) => ({
          phone: user.phone,
          name: user.full_name,
          userId: user.id,
        })) ?? [];
      break;
    }
    case "new_application": {
      const { data: posterProfile } = await supabaseAdmin
        .from("profiles")
        .select("phone, full_name, id")
        .eq("id", offerRow.poster_id)
        .single();
      if (posterProfile) {
        recipients = [
          {
            phone: posterProfile.phone,
            name: posterProfile.full_name,
            userId: posterProfile.id,
          },
        ];
      }
      break;
    }
    case "chosen":
    case "cancelled_after_match": {
      if (chosenProfile) {
        recipients = [
          {
            phone: chosenProfile.phone,
            name: chosenProfile.full_name,
            userId: chosenProfile.id,
          },
        ];
      }
      break;
    }
    case "commander_approval_needed": {
      const { data: approvals } = await supabaseAdmin
        .from("commander_approvals")
        .select("commander_id")
        .eq("offer_id", body.offerId)
        .eq("status", "pending");

      if (approvals && approvals.length > 0) {
        const commanderIds = approvals.map((row) => row.commander_id);
        const { data: commanders } = await supabaseAdmin
          .from("profiles")
          .select("id, full_name, phone")
          .in("id", commanderIds);
        recipients =
          commanders?.map((profile) => ({
            phone: profile.phone,
            name: profile.full_name,
            userId: profile.id,
          })) ?? [];
      }
      break;
    }
    case "commander_approved":
    case "commander_rejected":
    case "auto_approved": {
      const ids = [offerRow.poster_id, offerRow.chosen_applicant_id].filter(
        (value): value is string => Boolean(value),
      );
      if (ids.length > 0) {
        const { data: profiles } = await supabaseAdmin
          .from("profiles")
          .select("id, full_name, phone")
          .in("id", ids);
        recipients =
          profiles?.map((profile) => ({
            phone: profile.phone,
            name: profile.full_name,
            userId: profile.id,
          })) ?? [];
      }
      break;
    }
    case "cancelled_during_approval": {
      const { data: approvals } = await supabaseAdmin
        .from("commander_approvals")
        .select("commander_id")
        .eq("offer_id", body.offerId)
        .eq("status", "pending");

      if (approvals && approvals.length > 0) {
        const commanderIds = approvals.map((row) => row.commander_id);
        const { data: commanders } = await supabaseAdmin
          .from("profiles")
          .select("id, full_name, phone")
          .in("id", commanderIds);
        recipients =
          commanders?.map((profile) => ({
            phone: profile.phone,
            name: profile.full_name,
            userId: profile.id,
          })) ?? [];
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
            userId: profile.id,
          })) ?? [];
      }
      break;
    }
    default:
      return NextResponse.json({ error: "Unknown notification type" }, { status: 400 });
  }

  const message = buildMessage(body.type as NotifyType, offer);
  const recipientUserIds = recipients.map((recipient) => recipient.userId);

  return deliverNotifications(recipients, message, () =>
    sendWebPushForOfferEvent(
      supabaseAdmin,
      body.type as NotifyType,
      offer,
      recipientUserIds,
    ),
  );
}
