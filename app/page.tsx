import { AuthButtons } from "@/components/auth-buttons";

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-100 p-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-4xl font-extrabold text-zinc-900">חילופי</h1>
        <p className="text-sm text-zinc-600">אפליקציית חילופי משמרות</p>
      </div>
      <AuthButtons />
      <p className="text-xs text-zinc-500">
        משתמשים חדשים יועברו אוטומטית להגדרת פרופיל
      </p>
    </main>
  );
}
