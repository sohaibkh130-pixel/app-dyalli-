import Link from "next/link";

const FEATURES = [
  { id: "planning", title: "Planning sur 24 heures", text: "Une chronologie de 00:00 à 23:59. Les tâches non confirmées passent automatiquement « en retard » côté serveur, et vous pouvez les corriger après coup." },
  { id: "finances", title: "Suivi financier réel", text: "Revenus, dépenses, budgets et objectifs d'épargne, calculés à partir de vos propres transactions, en MAD ou dans la devise de votre choix." },
  { id: "coach", title: "Analyse personnalisée par IA", text: "Des bilans quotidiens, hebdomadaires et mensuels fondés uniquement sur vos données enregistrées. Les chiffres sont calculés par l'application, l'IA les explique." },
  { id: "skills", title: "Compétences et habitudes", text: "Suivez vos pratiques, vos séances d'étude et vos habitudes, sans culpabilisation : vous ajustez vos plans à votre rythme." },
];

const FAQ = [
  ["LifeOS AI est-il gratuit ?", "Vous pouvez créer un compte et commencer sans carte bancaire."],
  ["Mes données sont-elles privées ?", "Chaque compte est isolé : la sécurité au niveau des lignes (RLS) de la base de données garantit que vous n'accédez qu'à vos propres enregistrements."],
  ["L'IA invente-t-elle des résultats ?", "Non. Elle ne s'appuie que sur vos données enregistrées et indique quand les données sont insuffisantes."],
  ["Puis-je utiliser une autre devise que le dirham ?", "Oui : MAD, EUR, USD et d'autres devises sont prises en charge."],
];

export default function Landing() {
  return (
    <>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <span className="text-lg font-bold">LifeOS AI</span>
        <nav className="flex items-center gap-3 text-sm" aria-label="Navigation principale">
          <a href="#fonctionnalites" className="hidden sm:inline">Fonctionnalités</a>
          <a href="#faq" className="hidden sm:inline">FAQ</a>
          <Link href="/login" className="btn btn-ghost">Se connecter</Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-4xl px-4 py-20 text-center">
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
            Prenez le contrôle de votre temps. Mesurez vos progrès. Atteignez vos objectifs.
          </h1>
          <p className="muted mx-auto mt-6 max-w-2xl text-lg">
            LifeOS AI vous aide à organiser vos journées, suivre vos finances, développer vos compétences et transformer vos ambitions en résultats mesurables.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/register" className="btn">Commencer gratuitement</Link>
            <a href="#fonctionnalites" className="btn btn-ghost">Découvrir les fonctionnalités</a>
          </div>
        </section>

        <section id="fonctionnalites" className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="mb-8 text-center text-2xl font-bold">Votre journée, vos priorités, votre évolution.</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <article key={f.id} className="card">
                <h3 className="font-semibold">{f.title}</h3>
                <p className="muted mt-2 text-sm">{f.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-12">
          <h2 className="mb-4 text-2xl font-bold">Sécurité et confidentialité</h2>
          <p className="muted">
            Authentification gérée par Supabase Auth, isolation des données par RLS, clés d'API jamais exposées au navigateur. Consultez notre{" "}
            <Link href="/privacy" className="text-accent underline">politique de confidentialité</Link>.
          </p>
        </section>

        <section id="faq" className="mx-auto max-w-3xl px-4 py-12">
          <h2 className="mb-4 text-2xl font-bold">Questions fréquentes</h2>
          <div className="space-y-2">
            {FAQ.map(([q, a]) => (
              <details key={q} className="card">
                <summary className="cursor-pointer font-medium">{q}</summary>
                <p className="muted mt-2 text-sm">{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h2 className="text-2xl font-bold">Transformez vos objectifs en résultats.</h2>
          <Link href="/register" className="btn mt-6">Créer mon compte</Link>
        </section>
      </main>

      <footer className="border-t py-6 text-center text-sm muted" style={{ borderColor: "var(--border)" }}>
        <Link href="/privacy" className="mx-2 underline">Confidentialité</Link>
        <Link href="/terms" className="mx-2 underline">Conditions d'utilisation</Link>
      </footer>
    </>
  );
}
