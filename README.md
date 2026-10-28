# LifeOS AI

Application web de gestion de vie (interface en français) : planning sur 24 h, finances, objectifs, habitudes, compétences, rapports et Coach IA. Next.js (App Router) + TypeScript + Tailwind + Supabase.

## État du projet

Ce code a été écrit sans pouvoir exécuter `npm install` ni `next build` (réseau npm bloqué dans l'environnement de génération). Les formules métier (`src/lib/calc/*`) ont été vérifiées avec un script Node sans dépendances ; **le reste n'a pas été compilé ni testé**. Lancez `npm run typecheck`, `npm test` et `npm run build` et corrigez les éventuelles erreurs avant de déployer.

## Installation

```bash
npm install
cp .env.example .env.local   # puis remplir les valeurs
npm run dev
```

## Configuration Supabase

1. Créez un projet Supabase et copiez l'URL et la clé anonyme dans `.env.local`.
2. Dans l'éditeur SQL, exécutez dans l'ordre `supabase/migrations/0001_schema.sql` puis `0002_rls.sql`.
3. Auth > URL Configuration : ajoutez `http://localhost:3000/auth/callback` et l'URL de production `/auth/callback` aux redirections autorisées.
4. Auth > Providers > Google : renseignez le Client ID/Secret Google Cloud (URI de redirection Google = celle affichée par Supabase). Google n'est opérationnel qu'après cette configuration.
5. Pour la confirmation par e-mail, activez-la dans Auth > Providers > Email.

## Coach IA

Définissez `AI_API_KEY` (et `AI_MODEL`). Sans clé, l'application fonctionne et le Coach affiche un message de configuration. Les chiffres envoyés à l'IA sont calculés par l'application ; la sortie est validée par un schéma Zod ; usage limité par `AI_DAILY_LIMIT` par jour et par utilisateur.

## Tests

`npm test` (Vitest) couvre : statut des tâches, pourcentage de complétion, progression des objectifs, totaux financiers, épargne, budgets, fuseaux horaires/heure d'été, sommeil à cheval sur minuit.

## Déploiement (Vercel)

Importez le dépôt, ajoutez les variables de `.env.example` (sans `SUPABASE_SERVICE_ROLE_KEY` sauf besoin), déployez, puis mettez à jour `NEXT_PUBLIC_APP_URL` et les redirections Supabase.

## Non implémenté / limites connues

- Frise horaire 24 h : le planning affiche un agenda du jour ; pas encore de grille heure par heure ni de glisser-déposer.
- Tâches récurrentes : colonnes et index anti-doublons en base, mais pas de génération des occurrences.
- Édition/duplication de tâches, suivi du sommeil (table prête, pas d'écran), budgets (affichage seulement, pas de formulaire), notifications générées automatiquement, export CSV/PDF, export de données, suppression de compte, thème sombre (variables CSS prêtes, pas de sélecteur).
- Tests d'intégration et end-to-end (Playwright) non écrits.
- Le tableau de bord n'affiche pas encore les anneaux hebdo/mensuels dédiés au sommeil et à l'étude (valeurs brutes uniquement).
