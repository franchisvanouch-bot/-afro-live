# AFRO LIVE — prototype natif

Ce projet est volontairement isolé dans `native/afro-live-app`.
La PWA actuelle à la racine du dépôt n'est pas modifiée par ce prototype.

## Socle technique

- Expo SDK 58 / React Native 0.88 / TypeScript
- IMG.LY `@imgly/editor-react-native` 1.85.2
- Expo Image Picker pour sélectionner une vidéo locale
- Mode d'évaluation IMG.LY sans clé commerciale : le filigrane est attendu sur l'export

## Prérequis

- Node.js 22.13 ou supérieur
- Un compte Expo pour les builds cloud EAS
- iOS 16+ et Android 7+ pour IMG.LY

## Installation locale

Depuis ce dossier :

```bash
npm install
npx expo-doctor
npx expo prebuild
npx expo run:android
# ou
npx expo run:ios
```

Pour un build de développement cloud :

```bash
npx expo install --fix
npx eas-cli build --profile development --platform all
```

Un build natif de développement est nécessaire : Expo Go ne contient pas le module natif IMG.LY.

## Test actuel

1. Lancer AFRO LIVE Prototype.
2. Appuyer sur « Choisir une vidéo ».
3. Sélectionner un fichier vidéo local.
4. L'éditeur IMG.LY s'ouvre avec le preset vidéo.
5. Exporter pour vérifier le résultat et le filigrane d'évaluation.

Le résultat est actuellement exporté localement. L'envoi vers Supabase, la publication dans le fil, la reprise des brouillons et le raccordement des comptes seront développés après validation de ce premier test. Aucune clé Supabase ou clé secrète n'est stockée dans ce dépôt.

## Configuration native IMG.LY

Le projet définit Android minSdk 24 et iOS deployment target 16.0 via `expo-build-properties`, et active le New Architecture. Les identifiants d'application `com.afrolive.prototype` sont provisoires et devront être confirmés avant toute distribution.

## Limites connues du prototype

- Ce n'est pas encore la migration complète d'AFRO LIVE.
- Aucun écran PWA, compte ou direct n'est remplacé.
- Aucun upload Supabase n'est effectué.
- Le filigrane est normal en mode d'évaluation IMG.LY.
