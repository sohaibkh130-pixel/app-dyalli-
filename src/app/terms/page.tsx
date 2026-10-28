import Link from "next/link";

export const metadata = { title: "Conditions d'utilisation" };

export default function Terms() {
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-12">
      <h1 className="text-3xl font-bold">Conditions d'utilisation</h1>
      <p className="muted text-sm">Modèle à faire valider par un juriste avant la mise en production.</p>
      <p>LifeOS AI est un outil d'organisation personnelle. Il ne fournit pas de conseil médical, financier ou psychologique.</p>
      <p>Vous êtes responsable de l'exactitude des données que vous saisissez ; les statistiques et rapports reflètent uniquement ces données.</p>
      <p>Les analyses de l'IA sont des suggestions et peuvent contenir des erreurs.</p>
      <Link href="/" className="text-accent underline">Retour à l'accueil</Link>
    </main>
  );
}
