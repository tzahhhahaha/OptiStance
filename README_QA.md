**iOS / Android QA Checklist**

Preconditions
- Ensure Node.js and npm are installed.
- Run `npm install` and set up `.env` (or use `.env.example`).

Web QA
- `npm run dev` and open app in browser.
- Verify camera permission prompt appears and `Start Practice` opens camera view.
- Test `Upload Image` from `HomePage` and from `CameraView` (upload a small image).
- Confirm uploaded URL logs in console or configure Firebase Storage to verify.
- Toggle `VITE_USE_POSE_WORKER=true` to enable worker and ensure pose results show.

Android (Capacitor)
- Run `npm run build:mobile` then `npx cap add android`.
- Open Android Studio: `npx cap open android` and build on emulator/device.
- Verify camera permission in native app and test live pose detection.

iOS (Capacitor)
- On macOS run `npx cap add ios` then `npx cap open ios`.
- Open Xcode, set signing, and run on simulator/device.
- Verify camera permissions and pose detection.

Security QA
- Ensure `.env` not committed.
- Verify tokens stored in secure storage for mobile (install recommended native plugin).

Notes
- Some features require Firebase keys in `.env` to operate (auth/storage). Without keys the app falls back to mock behavior.
- If MediaPipe worker isn't supported by bundler, set `VITE_USE_POSE_WORKER=false`.
