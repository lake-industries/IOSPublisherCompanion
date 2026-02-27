# React Native Deployment Guide

This guide covers building and deploying the iOS Publisher Companion React Native app to TestFlight (iOS) and Google Play Store (Android).

## Table of Contents

- [Android - Google Play Store](#android---google-play-store)
- [iOS - TestFlight/App Store](#ios---testflightapp-store)
- [GitHub Actions CI/CD](#github-actions-cicd)
- [Local Testing](#local-testing)

---

## Android - Google Play Store

### Prerequisites

1. **Google Play Developer Account** ($25 one-time fee)
2. **Signing Key** (Android keystore file)
3. **App Bundle** (built with `bundleRelease`)

### Step 1: Create a Signing Key

Generate a keystore file (do this once, then keep it safe):

```bash
keytool -genkey -v -keystore ios-publisher-companion.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias ios-publisher-companion
```

You'll be prompted for:

- Keystore password
- Key password
- Name, organization, city, state, country

**Save the keystore file securely** — you'll need it for every release build.

### Step 2: Configure Gradle for Signing

Edit `android/app/build.gradle` and add your signing config:

```gradle
android {
  ...
  signingConfigs {
    release {
      storeFile file('ios-publisher-companion.keystore')
      storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
      keyAlias System.getenv('ANDROID_KEY_ALIAS')
      keyPassword System.getenv('ANDROID_KEY_PASSWORD')
    }
  }
  buildTypes {
    release {
      signingConfig signingConfigs.release
    }
  }
}
```

### Step 3: Build Release APK/AAB

```bash
cd android
./gradlew bundleRelease
cd ..
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

### Step 4: Upload to Google Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Create a new app
3. Fill in app details (name, description, screenshots, etc.)
4. Go to **Release** → **Production**
5. Upload the `.aab` file
6. Review and publish

### GitHub Actions Setup for Android

Store your signing credentials in GitHub Secrets:

```bash
# Get base64 of keystore
cat ios-publisher-companion.keystore | base64

# Add these secrets to your GitHub repo:
# ANDROID_KEYSTORE (base64 encoded keystore)
# ANDROID_KEYSTORE_PASSWORD
# ANDROID_KEY_ALIAS
# ANDROID_KEY_PASSWORD
```

The workflow in `.github/workflows/android-build.yml` will automatically build APK and AAB on push.

---

## iOS - TestFlight/App Store

### Prerequisites

1. **Apple Developer Account** ($99/year)
2. **Distribution Certificate** (.cer file)
3. **Provisioning Profile** (.mobileprovision file)
4. **App Store Connect API Key** (.p8 file)

### Step 1: Create Signing Assets on Mac

Since iOS signing requires interactive authentication with Apple servers, this must be done on a Mac:

```bash
# Generate CSR (Certificate Signing Request)
openssl req -new -newkey rsa:2048 -nodes -out csr.pem -keyout privatekey.pem

# Download from Apple Developer
# 1. Go to https://developer.apple.com/account/resources/certificates
# 2. Create Distribution certificate using your CSR
# 3. Download the .cer file
# 4. Create provisioning profile at https://developer.apple.com/account/resources/profiles
```

### Step 2: Convert Certificate to P12

```bash
# Convert .cer to .p12 (required for CI/CD)
openssl pkcs12 -export -in certificate.cer \
  -inkey privatekey.pem -out certificate.p12 \
  -name "iOS Publisher Companion Distribution"
```

### Step 3: Create App Store Connect API Key

1. Go to https://appstoreconnect.apple.com/access/api
2. Create new API key with Admin role
3. Download the `.p8` file

### Step 4: Build and Archive on Mac

```bash
cd ios
pod install
cd ..

xcodebuild -workspace ios/IOSPublisherCompanion.xcworkspace \
  -scheme IOSPublisherCompanion \
  -configuration Release \
  -derivedDataPath build \
  -archivePath build/IOSPublisherCompanion.xcarchive \
  archive

# Export for TestFlight
xcodebuild -exportArchive \
  -archivePath build/IOSPublisherCompanion.xcarchive \
  -exportOptionsPlist ExportOptions.plist \
  -exportPath build/ipa
```

### Step 5: Upload to TestFlight

Using Fastlane (recommended):

```bash
cd ios
fastlane build_and_upload_testflight
cd ..
```

Or manually with Transporter:

1. Download Transporter from App Store
2. Sign in with Apple ID
3. Drag and drop the `.ipa` file

### GitHub Actions Setup for iOS

Store credentials in GitHub Secrets:

```bash
# Encode certificate and profile for GitHub
cat certificate.p12 | base64 > cert_base64.txt
cat Hello_Squirreled.mobileprovision | base64 > profile_base64.txt

# Add these secrets:
# APPLE_CERTIFICATE_P12 (base64 encoded .p12)
# APPLE_CERTIFICATE_PASSWORD
# APPLE_PROVISIONING_PROFILE (base64 encoded .mobileprovision)
# APPLE_ID
# APPLE_APP_SPECIFIC_PASSWORD
# APP_STORE_CONNECT_API_KEY (base64 encoded .p8)
# APP_STORE_CONNECT_KEY_ID
# APP_STORE_CONNECT_ISSUER_ID
```

The workflow in `.github/workflows/ios-build.yml` will build and archive on every push (runs on macOS runner).

---

## GitHub Actions CI/CD

### Workflows Included

1. **android-build.yml**
   - Runs on: Ubuntu
   - Builds APK (Debug) and AAB (Release)
   - Uploads artifacts for testing
   - Runs on: `push` to main/develop, `pull_request`

2. **ios-build.yml**
   - Runs on: macOS
   - Builds and archives app
   - Uploads .xcarchive for TestFlight upload
   - Runs on: `push` to main/develop, `pull_request`

### Setting Up GitHub Actions

1. **Push code to GitHub**

   ```bash
   git init
   git add .
   git commit -m "Initial React Native project"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/IOSPublisherCompanion.git
   git push -u origin main
   ```

2. **Add Repository Secrets**
   - Go to Settings → Secrets and variables → Actions
   - Add all required secrets for your platform

3. **Workflows automatically run**
   - On push to main/develop
   - On pull requests
   - Check status in Actions tab

---

## Local Testing

### Android Emulator

```bash
# Start Metro bundler
npm start

# In another terminal, run on Android
npm run android
```

### iOS Simulator (Mac only)

```bash
# Start Metro bundler
npm start

# In another terminal, run on iOS
npm run ios
```

### Physical Devices

**Android:**

```bash
# Enable USB debugging on device
# Connect via USB
adb devices  # Verify device is listed

npm run android
```

**iOS:**

```bash
# Requires Xcode and provisioning profile configured
# Connect device and trust computer

npm run ios -- --device
```

---

## Troubleshooting

### Android Build Fails

```bash
# Clear gradle cache
cd android
./gradlew clean
cd ..

# Rebuild
npm run android
```

### iOS Build Fails

```bash
# Clear derived data
rm -rf ~/Library/Developer/Xcode/DerivedData/IOSPublisherCompanion*

# Reinstall pods
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..

# Rebuild
npm run ios
```

### GitHub Actions Authentication Issues

- **iOS**: Ensure certificate and provisioning profile are properly base64 encoded
- **Android**: Verify keystore password and key alias match gradle config
- Check secret values have no extra whitespace or newlines

---

## Best Practices

1. **Always test locally first** before pushing to main
2. **Use develop branch** for testing in CI/CD
3. **Tag releases** in Git for version tracking
4. **Keep signing credentials secure** — never commit to repo
5. **Monitor GitHub Actions logs** for build errors
6. **Backup signing keys** in secure location

---

## Next Steps

1. Set up local Android emulator or physical device testing
2. Create Google Play Developer account
3. Create Apple Developer account (if deploying to iOS)
4. Generate and store signing credentials securely
5. Push code to GitHub and enable Actions workflows
6. Configure GitHub Secrets for your app
7. Test CI/CD pipeline with a PR

For more information:

- [React Native Documentation](https://reactnative.dev)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
