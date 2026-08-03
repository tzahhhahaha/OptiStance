**Security & Auth Notes**

- This project ships with optional Firebase integration (auth + storage). Provide real keys in `.env` to enable cloud features.
- For web deployments we use `localStorage` for token convenience. For mobile (Capacitor) replace the storage with a secure native plugin (e.g., `@capacitor-community/secure-storage`).
- The `src/services/tokenService.ts` file abstracts token storage and tries to use Capacitor Storage when available.
- Never commit real `.env` values. Use environment variables in CI and native build configs.

Recommended hardening steps:

1. Enforce HTTPS and HSTS on your hosting.
2. Use Firebase Authentication with email/password or OAuth providers.
3. Protect Cloud Storage with security rules scoped to `uid` paths.
4. For mobile, store refresh tokens only in secure native storage and use short-lived access tokens if possible.
5. Regularly audit dependencies and enable Dependabot or similar.
