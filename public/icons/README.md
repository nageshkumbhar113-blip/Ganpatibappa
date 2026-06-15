# PWA Icons

Place the following icon files in this directory:

| File | Size | Usage |
|------|------|-------|
| `icon-72x72.png` | 72×72 | Legacy Android |
| `icon-96x96.png` | 96×96 | Legacy Android |
| `icon-128x128.png` | 128×128 | Chrome |
| `icon-144x144.png` | 144×144 | IE |
| `icon-152x152.png` | 152×152 | iOS |
| `icon-192x192.png` | 192×192 | Android (required) |
| `icon-384x384.png` | 384×384 | Android |
| `icon-512x512.png` | 512×512 | Splash screen (required) |
| `icon-maskable-192x192.png` | 192×192 | Maskable icon |
| `icon-maskable-512x512.png` | 512×512 | Maskable icon |
| `apple-touch-icon.png` | 180×180 | iOS home screen |
| `favicon.ico` | 32×32 | Browser tab |

## How to generate

Use your Ganesh Murti logo (minimum 512×512 PNG) and run:

```bash
npx pwa-asset-generator your-logo.png ./public/icons \
  --padding "10%" \
  --manifest public/manifest.json \
  --index public/index.html \
  --favicon
```

Or use online tool: https://realfavicongenerator.net
