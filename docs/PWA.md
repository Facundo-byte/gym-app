# Installing FORGE as a PWA

FORGE can be installed from its HTTPS website and opened from the home screen in its own window. It uses the existing React application and Supabase project. No native build, store account, database migration or new account system is required.

The owner's production address is **https://forgegym-henna.vercel.app/**. This follow-up prepares the repository; it does not publish changes. The existing public deployment had no linked manifest, and direct requests to `/routines/new` and `/account/password` returned 404 during the initial read-only check. Publish the new build before testing installation on phones.

## Publish the prepared version

1. Review and commit the changes, then push to the Git branch connected to the Vercel production project, or use its established deployment process.
2. Keep the Vite build command `npm run build`, output directory `dist`, and existing build-time `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` public variables. No secret/admin key is needed.
3. The included `vercel.json` provides SPA routing to `/index.html`, prevents stale caching of `/sw.js`, and serves the manifest with revalidation and the correct content type. Existing static files take precedence over the rewrite.
4. In **Supabase → Authentication → URL Configuration**, use:

   ```text
   Site URL: https://forgegym-henna.vercel.app

   Redirect URLs:
   https://forgegym-henna.vercel.app/login
   https://forgegym-henna.vercel.app/account/password
   ```

   Preserve any development callbacks still needed. The installed app uses the same origin and database. The public key cannot verify/change the dashboard allowlist.
5. Open the deployed site online. Verify `/manifest.webmanifest`, `/sw.js`, `/routines/new` and `/account/password` load directly. Review confirmation/recovery emails from the production browser.

Hosting requires HTTPS; `localhost` is an exception for local testing. An ordinary HTTP LAN address on a phone does not provide a production installation test. See Vercel's [Vite SPA configuration](https://vercel.com/docs/frameworks/frontend/vite) and MDN's [PWA installability requirements](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).

## Install on a phone

**Android:** Open the public address in Chrome and select **Install FORGE** in the page footer. When the native prompt is available, choose **Install app** and confirm. Otherwise use the browser menu's **Install app** or **Add to Home screen**. The browser controls prompt availability; FORGE does not repeatedly force it. Launch from the new icon.

**iPhone/iPad:** Open the address in Safari. Select **Share → Add to Home Screen**, keep **Open as Web App** enabled if shown, then choose **Add**. Launch from the home-screen icon. The in-app dialog includes these instructions in English/Spanish. See Apple's [web app instructions](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios).

Sign in after installation to load account plans. Safari and installed apps may keep separate sessions and guest storage. Installing does not migrate guest data automatically. If needed, review the existing explicit guest import in the original browser first; imports remain restricted to unused accounts, with no merge or general backup restoration.

Store distribution, native plugins, push notifications and background account synchronization are outside this request.

## Accounts and email links

Login, account saves, private images and logout use the existing Supabase services. The worker never caches authentication responses, account documents, private uploads or callback URLs containing email codes.

FORGE uses PKCE. Confirmation/recovery must start and finish in the same browser and origin, where the verifier is stored. An email opened in Safari may not have an installed app's verifier. In installed mode, **Create account** and **Recover account** provide an **Open browser** link. Request and complete the email there, then return to FORGE and log in. Normal browser forms and password-change behavior are preserved. If a link opens in another browser, open it in the requesting browser instead.

The handoff is covered with fixture HTTP. Actual iOS window handling, production email delivery and dashboard redirects still require physical-device review. No new email template or authentication security change is required.

## Offline behavior and updates

- Production precaches public JavaScript, CSS, HTML, fonts, starter illustrations and icons. After successful initial online preparation, guests can use existing local plans/uploads/workout completion offline, including refresh and internal navigation.
- Account loading/saving and private images require a connection. Failed saves retain the draft and last confirmed state. There is no offline account queue, local replica or merge. Reconnect and follow the existing guidance before retrying a save with an uncertain result.
- The offline notice distinguishes guest/account behavior. Browser online status is advisory; services still handle failures when a device reports online.
- New versions wait. **Update FORGE → Update now** explicitly activates a worker and reloads that tab. **Later** preserves its draft. Confirmation explains unsaved input loss and blocks acceptance during pending domain saves.
- An update in another tab does not automatically reload an unsaved form here. Explicitly update/reopen to use the new version. Cache cleanup only concerns public files; saved plans retain their original storage.
- Browser eviction, site-data removal or uninstalling with data removal can remove guest plans and cached files. Account plans remain in Supabase. Installation is not a backup.

The worker has no runtime API caching or background account work. Development deliberately does not register it, keeping source edits immediate. Review PWA behavior with a production build in a disposable profile:

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Preview serves the last build and does not watch source edits. When already controlled by an older worker, accept **Update FORGE**, or close its tabs and reopen. A different preview port has separate guest data and account callbacks.

## Icons and implementation

Edit `public/icons/forge.svg`, then run `npm run icons:pwa`. The script renders 192/512 px icons, a 512 px maskable icon and a 180 px Apple touch icon using the existing development-only Playwright browser. Keep essential artwork inside the maskable safe area. PNGs are committed; generation is only needed after artwork changes. Rebuild after replacement. Manifest metadata is centralized in `vite.config.js`; page metadata is in `index.html`.

`src/pwa/` owns installation state and worker lifecycle. `PwaControls.jsx` reuses accessible dialogs/buttons. Existing services retain business persistence; `StorageProvider` exposes pending domain saves to update confirmation. Pinned build dependency `vite-plugin-pwa` generates Workbox. No direct browser-storage access or new runtime state framework is added.

## Verification and phone review

`npm run test:pwa` builds into ignored `.pwa-test-dist/` and runs eight desktop/mobile executions on private port 4177 with the real generated worker. It checks manifest/icon sizes and Chromium installability, cold offline navigation and guest saves/images, bilingual installation help/cancellation, actual update waiting/acceptance across tabs, pending writes, uncached private data, failed account saves, browser recovery and account separation. Native tests cover lifecycle failures/disposal. Native installation events are simulated; fixture accounts do not prove actual email delivery or deployed permissions. See [TESTING.md](TESTING.md).

After publishing, use physical Android/iPhone devices with disposable guest/test-account data:

1. Install and launch from the icon. Review standalone window, icon, safe areas, language, navigation and keyboard scrolling.
2. Sign in and compare an account routine/photo with the browser. Save a test edit, refresh the browser and check the same Supabase account.
3. Sign out and create a guest routine/photo. Wait for online preparation, close, enable airplane mode, reopen and refresh. Finish a guest workout; reconnect and inspect its saved completion.
4. Disconnect in account mode and try a save. Check retained draft and no false success or guest/account mixing. Reconnect and review saved state before retrying.
5. Test signup/recovery through **Open browser**, complete its email there, then sign into the installed app.
6. Deploy a later reviewed version with an exercise draft open. **Later** preserves it. Save, update and confirm the saved exercise remains. Another tab's draft must not reload automatically.

Physical installation, WebKit, production callback configuration and a subsequent Vercel deployment were not verified by local Chromium automation. Record those results separately.
