"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { ROLE_LABELS, SHIFT_LABELS, SELF_ASSIGNABLE_ROLES } from "@/types";
import type { Profile, Shift, ShiftCommanderRequestStatus, UserRole } from "@/types";

type AdminTab = "requests" | "users" | "admins";

type PendingRequest = {
  id: string;
  user_id: string;
  shift: Shift;
  status: ShiftCommanderRequestStatus;
  rejection_reason: string | null;
  created_at: string;
  profiles: { full_name: string; phone: string; role: UserRole } | null;
};

type AdminUserRow = Pick<
  Profile,
  "id" | "full_name" | "phone" | "role" | "shift" | "has_hazmat" | "has_license" | "has_crane"
>;

type AdminRow = {
  user_id: string;
  profiles: { full_name: string } | null;
};

type AdminPanelProps = {
  currentUserId: string;
  initialRequests: PendingRequest[];
  initialUsers: AdminUserRow[];
  initialAdmins: AdminRow[];
};

async function notifyRequest(type: string, requestId: string, rejectionReason?: string) {
  await fetch("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, requestId, rejectionReason }),
  }).catch(() => {});
}

export function AdminPanel({
  currentUserId,
  initialRequests,
  initialUsers,
  initialAdmins,
}: AdminPanelProps) {
  const router = useRouter();
  const supabase = createClient();
  const [tab, setTab] = useState<AdminTab>(
    initialRequests.length > 0 ? "requests" : "users",
  );
  const [requests, setRequests] = useState(initialRequests);
  const [users, setUsers] = useState(initialUsers);
  const [admins, setAdmins] = useState(initialAdmins);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [addAdminUserId, setAddAdminUserId] = useState("");
  const [shiftFilter, setShiftFilter] = useState<Shift | "all">("all");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const pendingCount = requests.length;

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (shiftFilter !== "all" && user.shift !== shiftFilter) return false;
      if (roleFilter !== "all" && user.role !== roleFilter) return false;
      return true;
    });
  }, [users, shiftFilter, roleFilter]);

  const nonAdminUsers = useMemo(
    () => users.filter((user) => !admins.some((admin) => admin.user_id === user.id)),
    [users, admins],
  );

  const approveRequest = async (request: PendingRequest) => {
    setError("");
    setBusyId(request.id);

    const { data: existingCommander } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "shift_commander")
      .eq("shift", request.shift)
      .neq("id", request.user_id)
      .maybeSingle();

    if (existingCommander) {
      const confirmed = window.confirm(
        `כבר יש מפקד משמרת ל${SHIFT_LABELS[request.shift]} (${existingCommander.full_name}). להחליף?`,
      );
      if (!confirmed) {
        setBusyId(null);
        return;
      }
      await supabase
        .from("profiles")
        .update({ role: "fighter" })
        .eq("id", existingCommander.id);
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ role: "shift_commander", shift: request.shift })
      .eq("id", request.user_id);

    if (profileError) {
      setBusyId(null);
      setError("אישור הבקשה נכשל בעדכון הפרופיל");
      return;
    }

    const { error: requestError } = await supabase
      .from("shift_commander_requests")
      .update({
        status: "approved",
        reviewed_by: currentUserId,
        rejection_reason: null,
      })
      .eq("id", request.id);

    setBusyId(null);

    if (requestError) {
      setError("אישור הבקשה נכשל");
      return;
    }

    setRequests((current) => current.filter((row) => row.id !== request.id));
    setUsers((current) =>
      current.map((user) =>
        user.id === request.user_id
          ? { ...user, role: "shift_commander", shift: request.shift }
          : user.id === existingCommander?.id
            ? { ...user, role: "fighter" }
            : user,
      ),
    );
    await notifyRequest("shift_commander_request_approved", request.id);
    router.refresh();
  };

  const rejectRequest = async (requestId: string) => {
    const trimmed = rejectionReason.trim();
    if (!trimmed) {
      setError("יש להזין סיבת דחייה");
      return;
    }

    setError("");
    setBusyId(requestId);

    const { error: requestError } = await supabase
      .from("shift_commander_requests")
      .update({
        status: "rejected",
        reviewed_by: currentUserId,
        rejection_reason: trimmed,
      })
      .eq("id", requestId);

    setBusyId(null);
    setRejectingId(null);
    setRejectionReason("");

    if (requestError) {
      setError("דחיית הבקשה נכשלה");
      return;
    }

    setRequests((current) => current.filter((row) => row.id !== requestId));
    await notifyRequest("shift_commander_request_rejected", requestId, trimmed);
    router.refresh();
  };

  const saveUser = async (user: AdminUserRow) => {
    setError("");
    setBusyId(user.id);

    if (user.role === "shift_commander") {
      const { data: existingCommander } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "shift_commander")
        .eq("shift", user.shift)
        .neq("id", user.id)
        .maybeSingle();

      if (existingCommander) {
        const confirmed = window.confirm(
          `כבר יש מפקד משמרת ל${user.shift ? SHIFT_LABELS[user.shift] : "משמרת"} (${existingCommander.full_name}). להחליף?`,
        );
        if (!confirmed) {
          setBusyId(null);
          return;
        }
        await supabase
          .from("profiles")
          .update({ role: "fighter" })
          .eq("id", existingCommander.id);
      }
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        role: user.role,
        shift: user.shift,
      })
      .eq("id", user.id);

    setBusyId(null);

    if (updateError) {
      setError("שמירת המשתמש נכשלה");
      return;
    }

    router.refresh();
  };

  const addAdmin = async () => {
    if (!addAdminUserId) return;
    setError("");
    setBusyId(addAdminUserId);

    const { error: insertError } = await supabase.from("app_admins").insert({
      user_id: addAdminUserId,
      created_by: currentUserId,
    });

    setBusyId(null);

    if (insertError) {
      setError("הוספת מנהל נכשלה");
      return;
    }

    const profile = users.find((user) => user.id === addAdminUserId);
    setAdmins((current) => [
      ...current,
      { user_id: addAdminUserId, profiles: { full_name: profile?.full_name ?? "משתמש" } },
    ]);
    setAddAdminUserId("");
    router.refresh();
  };

  const removeAdmin = async (userId: string) => {
    if (admins.length <= 1) {
      setError("חייב להישאר לפחות מנהל אחד במערכת");
      return;
    }

    const confirmed = window.confirm("להסיר מנהל זה?");
    if (!confirmed) return;

    setError("");
    setBusyId(userId);

    const { error: deleteError } = await supabase
      .from("app_admins")
      .delete()
      .eq("user_id", userId);

    setBusyId(null);

    if (deleteError) {
      setError("הסרת מנהל נכשלה");
      return;
    }

    setAdmins((current) => current.filter((admin) => admin.user_id !== userId));
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-zinc-200/80 p-1 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setTab("requests")}
          className={`rounded-lg px-2 py-2 ${tab === "requests" ? "bg-zinc-50 text-zinc-900 shadow-sm" : "text-zinc-600"}`}
        >
          בקשות{pendingCount > 0 ? ` (${pendingCount})` : ""}
        </button>
        <button
          type="button"
          onClick={() => setTab("users")}
          className={`rounded-lg px-2 py-2 ${tab === "users" ? "bg-zinc-50 text-zinc-900 shadow-sm" : "text-zinc-600"}`}
        >
          משתמשים
        </button>
        <button
          type="button"
          onClick={() => setTab("admins")}
          className={`rounded-lg px-2 py-2 ${tab === "admins" ? "bg-zinc-50 text-zinc-900 shadow-sm" : "text-zinc-600"}`}
        >
          מנהלים
        </button>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </p>
      ) : null}

      {tab === "requests" ? (
        <section className="flex flex-col gap-3">
          {requests.length === 0 ? (
            <p className="rounded-xl border border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-600">
              אין בקשות ממתינות למפקד משמרת
            </p>
          ) : (
            requests.map((request) => {
              const requesterName = request.profiles?.full_name ?? "משתמש";
              return (
                <article
                  key={request.id}
                  className="rounded-xl border border-amber-300 bg-amber-50/80 p-4 shadow-sm"
                >
                  <p className="text-sm font-bold text-zinc-900">{requesterName}</p>
                  <p className="mt-1 text-sm text-zinc-800">
                    מבקש להיות {ROLE_LABELS.shift_commander} · {SHIFT_LABELS[request.shift]}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={busyId === request.id}
                      onClick={() => approveRequest(request)}
                      className="h-9 flex-1 rounded-lg bg-zinc-900 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      אשר
                    </button>
                    <button
                      type="button"
                      disabled={busyId === request.id}
                      onClick={() => {
                        setRejectingId(request.id);
                        setRejectionReason("");
                      }}
                      className="h-9 flex-1 rounded-lg border border-red-300 text-xs font-semibold text-red-800 disabled:opacity-60"
                    >
                      דחה
                    </button>
                  </div>
                  {rejectingId === request.id ? (
                    <div className="mt-3 flex flex-col gap-2">
                      <textarea
                        value={rejectionReason}
                        onChange={(event) => setRejectionReason(event.target.value)}
                        placeholder="סיבת דחייה (חובה)"
                        className="min-h-20 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => rejectRequest(request.id)}
                        className="h-9 rounded-lg bg-red-700 text-xs font-semibold text-white"
                      >
                        שלח דחייה
                      </button>
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </section>
      ) : null}

      {tab === "users" ? (
        <section className="flex flex-col gap-3">
          <div className="flex gap-2">
            <select
              value={shiftFilter}
              onChange={(event) => setShiftFilter(event.target.value as Shift | "all")}
              className="h-9 flex-1 rounded-lg border border-zinc-300 bg-white px-2 text-xs"
            >
              <option value="all">כל המשמרות</option>
              <option value="a">{SHIFT_LABELS.a}</option>
              <option value="b">{SHIFT_LABELS.b}</option>
              <option value="c">{SHIFT_LABELS.c}</option>
            </select>
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value as UserRole | "all")}
              className="h-9 flex-1 rounded-lg border border-zinc-300 bg-white px-2 text-xs"
            >
              <option value="all">כל התפקידים</option>
              {(["fighter", "team_commander", "officer", "shift_commander"] as UserRole[]).map(
                (role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ),
              )}
            </select>
          </div>

          {filteredUsers.map((user) => (
            <UserEditorCard
              key={user.id}
              user={user}
              isBusy={busyId === user.id}
              onChange={(next) =>
                setUsers((current) =>
                  current.map((row) => (row.id === user.id ? next : row)),
                )
              }
              onSave={() => saveUser(user)}
            />
          ))}
        </section>
      ) : null}

      {tab === "admins" ? (
        <section className="flex flex-col gap-3">
          {admins.map((admin) => (
            <div
              key={admin.user_id}
              className="flex items-center justify-between rounded-xl border border-zinc-300 bg-zinc-50 p-3"
            >
              <p className="text-sm font-semibold text-zinc-900">
                {admin.profiles?.full_name ?? admin.user_id}
                {admin.user_id === currentUserId ? " (אתה)" : ""}
              </p>
              <button
                type="button"
                disabled={busyId === admin.user_id}
                onClick={() => removeAdmin(admin.user_id)}
                className="text-xs font-semibold text-red-700 disabled:opacity-60"
              >
                הסר
              </button>
            </div>
          ))}

          <div className="rounded-xl border border-zinc-300 bg-zinc-50 p-3">
            <p className="text-sm font-semibold text-zinc-900">הוסף מנהל</p>
            <select
              value={addAdminUserId}
              onChange={(event) => setAddAdminUserId(event.target.value)}
              className="mt-2 h-10 w-full rounded-lg border border-zinc-300 bg-white px-2 text-sm"
            >
              <option value="">בחר משתמש</option>
              {nonAdminUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!addAdminUserId || busyId === addAdminUserId}
              onClick={addAdmin}
              className="mt-2 h-9 w-full rounded-lg bg-zinc-900 text-xs font-semibold text-white disabled:opacity-60"
            >
              הוסף מנהל
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

type UserEditorCardProps = {
  user: AdminUserRow;
  isBusy: boolean;
  onChange: (user: AdminUserRow) => void;
  onSave: () => void;
};

function UserEditorCard({ user, isBusy, onChange, onSave }: UserEditorCardProps) {
  return (
    <article className="rounded-xl border border-zinc-300 bg-zinc-50 p-3 shadow-sm">
      <p className="text-sm font-bold text-zinc-900">{user.full_name}</p>
      <p className="text-xs text-zinc-600">{user.phone}</p>

      <label className="mt-3 block text-xs font-semibold text-zinc-700">
        תפקיד
        <select
          value={user.role}
          onChange={(event) =>
            onChange({ ...user, role: event.target.value as UserRole })
          }
          className="mt-1 h-9 w-full rounded-lg border border-zinc-300 bg-white px-2 text-sm"
        >
          {SELF_ASSIGNABLE_ROLES.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
          <option value="shift_commander">{ROLE_LABELS.shift_commander}</option>
        </select>
      </label>

      <label className="mt-2 block text-xs font-semibold text-zinc-700">
        משמרת
        <select
          value={user.shift ?? ""}
          onChange={(event) =>
            onChange({ ...user, shift: (event.target.value as Shift) || null })
          }
          className="mt-1 h-9 w-full rounded-lg border border-zinc-300 bg-white px-2 text-sm"
        >
          <option value="a">{SHIFT_LABELS.a}</option>
          <option value="b">{SHIFT_LABELS.b}</option>
          <option value="c">{SHIFT_LABELS.c}</option>
        </select>
      </label>

      <button
        type="button"
        disabled={isBusy || !user.shift}
        onClick={onSave}
        className="mt-3 h-9 w-full rounded-lg bg-zinc-900 text-xs font-semibold text-white disabled:opacity-60"
      >
        {isBusy ? "שומר..." : "שמור"}
      </button>
    </article>
  );
}
