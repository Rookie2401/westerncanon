# Putting the Library on your iPhone (PWA — no App Store, no Xcode)

The app is a fully offline Progressive Web App — a small classical-text
**Library** (currently Aristotle's *Categories* and *De Interpretatione*, each
in Greek and in Boethius's Latin; Porphyry's *Isagoge* in Greek and in
Boethius's Latin; and the *Summa Theologiae*). Once it has loaded once over
HTTPS, the whole
corpus (~25 MB) and the app are cached on the phone and it runs with no
network — launched from a home‑screen icon, full screen, no Safari chrome.

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

Turn on **Airplane Mode**, open the app from the home screen, then:

- Library → **Aristotle** (the first row, above Porphyry) → **Categories**
  (Greek) → a chapter → the reader shows polytonic Greek, with no per-passage
  marker; the section header and prev/next stay intact.
- Library → **Aristotle → Categories** (Latin · trans. Boethius) → a chapter →
  the reader shows the Latin (with the verbatim rubric, e.g. DE SUBSTANTIA,
  where the source prints one, and an "ed." English title); no per-passage
  marker; prev/next moves between chapters. Chapter 10 shows the flagged
  `<...>` lacuna notes.
- Repeat both for **De Interpretatione**. Under Aristotle the order is
  Categories (Greek, Latin) then De Interpretatione (Greek, Latin), and
  Aristotle appears **above** Porphyry in the Library list.
- Library → **Porphyry → Isagoge (Greek)** → a section → the reader shows the
  Greek text in the bundled polytonic serif; the back pill (‹ ISAGOGE) stays
  visible after a tap into immersive mode; prev/next moves between sections.
- Repeat for **Isagoge (Latin, trans. Boethius)**.
- Library → **Thomas Aquinas → Summa Theologiae** → a Part → Question →
  Article — must look exactly as it did before.
- Run a search for a Greek word (accent-insensitive) and a Latin word; both the
  Summa and the Isagoge should return hits.
- Check a bookmark and the Continue card survive a full app restart.

Do this at iPhone width in **both light and dark**. Nothing should fail to load.

### If content looks stale after a redeploy

Re‑deploy a fresh `dist/` to the same URL, then on the phone open the app once
**with a connection** and wait a few seconds — the service worker fetches the
new build and swaps it in on the next launch. If it still looks old: Settings →
Safari → Advanced → Website Data → remove the site, or delete and re‑add the
home‑screen icon, then load once online.

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
