# Graham Value

A personal iPhone app (installable web app) that applies Benjamin Graham's revised formula to Bursa Malaysia and international stocks.

```
Value = EPS × (8.5 + 2g) × 4.4 / Y
```

It also shows a conservative version (7 + 1g), a buy-below price, a Graham Number and a saved watchlist. It works offline, and your watchlist stays on your phone.

## What's in the folder

| File | What it does |
|---|---|
| `index.html` | The screens: Calculator, Watchlist, Settings, Notes |
| `app.js` | All the logic and calculations |
| `sw.js` | Lets the app work offline |
| `manifest.webmanifest` | App name, icon and full-screen setting |
| `icons/` | Home-screen icons |
| `tests/compute.test.js` | Checks the maths against known examples |
| `setup-mac.sh` | One-time setup and publish script for your Mac |

## Put it on your iPhone (first time, about 10 minutes)

1. Unzip this folder somewhere on your Mac, such as `Documents/graham-value-app`.
2. Open **Terminal**, type `bash ` (with a space), drag `setup-mac.sh` into the window, and press Return.
   - It installs Apple's command line tools, Homebrew, git, the GitHub CLI and VS Code.
   - It asks for your Mac password once, and opens your browser once to log in to GitHub. If you have no GitHub account, sign up for a free one when the browser opens.
   - It uploads the app to a new repository and turns on GitHub Pages (free hosting).
3. When it prints your link (`https://<your-username>.github.io/graham-value/`), wait 1–2 minutes, then open it in **Safari** on your iPhone.
4. Tap **Share → Add to Home Screen → Add**.

The app now has its own icon, opens full-screen and works without signal.

> The repository is public because GitHub Pages is free only for public repos. That makes the app's code visible to others, but your watchlist and settings never leave your phone.

## Prefer not to install anything?

You can do it all in the browser: sign up at github.com, create a public repository called `graham-value`, use **Add file → Upload files** to drag in everything from this folder, then go to **Settings → Pages**, choose branch `main` and folder `/ (root)`, and save.

## Making changes later

1. Open the folder in VS Code and edit the files.
2. In `sw.js`, change `CACHE = "graham-value-v1.0.0"` to a new number (for example `v1.0.1`) so phones pick up the update.
3. In Terminal, in the folder: `git add -A && git commit -m "Describe the change" && git push`
4. On the phone, close and reopen the app twice. The first time downloads the update, and the second time uses it.

Try it on your Mac first: run `python3 -m http.server 8000` in the folder and open http://localhost:8000.

Run the maths tests with `node tests/compute.test.js` (needs Node: `brew install node`).

## Updating the bond yields

Do this in the app under **Settings → Bond yield Y by currency**, about once a month:

- **MYR:** Bank Negara FMIP, Indicative Yield to Maturity, AAA 10-year: https://financialmarkets.bnm.gov.my/indicative-yield-to-maturity
- **USD:** Moody's Seasoned Aaa Corporate Bond Yield, FRED series DAAA: https://fred.stlouisfed.org/series/DAAA

## Backups

iPhone keeps home-screen app data, but it's wiped if you delete the app. Use **Watchlist → Export backup** now and then, and save the file to iCloud Drive. **Import backup** restores it.

---
A screening tool, not investment advice. Example figures were current around 20–22 Oct 2026.
