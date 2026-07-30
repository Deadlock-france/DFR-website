# Contribuer à Deadlock France

Merci de vouloir donner un coup de main. Ce document tient en trois minutes de lecture.

## Mise en route

```bash
npm install
npm run dev
```

Pas besoin de clé d'API : sans `DEEPL_API_KEY`, les articles non traduits par Valve s'affichent en anglais et tout le reste du site fonctionne normalement.

## À lire avant d'ouvrir une pull request

**Les traductions ne se corrigent pas dans le code.** C'est la demande la plus fréquente, et la réponse est contre-intuitive : les textes français viennent soit de Valve, soit de DeepL, et sont générés à la construction du site. Aucun fichier de traduction n'existe dans le dépôt. Si une tournure est mauvaise, ouvrez une issue avec le lien de l'article plutôt qu'une pull request — il faudra d'abord ajouter un mécanisme de correction manuelle, ce qui reste à concevoir.

**Un patch note mal affiché est un bug intéressant.** La conversion BBCode → HTML (`hooks/news/bbcode-to-html.ts`) couvre ce que Valve publie habituellement, pas l'exhaustivité du BBCode Steam. Si un article s'affiche de travers, signalez-le avec son URL : c'est typiquement une balise non gérée, et le correctif tient en quelques lignes plus un test.

## Tests

Toute modification de la logique doit être couverte. La suite tourne en moins d'une seconde :

```bash
npm run test:run
```

Les tests sont placés à côté du fichier qu'ils couvrent (`lib/steam/events.ts` → `lib/steam/events.test.ts`). Les appels réseau ne sont jamais réels : `fetch` est remplacé par un double qui répond selon l'endpoint appelé, voir `lib/steam/client.test.ts` pour le motif utilisé.

## Vérification automatique

Un hook Git installé par `npm install` lance les tests puis le build avant chaque commit. Si l'un des deux échoue, le commit est refusé.

En cas d'urgence, `git commit --no-verify` le contourne — mais la même vérification tourne sur la pull request, donc autant régler le problème tout de suite.

ESLint n'est pas bloquant, ni en local ni en intégration continue. Gardez tout de même `npm run lint` sans erreur.

## Style

Rien d'exotique : suivez ce que fait le code autour de vous. Deux conventions valent la peine d'être mentionnées explicitement :

- **Les commentaires expliquent le pourquoi, pas le quoi.** Un commentaire utile documente une contrainte non devinable — pourquoi le pont entre les deux APIs Steam passe par `posttime`, par exemple. Un commentaire qui paraphrase la ligne suivante sera retiré à la relecture.
- **Interface en français**, y compris les libellés d'accessibilité (`aria-label`). Le code, lui, reste en anglais.

## Portée du projet

Le site couvre les patch notes. Des outils communautaires plus larges sont envisagés à terme, mais une pull request qui ajoute une fonctionnalité majeure sans discussion préalable a peu de chances d'être fusionnée. Ouvrez une issue d'abord, ça évite d'écrire du code pour rien.
