# Install DFNS Keysigner Package

The project is missing the `@dfns/sdk-keysigner` package which contains `AsymmetricKeySigner`.

Run this command in the frontend directory:

```bash
pnpm add @dfns/sdk-keysigner@^0.7.2
```

This package is required for:
- AsymmetricKeySigner (server-side/service account signing)
- Key-based authentication
- Private key operations
