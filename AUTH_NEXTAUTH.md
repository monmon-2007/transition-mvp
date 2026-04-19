NextAuth Integration Notes

Required package:

- Install in your project:

```
npm install next-auth
# or
yarn add next-auth
```

Env vars:

- `NEXTAUTH_SECRET` — required for production (use a strong random value).
- Optionally set `BACKEND_LOGIN_URL` (or change the authorize function in the credentials provider) to point to your real auth API.

Files added:

- `src/app/api/auth/[...nextauth]/route.ts` — NextAuth route using a Credentials provider (placeholder). Replace `authorize()` with a call to your backend to validate credentials.
- `src/components/auth/AuthProvider.tsx` — now wraps the app with NextAuth's `SessionProvider` and exposes helpers via `useAuth()`.
- `src/app/login/page.tsx` — updated to call `signIn('credentials', ...)` and redirect on success.

Next steps:

1. Replace the placeholder `authorize()` logic with a POST to your backend login endpoint that returns user info and a token.
2. Add `NEXTAUTH_URL` and `NEXTAUTH_SECRET` to your environment for production.
3. Optionally configure other providers (OAuth, etc.) in `route.ts`.
