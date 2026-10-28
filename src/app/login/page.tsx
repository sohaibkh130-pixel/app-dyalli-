"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { loginSchema } from "@/lib/validation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(params.get("error") ? "La connexion a échoué. Veuillez réessayer." : null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const parsed = loginSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setLoading(true);
    const { error } = await createClient().auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) return setError("E-mail ou mot de passe incorrect, ou adresse non confirmée.");
    const next = params.get("next");
    router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
    router.refresh();
  }

  async function google() {
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError("Google n'est pas disponible. Vérifiez la configuration OAuth.");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <div className="card space-y-4">
        <h1 className="text-2xl font-bold">Connexion</h1>
        <p className="muted text-sm">Votre progression, en toute clarté.</p>
        <button type="button" onClick={google} className="btn btn-ghost w-full">Continuer avec Google</button>
        <form onSubmit={onSubmit} className="space-y-3" noValidate>
          <label className="block text-sm">Adresse e-mail
            <input name="email" type="email" autoComplete="email" className="input mt-1" required />
          </label>
          <label className="block text-sm">Mot de passe
            <input name="password" type="password" autoComplete="current-password" className="input mt-1" required />
          </label>
          {error && <p role="alert" className="text-sm text-late">{error}</p>}
          <button className="btn w-full" disabled={loading}>{loading ? "Connexion…" : "Se connecter"}</button>
        </form>
        <div className="flex justify-between text-sm">
          <Link href="/forgot-password" className="text-accent underline">Mot de passe oublié ?</Link>
          <Link href="/register" className="text-accent underline">Créer un compte</Link>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
