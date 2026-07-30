# Deadlock France

Patch notes de [Deadlock](https://store.steampowered.com/app/1422450/Deadlock/) en français, pour la communauté francophone.

Valve ne traduit pas systématiquement ses notes de mise à jour. Ce site récupère les patch notes publiés sur Steam, utilise la version française officielle quand elle existe, et retombe sur une traduction automatique le reste du temps.

> [!NOTE]
> Projet communautaire non officiel, sans aucun lien avec Valve Corporation.
> Deadlock, Steam et les visuels du jeu appartiennent à Valve.

## Démarrage

Aucune clé d'API n'est nécessaire pour lancer le projet.

```bash
npm install
npm run dev
```

Le site est disponible sur http://localhost:3000.

Node.js 20.9 ou plus récent est requis (contrainte de Next.js 16).

### Traduction automatique (optionnel)

Sans configuration, les articles que Valve n'a pas traduits restent en anglais. Pour activer le repli sur DeepL, créez un fichier `.env.local` :

```bash
DEEPL_API_KEY=votre-clé
```

Une clé [DeepL Free](https://www.deepl.com/pro-api) suffit et couvre largement l'usage du site. Ce fichier est ignoré par Git, ne le commitez jamais.

## Comment la traduction fonctionne

C'est la partie non évidente du projet. Steam expose les patch notes par deux chemins qui ne partagent pas les mêmes identifiants, et il faut les deux :

1. **`ISteamNews`** (`lib/steam/client.ts`) fournit la liste des articles filtrés sur le tag `patchnotes`, mais uniquement en anglais.
2. **Les événements partenaires** (`lib/steam/events.ts`) contiennent les traductions officielles de Valve, indexées par un identifiant d'annonce différent. Le pont entre les deux se fait sur la date de publication (`posttime`), faute de correspondance officielle entre les deux espaces d'identifiants.
3. **DeepL** (`lib/deepl/client.ts`) prend le relais quand Valve n'a pas publié de version française. Les balises BBCode sont remplacées par des marqueurs XML avant l'envoi pour que la traduction ne casse pas la mise en forme.

Chaque article porte un champ `translation_source` qui vaut `steam`, `deepl` ou `en` selon le chemin emprunté. Le tout est mis en cache pour quelques heures via les Cache Components de Next.js.

Le contenu arrive en BBCode Steam, converti en HTML par `hooks/news/bbcode-to-html.ts`.

> [!WARNING]
> Les endpoints d'événements partenaires ne font pas partie de l'API publique de Steam. Ils peuvent changer ou disparaître sans préavis ; le site retombe alors automatiquement sur DeepL.

## Scripts

| Commande | Effet |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production (appelle l'API Steam pour prégénérer les articles) |
| `npm start` | Sert le build de production |
| `npm test` | Tests unitaires en mode watch |
| `npm run test:run` | Tests unitaires en une passe |
| `npm run typecheck` | Vérification TypeScript |
| `npm run lint` | ESLint |

## Structure

```
app/            Routes App Router (accueil, /news, /news/[gid])
components/     Composants React (shadcn/ui dans components/shadcn)
hooks/          Formatage et conversion BBCode
lib/steam/      Récupération des patch notes et des traductions Valve
lib/deepl/      Traduction de repli
lib/layout/     État et dimensions du châssis de navigation
```

## Stack

Next.js 16 (App Router, Cache Components, Turbopack), React 19, TypeScript, Tailwind CSS 4, shadcn/ui sur Base UI, Motion pour les animations, Vitest pour les tests.

## Contribuer

Les contributions sont bienvenues, voir [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

Le **code** est publié sous licence [MIT](LICENSE).

Cela ne couvre pas :

- les patch notes, textes et images affichés par le site, qui appartiennent à Valve Corporation et restent soumis à ses conditions d'utilisation ;
- les visuels du dossier `public/assets`, dont une partie est de l'artwork officiel Steam, fournis uniquement pour faire tourner le projet localement.

Si vous réutilisez ce code, remplacez ces assets par les vôtres.
