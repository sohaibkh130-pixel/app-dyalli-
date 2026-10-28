"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { passwordSchema } from "@/lib/validation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const p = passwordSchema.safeParse(f.get("password"));
    if (!p.success) return setError(p.error.issues[0].message);
    if (f.get("password") !== f.get("confirm")) return setError("Les mots de passe ne correspondent pas.");
    const { error } = await createClient().auth.updateUser({ password: p.data });
    if (error) return setError("Lien expiré ou invalide. Demandez un nouveau lien de réinitialisation.");
    router.replace("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <form onSubmit={onSubmit} className="card space-y-3" noValidate>
        <h1 className="text-2xl font-bold">Nouveau mot de passe</h1>
        <label className="block text-sm">Nouveau mot de passe<input name="password" type="password" autoComplete="new-password" className="input mt-1" /></label>
        <label className="block text-sm">Confirmation<input name="confirm" type="password" autoComplete="new-password" className="input mt-1" /></label>
        {error && <p role="alert" className="text-sm text-late">{error}</p>}
        <button className="btn w-full">Enregistrer</button>
      </form>
    </main>
  );
}
