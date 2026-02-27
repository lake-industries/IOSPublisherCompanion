# GitHub Actions Setup Guide

This guide walks through setting up your React Native project on GitHub with automated builds.

## Quick Start

### 1. Initialize Git Repository

```bash
cd c:\mpy\ib\cloned_repos\IOSPublisherCompanion

git init
git config user.name "Your Name"
git config user.email "your@email.com"
git add .
git commit -m "Initial React Native project scaffold"
```

### 2. Create GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. Create a new repository (e.g., `IOSPublisherCompanion`)
3. **Do NOT** initialize with README, .gitignore, or license
4. Copy the commands and run in your terminal:

```bash
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/IOSPublisherCompanion.git
git push -u origin main
```

### 3. Enable GitHub Actions Workflows

Your workflows are automatically detected from `.github/workflows/`:

- `android-build.yml` — Builds Android APK/AAB on every push
- `ios-build.yml` — Builds iOS archive on every push (requires macOS runner)

To monitor:

1. Go to your GitHub repo
2. Click **Actions** tab
3. You should see workflows running

### 4. Add Repository Secrets (Required for Deployment)

#### For Android Deployment

Go to **Settings → Secrets and variables → Actions**

**Add these secrets:**

```
ANDROID_KEYSTORE
ANDROID_KEYSTORE_PASSWORD
ANDROID_KEY_ALIAS
ANDROID_KEY_PASSWORD
```

**To generate:**

```bash
# Create signing key (one time)
keytool -genkey -v -keystore ios-publisher-companion.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias ios-publisher-companion

# Encode for GitHub (paste this into secret)
cat ios-publisher-companion.keystore | base64 | clip
```

#### For iOS Deployment (Mac Required)

**Add these secrets:**

```
APPLE_CERTIFICATE_P12
APPLE_CERTIFICATE_PASSWORD
APPLE_PROVISIONING_PROFILE
APPLE_ID
APPLE_APP_SPECIFIC_PASSWORD
APP_STORE_CONNECT_API_KEY
APP_STORE_CONNECT_KEY_ID
APP_STORE_CONNECT_ISSUER_ID
```

See `DEPLOYMENT.md` for detailed instructions.

---

## How It Works

### Workflow Triggers

Both workflows run automatically on:

- **Push to `main` or `develop` branch** → Full build
- **Pull Request to `main` or `develop`** → Build for verification

### Android Build Steps

1. Check out code
2. Set up Node.js v20
3. Install npm dependencies
4. Lint code with ESLint
5. Set up Java 11
6. Set up Android SDK
7. Build debug APK
8. Build release AAB (Android App Bundle)
9. Upload artifacts (available for 90 days)

**Duration:** ~15-20 minutes

### iOS Build Steps

1. Check out code
2. Set up Node.js v20
3. Install npm dependencies
4. Set up Xcode
5. Install CocoaPods dependencies
6. Build debug configuration
7. Archive release configuration
8. Upload .xcarchive artifact

**Duration:** ~30-45 minutes (requires macOS runner)

---

## Accessing Build Artifacts

### Download APK/AAB

1. Go to **Actions** tab
2. Click the workflow run (green checkmark)
3. Scroll to bottom → **Artifacts** section
4. Download `android-apk-debug` or `android-aab-release`

### Download iOS Archive

1. Go to **Actions** tab
2. Click the iOS workflow run
3. Scroll to bottom → **Artifacts** section
4. Download `ios-archive`
5. Use Transporter to upload to TestFlight

---

## Workflow Status

Check workflow status badges:

```markdown
# In your README.md

![Android Build](https://github.com/YOUR_USERNAME/IOSPublisherCompanion/workflows/Android%20Build/badge.svg)
![iOS Build](https://github.com/YOUR_USERNAME/IOSPublisherCompanion/workflows/iOS%20Build/badge.svg)
```

---

## Customizing Workflows

### Change Build Branches

Edit `.github/workflows/android-build.yml` and `.github/workflows/ios-build.yml`:

```yaml
on:
  push:
    branches: [main, develop, staging] # Add/remove branches
  pull_request:
    branches: [main, develop]
```

### Add More Steps

Example: Deploy to Google Play Store after successful Android build

```yaml
- name: Deploy to Google Play
  if: github.ref == 'refs/heads/main' # Only on main branch
  run: |
    cd android
    ./gradlew publishReleaseBundle \
      -PkeystorePassword=${{ secrets.ANDROID_KEYSTORE_PASSWORD }} \
      -PkeyAlias=${{ secrets.ANDROID_KEY_ALIAS }} \
      -PkeyPassword=${{ secrets.ANDROID_KEY_PASSWORD }}
```

### Disable a Workflow

Rename the file from `.yml` to `.yml.bak` to disable it.

---

## Troubleshooting

### Workflow Not Running

- [ ] Check code is committed and pushed to `main` or `develop`
- [ ] Go to Actions tab and check for error messages
- [ ] Verify workflow file syntax (YAML must be valid)

### Build Fails

1. Click the failed workflow
2. Click the failed job
3. Expand error logs
4. Common issues:
   - Missing Node modules → Run `npm install` locally
   - Android SDK not found → Workflows auto-setup, retry
   - Missing secrets → Add to Settings → Secrets
   - Keystore password wrong → Verify secret value

### Android Build OOM Error

In `android-build.yml`, add:

```yaml
- name: Build Android AAB
  env:
    _JAVA_OPTIONS: -Xmx4096m
  run: ./gradlew bundleRelease
```

### iOS Build Slow

iOS builds on GitHub's macOS runner can take 30-45 minutes due to:

- Pod installation
- Xcode build time
- Artifact upload

This is normal.

---

## Cost Considerations

- **Free tier:** 2,000 Actions minutes/month per account
- **macOS runner:** Uses 10x minutes (1 min = 10 credits)
- **Linux runner:** Uses 1x minutes
- **Private repo:** Still free for first 2,000 minutes

**Estimate:**

- Android build: ~3 credits per run
- iOS build: ~50 credits per run
- Total per commit: ~53 credits (with both workflows)
- Monthly (assuming 10 commits): ~530 credits ✓ Within free tier

---

## Next Steps

1. **Commit and push** this scaffold to GitHub
2. **Verify workflows run** in Actions tab
3. **Download build artifacts** to test locally
4. **Add deployment secrets** when ready for app store release
5. **Set up branch protection** (Settings → Branches) to require workflow success before merging

---

## Useful Commands

```bash
# View workflow runs locally (requires GitHub CLI)
gh run list --repo YOUR_USERNAME/IOSPublisherCompanion

# Check specific workflow
gh run view RUN_ID --log

# Trigger workflow manually (if configured)
gh workflow run android-build.yml
```

---

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [React Native CI/CD Guide](https://reactnative.dev/docs/performance)
- [Android Gradle Plugin Guide](https://developer.android.com/studio/build)
- [Fastlane for iOS](https://docs.fastlane.tools)

---

**Status:** GitHub Actions workflows ready to use. Configure secrets for deployment when ready.
