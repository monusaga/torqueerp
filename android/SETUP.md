# Android App — Local Setup

The Android app builds without any secrets, but two local files are required
for full functionality and release signing. **Neither file is committed to git.**

## 1. `android/app/google-services.json` (Google Sign-In)

Google Sign-In uses Firebase-managed OAuth. To enable it:

1. Create (or open) a Firebase project at <https://console.firebase.google.com>.
2. Add an **Android app** with package name `com.torqueerp.app`.
3. Register your signing certificate's **SHA-1** fingerprint
   (get it with `apksigner verify --print-certs your.apk` or
   `keytool -list -v -keystore your.jks`).
4. Download the generated `google-services.json`.
5. Place it at: `android/app/google-services.json`.

The Google Services Gradle plugin reads this file at build time and generates
the `default_web_client_id` resource the login screen uses. Without the file
the build fails at `:app:processReleaseGoogleServices` — that is intentional,
so a misconfigured build cannot ship.

> The backend must be configured with the matching values in `backend/.env`:
> `GOOGLE_CLIENT_ID` (the **Web client** ID from the same Firebase project)
> and/or `FIREBASE_PROJECT_ID`.

## 2. Release signing keystore

Debug builds sign automatically with the Android debug key. Release builds
(`gradlew assembleRelease`) look for `android/keystore.properties`:

1. Copy `android/keystore.properties.example` → `android/keystore.properties`.
2. Create or copy your keystore (e.g. `android/keystore/release.jks`).
3. Fill in `storeFile`, `storePassword`, `keyAlias`, `keyPassword`.

If `keystore.properties` is absent, release builds fall back to the debug
key so local builds still work — but Google Sign-In will reject such builds
unless that debug SHA-1 is also registered in Firebase.

**Keep the keystore backed up privately. Losing it permanently breaks app
updates and the Firebase SHA-1 registration.**

## 3. Backend endpoint

The app's default API base URL is `http://10.0.2.2:4000/api/v1/` (Android
emulator loopback). On a physical device, set your machine's LAN IP or a
public URL from the login screen → “Configure API Server Host”, or use
`adb reverse tcp:4000 tcp:4000` with `http://127.0.0.1:4000/api/v1/`.

## Build

```bash
cd android
./gradlew assembleDebug     # debug build
./gradlew assembleRelease   # production build (needs keystore.properties)
```

The release APK is written to `android/app/build/outputs/apk/release/app-release.apk`.
