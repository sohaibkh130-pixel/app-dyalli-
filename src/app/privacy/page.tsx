import Link from "next/link";

export const metadata = { title: "Politique de confidentialité" };

export default function Privacy() {
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-12">
      <h1 className="text-3xl font-bold">Politique de confidentialité</h1>
      <p className="muted text-sm">Modèle à faire valider par un juriste avant la mise en production.</p>
      <h2 className="text-xl font-semibold">Données collectées</h2>
      <p>Informations de compte (nom, e-mail), ainsi que les données que vous saisissez : tâches, transactions, objectifs, habitudes, compétences.</p>
      <h2 className="text-xl font-semibold">Utilisation</h2>
      <p>Vos données servent uniquement à faire fonctionner l'application et à produire vos rapports. Si vous utilisez le Coach IA, un résumé de vos données de la période est envoyé au fournisseur d'IA configuré pour générer l'analyse.</p>
      <h2 className="text-xl font-semibold">Vos droits</h2>
      <p>Vous pouvez exporter vos données et supprimer votre compte depuis les paramètres.</p>
      <Link href="/" className="text-accent underline">Retour à l'accueil</Link>
    </main>
  );
}
