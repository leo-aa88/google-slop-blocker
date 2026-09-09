# Building for Safari

Safari runs the same WebExtension (Manifest V3) code as Chrome and Firefox, but
it ships **inside a native macOS/iOS app**. Apple provides a converter that
wraps an unpacked extension in an Xcode project.

## Requirements

- macOS
- Xcode + Command Line Tools (`xcode-select --install`) — provides `xcrun` and
  `safari-web-extension-converter`
- An Apple Developer account (for distribution/notarization; not needed for
  local testing)

## Generate the Xcode project

```bash
npm run build:safari
```

This runs [`scripts/build-safari.sh`](../scripts/build-safari.sh), which:

1. builds a fresh unpacked extension into `dist/chrome`, then
2. converts it into an Xcode project in `dist/safari/`.

## Run it locally

1. Open the generated project in `dist/safari/` with Xcode.
2. Build & run the app target (▶). The container app launches.
3. Enable the extension: **Safari → Settings → Extensions**.
   - For an unsigned local build, first enable the **Develop** menu
     (Safari → Settings → Advanced → "Show features for web developers") and
     turn on **Develop → Allow Unsigned Extensions**.

## Distribute

Build, sign, and notarize the app target in Xcode as usual, then submit the
container app to the App Store (macOS and/or iOS). Safari extensions are
distributed as their host app.

## Notes

- The bundle identifier is set to `io.github.leo-aa88.googleslopblocker`
  in the build script — change it to your own before distributing.
- Re-run `npm run build:safari` after changing anything in `src/` to regenerate
  the converted resources.
