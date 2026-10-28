"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";

export default function ForgotPasswordPage() {
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Adresse e-mail invalide.");
    setError(null);
    await createClient().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password` });
    // Message identique que le compte existe ou non (pas de fuite d'information).
    setMsg("Si un compte existe pour cette adresse, un lien de réinitialisation vient d'être envoyé.");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <form onSubmit={onSubmit} className="card space-y-3" noValidate>
        <h1 className="text-2xl font-bold">Mot de passe oublié</h1>
        <label className="block text-sm">Adresse e-mail<input name="email" type="email" className="input mt-1" /></label>
        {error && <p role="alert" className="text-sm text-late">{error}</p>}
        {msg && <p role="status" className="text-sm text-ok">{msg}</p>}
        <button className="btn w-full">Envoyer le lien</button>
        <Link href="/login" className="text-sm text-accent underline">Retour à la connexion</Link>
      </form>
    </main>
  );
}
