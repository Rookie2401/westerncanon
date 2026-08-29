# Putting Summa on your iPhone (PWA — no App Store, no Xcode)

The app is a fully offline Progressive Web App. Once it has loaded once over
HTTPS, the whole Latin corpus (~25 MB) and the app are cached on the phone and
it runs with no network — launched from a home‑screen icon, full screen, no
Safari chrome.

You need to (1) put the built site on an HTTPS URL, then (2) add it to the
home screen from Safari.

---

## 1. Host the built site

The build output is `summa-app/dist/` (regenerate any time with `npm run build`).
It uses a relative base + hash routing, so it works from any static host or
sub‑path with zero server config.

### Option A — Netlify Drop (fastest, ~1 minute, no account needed to deploy)

1. Open <https://app.netlify.com/drop> on your computer.
2. Drag the **`summa-app/dist` folder** onto the page
   (or drag the `summa-dist.zip` that was sent to you — same thing).
3. Wait ~20 s. You get a live URL like `https://gentle-bombolone-1a2b3c.netlify.app`.
4. *(Optional but recommended)* Click **"Claim this site"** / sign in with a free
   account so the URL stays permanent and you can rename it. To publish an
   update later, just drag a fresh `dist` folder onto the same site.

### Option B — GitHub Pages (stable URL under your account)

```bash
cd summa-app
# create an empty repo on github.com first, e.g. "summa-app", then:
git remote add origin https://github.com/<your-username>/summa-app.git
git push -u origin master
```

Then in the repo: **Settings → Pages**, and either enable the Vite/Actions
workflow, or push the contents of `dist/` to a `gh-pages` branch. The app works
fine at `https://<your-username>.github.io/summa-app/`.

### Option C — just to try it on the same Wi‑Fi (not for the real install)

```bash
cd summa-app
npm run build
npm run preview -- --host --port 4173
```

Open `http://<your-computer-ip>:4173` on the phone. This is fine for a look,
but iOS only enables full offline / real "app" behaviour over **HTTPS**, so use
A or B for the actual home‑screen install.

---

## 2. Add to Home Screen (on the iPhone)

1. Open the hosted URL in **Safari** (must be Safari — Chrome/Firefox on iOS
   can't create a real PWA).
2. Let it finish loading **once, on Wi‑Fi**. The first load downloads the whole
   corpus + search index (~25 MB) so everything works offline afterward.
3. Tap the **Share** button (square with an up arrow) → scroll down →
   **Add to Home Screen** → **Add**.
4. Launch "Summa" from the home screen. It opens full screen.

### Verify it's really offline

Turn on **Airplane Mode**, open Summa from the home screen, then browse
Parts → Questions → Articles and run a search. Nothing should fail to load.

---

## Notes

- **Updating the app:** re‑deploy a fresh `dist/` to the same URL. The service
  worker auto‑updates on the next launch that has a connection.
- **Cache eviction:** iOS may clear a PWA's storage after ~2 weeks of no use.
  If content ever looks stale or missing, open the app once with a connection
  and it re‑caches.
- **Apple Developer Program:** not required for any of the above. It's only
  needed if you later want a native build / TestFlight distribution, which would
  first require wrapping the app in an Expo shell.
