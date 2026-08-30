# Lewad

**Lewad** est une application web de recherche de services en Mauritanie. Elle aide les utilisateurs à trouver un établissement, un service public, une administration ou un lieu utile, à consulter ses informations, puis à ouvrir une carte ou un itinéraire.

La recherche consulte d'abord la base de données Lewad. Lorsqu'aucun résultat interne n'est trouvé, une recherche cartographique gratuite peut proposer un lieu externe. Ce lieu reste une découverte à vérifier : il n'est jamais créé automatiquement comme établissement officiel.

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Rôles et parcours](#rôles-et-parcours)
- [Recherche cartographique](#recherche-cartographique)
- [Points et ajout d'établissement](#points-et-ajout-détablissement)
- [Installation de l'application](#installation-de-lapplication)
- [Technologies](#technologies)
- [Installation locale](#installation-locale)
- [Configuration](#configuration)
- [Scripts et qualité](#scripts-et-qualité)
- [Déploiement](#déploiement)
- [Supabase et sécurité](#supabase-et-sécurité)
- [Internationalisation et PWA](#internationalisation-et-pwa)
- [Structure du projet](#structure-du-projet)

## Fonctionnalités

### Public

- Landing page responsive et mobile-first.
- Interfaces française, arabe et anglaise.
- Modes clair et sombre.
- Guide d'installation Android et iPhone.
- PWA installable.

### Client

- Connexion, inscription et réinitialisation de mot de passe.
- Recherche de services en français ou en arabe, avec contexte de wilaya.
- Résultats internes, carte et itinéraire.
- Recherche cartographique de secours via fournisseurs OpenStreetMap gratuits.
- Compte à points, recharges, historique et profil.
- Établissements liés au compte.
- Demande d'ajout d'établissement avec parcours de paiement via WhatsApp.

### Administration

- Espaces distincts pour les administrateurs et les super-administrateurs.
- Gestion des demandes d'ajout d'établissement.
- Création administrative d'établissements privés, publics ou administratifs.
- Sélection de l'emplacement sur une carte et nom arabe facultatif.
- Revue des découvertes cartographiques et import après validation.
- Sélection d'un ou plusieurs types lors de l'import : établissement, société, région, moughataa, wilaya, salle de sport, restaurant, salle, administration, privé ou public.

## Rôles et parcours

| Rôle | Capacités principales |
|---|---|
| Client | Rechercher, utiliser des points, demander une recharge, proposer un établissement et consulter son historique. |
| Admin | Traiter les demandes, gérer les découvertes externes et créer ou importer des établissements. |
| Super-admin | Gérer les administrateurs et accéder aux fonctions de supervision. |

### Recherche client

1. Le client arrive sur `/app` et saisit une recherche.
2. Lewad interroge d'abord sa base interne.
3. Si un résultat est trouvé, le client obtient les informations, la carte et l'itinéraire.
4. Si aucun résultat n'est trouvé, Lewad utilise la recherche cartographique externe dans le contexte choisi.
5. Un résultat externe valide est visible pour le client et enregistré en interne pour une revue administrative.

Le client ne voit pas les statuts techniques internes, comme `pending_review`.

### Revue d'une découverte externe

1. Une découverte externe est sauvegardée pour vérification.
2. L'administrateur la consulte dans les demandes de vérification.
3. Il la rejette, ou choisit un ou plusieurs types et confirme l'import.
4. L'import approuvé crée l'établissement officiel et sa branche principale avec les coordonnées disponibles.

Une découverte n'est jamais approuvée automatiquement par une recherche client.

## Recherche cartographique

Lewad privilégie des fournisseurs gratuits fondés sur OpenStreetMap :

1. Base de données Lewad.
2. [Photon / Komoot](https://photon.komoot.io/).
3. [Nominatim / OpenStreetMap](https://www.openstreetmap.org/), en repli.

La fonction Edge `geocode-place` conserve l'appel externe côté serveur. Elle applique la réservation et la limitation existantes avant la recherche, normalise le résultat, et ne sauvegarde qu'une découverte à revoir.

Cette version n'utilise ni Google Maps API ni API cartographique facturée.

## Points et ajout d'établissement

### Offres de recharge

| Points | Prix |
|---:|---:|
| 10 | 50 MRO |
| 30 | 100 MRO |
| 100 | 500 MRO |

Les demandes de recharge sont vérifiées par l'équipe Lewad : les points ne sont pas crédités automatiquement.

- Téléphone / WhatsApp : `42015464`
- WhatsApp : <https://wa.me/22242015464>
- E-mail : `lewad.help@gmail.com`
- Applications acceptées : Bankily, Sedad, Masrivi, Bimbank, Gazapay, Bamis Digital, Barid Cash et Click.

### Demande d'ajout d'établissement

Le tarif actuel est de **200 MRO pour 3 mois**. Le client fournit les informations de l'établissement, choisit son emplacement et transmet les éléments de paiement. La demande reste en attente d'une vérification administrative.

## Installation de l'application

### Android

1. Ouvrir Lewad dans Chrome.
2. Ouvrir le menu du navigateur.
3. Choisir **Installer** ou **Installer et créer un raccourci**.

### iPhone

1. Ouvrir Lewad dans Safari.
2. Appuyer sur le bouton Partager.
3. Choisir **Ajouter à l'écran d'accueil**.
4. Confirmer avec **Ajouter**.

Les captures fournies par le propriétaire se trouvent dans :

```text
public/assets/install_app_image/android/
public/assets/install_app_image/iphone/
```

Seules les captures sûres pour le lancement public sont référencées dans l'interface.

## Technologies

### Frontend

- React et TypeScript
- Vite et Tailwind CSS
- Leaflet et React Leaflet
- PWA avec manifest et service worker

### Backend

- Supabase Auth
- Supabase PostgreSQL, RPC et RLS
- Supabase Storage
- Supabase Edge Functions

### Déploiement

- Vercel pour l'hébergement principal.
- Docker et Nginx pour une alternative autonome.

## Installation locale

### Prérequis

- Node.js compatible avec les dépendances du projet.
- Un projet Supabase configuré pour le développement.

### Démarrer l'application

```bash
npm ci
```

Copier le fichier d'exemple puis renseigner les valeurs publiques :

```powershell
Copy-Item .env.example .env.local
```

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
```

Puis lancer Vite :

```bash
npm run dev
```

Vite écoute normalement sur <http://localhost:5173/> sauf si un port est déjà utilisé ou configuré autrement.

## Configuration

Les seules valeurs Supabase autorisées dans le bundle navigateur sont :

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Une tuile cartographique facultative peut être définie côté frontend :

```env
VITE_MAP_TILE_URL=https://tile.openstreetmap.org/{z}/{x}/{y}.png
```

Ne jamais ajouter au frontend, dans un fichier `VITE_*`, dans la documentation publiée ou dans les tests :

```text
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
POSTGRES_PASSWORD
JWT_SECRET
PRIVATE_KEY
```

## Scripts et qualité

| Commande | Usage |
|---|---|
| `npm run dev` | Lance le serveur de développement. |
| `npm test` | Exécute les tests Vitest. |
| `npm run build` | Vérifie TypeScript et produit le build Vite. |
| `npx tsc --noEmit -p tsconfig.app.json` | Vérifie l'application TypeScript sans émettre de fichiers. |
| `git diff --check` | Vérifie les erreurs d'espaces dans le diff. |

Avant une proposition de changement ou un déploiement, exécuter :

```bash
npm test
npx tsc --noEmit -p tsconfig.app.json
npm run build
git diff --check
```

Ne pas publier :

```text
.env
.env.local
dist/
node_modules/
supabase/.temp/
```

## Déploiement

### Vercel

Configuration recommandée :

```text
Framework Preset: Vite
Install Command: npm ci
Build Command: npm run build
Output Directory: dist
```

Configurer les mêmes variables publiques `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` dans le projet Vercel. Le fichier [`vercel.json`](vercel.json) contient le fallback SPA nécessaire aux routes de l'application.

Après déploiement, ajouter le domaine de production et ses URL de redirection autorisées dans **Supabase Authentication → URL Configuration**.

### Docker

Construire l'image :

```bash
docker build \
  --build-arg VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY \
  -t lewad-frontend:prod .
```

Lancer le conteneur :

```bash
docker run --rm -p 8080:80 lewad-frontend:prod
```

L'application est alors disponible sur <http://localhost:8080>. Docker construit Vite avec Node puis sert le résultat avec Nginx et un fallback SPA vers `index.html`.

## Supabase et sécurité

### Migrations et Edge Functions

Les migrations sont dans `supabase/migrations/`, et la fonction de recherche externe dans `supabase/functions/geocode-place/`.

Avant d'appliquer une migration, la relire, la faire approuver et l'exécuter explicitement dans le SQL Editor Supabase. Après l'application d'une modification de fonction RPC, recharger le cache de schéma PostgREST :

```sql
select pg_notify('pgrst', 'reload schema');
```

Ne pas lancer `supabase db push` ni une réparation de migration sans validation explicite du propriétaire et compréhension de l'état distant.

Les garanties des migrations locales ne prennent effet en production qu'après leur application approuvée dans Supabase.

### Principes de sécurité

- Aucune clé secrète ou `service_role` dans React.
- Les mots de passe ne sont ni journalisés ni affichés après la soumission.
- Le flux de réinitialisation donne des réponses neutres pour limiter l'énumération de comptes.
- Les rôles client, admin et super-admin sont séparés et protégés.
- Les RPC sensibles sont protégées côté base de données.
- Les imports administratifs typés utilisent `admin_import_external_place_discovery_with_types` ; les anciens overloads ne sont pas destinés aux appels navigateur.
- Les validations de coordonnées rejettent les demi-paires et les valeurs hors des plages latitude `[-90, 90]` et longitude `[-180, 180]`.
- Les résultats externes restent en revue jusqu'à une action administrative explicite.

## Internationalisation et PWA

Les langues disponibles sont le français, l'arabe et l'anglais. Le nom **Lewad** ne se traduit jamais. Les établissements conservent leur nom réel ; `name_ar` est utilisé lorsqu'il existe.

La PWA repose notamment sur :

```text
public/manifest.webmanifest
public/sw.js
public/icons/
```

Si une ancienne icône reste affichée après une mise à jour, supprimer l'ancien raccourci installé, actualiser les données du site et réinstaller l'application.

## Structure du projet

```text
Lewad/
├── public/
│   ├── assets/install_app_image/
│   │   ├── android/
│   │   └── iphone/
│   ├── icons/
│   ├── manifest.webmanifest
│   └── sw.js
├── src/
│   ├── components/
│   ├── hooks/
│   ├── i18n/
│   ├── lib/
│   └── main.tsx
├── supabase/
│   ├── functions/
│   └── migrations/
├── tests/
├── docs/
├── Dockerfile
├── nginx.conf
├── package.json
└── vercel.json
```

## Statut et licence

Lewad V1 comprend la recherche client, les points et recharges, l'historique, les profils, les demandes d'établissement, la revue administrative, l'import de découvertes cartographiques, la PWA et les interfaces multilingues.

Avant un lancement public, vérifier l'état distant Supabase, les variables de déploiement, la QA mobile réelle et les autorisations de publication du dépôt.

La licence reste à définir par le propriétaire avant toute publication publique du code.
