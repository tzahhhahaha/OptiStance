This project can be packaged for iOS and Android using Capacitor. Follow these steps locally (requires Node.js/npm and Android Studio/Xcode for device builds).

1) Install deps

```bash
npm install
```

2) Add Capacitor

```bash
npx cap init CheerPose com.example.cheerpose --web-dir=dist
# or use the included capacitor.config.json
```

3) Build web assets and sync to native projects

```bash
npm run build:mobile
# then to add platforms:
npx cap add android
# (on macOS) npx cap add ios

# Open native IDEs:
npx cap open android
npx cap open ios
```

4) Notes
- Add actual app icons under `public/icons/` matching the manifest filenames.
- Provide Firebase env vars in `.env` for auth/storage if you want cloud features.
- For iOS builds you'll need a Mac with Xcode.
