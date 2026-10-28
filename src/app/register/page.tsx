"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { registerSchema } from "@/lib/validation";

export default function RegisterPage() {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setInfo(null);
    const parsed = registerSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) {
      const map: Record<string, string> = {};
      parsed.error.issues.forEach((i) => (map[String(i.path[0])] ??= i.message));
      return setErrors(map);
    }
    setErrors({});
    setLoading(true);
    const v = parsed.data;
    const { data, error } = await createClient().auth.signUp({
      email: v.email,
      password: v.password,
      options: {
        data: { first_name: v.firstName, last_name: v.lastName },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    });
    setLoading(false);
    if (error) return setErrors({ form: "Inscription impossible. Cette adresse est peut-être déjà utilisée." });
    if (data.session) router.replace("/onboarding");
    else setInfo("Un e-mail de confirmation vous a été envoyé. Cliquez sur le lien pour continuer.");
  }

  async function google() {
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
    });
    if (error) setErrors({ form: "Google n'est pas disponible. Vérifiez la configuration OAuth." });
  }

  const field = (name: string, label: string, type = "text", auto?: string) => (
    <label className="block text-sm">{label}
      <input name={name} type={type} autoComplete={auto} className="input mt-1" aria-invalid={!!errors[name]} />
      {errors[name] && <span role="alert" className="text-xs text-late">{errors[name]}</span>}
    </label>
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-8">
      <div className="card space-y-4">
        <h1 className="text-2xl font-bold">Créer un compte</h1>
        <button type="button" onClick={google} className="btn btn-ghost w-full">Continuer avec Google</button>
        <form onSubmit={onSubmit} className="space-y-3" noValidate>
          <div className="grid grid-cols-2 gap-3">{field("firstName", "Prénom", "text", "given-name")}{field("lastName", "Nom", "text", "family-name")}</div>
          {field("email", "Adresse e-mail", "email", "email")}
          {field("password", "Mot de passe", "password", "new-password")}
          {field("confirm", "Confirmation du mot de passe", "password", "new-password")}
          {errors.form && <p role="alert" className="text-sm text-late">{errors.form}</p>}
          {info && <p role="status" className="text-sm text-ok">{info}</p>}
          <button className="btn w-full" disabled={loading}>{loading ? "Création…" : "Créer mon compte"}</button>
        </form>
        <p className="text-sm">Déjà inscrit ? <Link href="/login" className="text-accent underline">Se connecter</Link></p>
      </div>
    </main>
  );
}
