# Dusk v2.1

Dashboard immersif nocturne — Vanilla JS + Vite + Supabase.

## Démarrage rapide

```bash
npm install
npm run dev
```

## Configuration Supabase

1. Crée un projet sur [supabase.com](https://supabase.com)
2. Copie `.env.example` → `.env` et remplis tes clés :

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

3. Va dans **SQL Editor** sur Supabase, colle le contenu de `supabase/schema.sql` et exécute.

4. Crée ton compte depuis l'app (inscription normale).

5. Promeus-toi admin : dans le SQL Editor, exécute :
```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'ton@email.com');
```

## Sans Supabase

Le projet fonctionne aussi en local sans `.env` — toutes les données sont stockées en localStorage avec le préfixe `dusk-v2`.

## Fonctionnalités

| Feature | Status |
|---|---|
| Auth email/password | ✅ |
| Inscription libre | ✅ |
| Compte admin (géré manuellement) | ✅ |
| Panneau admin (liste users, toggle rôle) | ✅ |
| Widgets visibles/masquables par user | ✅ |
| Profil personnalisable | ✅ |
| Liens favoris par user | ✅ |
| Projets par user | ✅ |
| To-Do par user | ✅ |
| Journal d'humeur par user | ✅ |
| Fallback localStorage si hors-ligne | ✅ |

## Déploiement sur Render

- **Build command** : `npm run build`
- **Publish directory** : `dist`
- Ajouter les variables d'env `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans Render
- Dans Supabase → Authentication → URL Configuration : ajouter `https://dusk-8abz.onrender.com` comme Site URL
