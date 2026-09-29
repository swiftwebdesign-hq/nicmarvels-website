# Deploy the enrollment form on Netlify

This version uses **one Netlify site** for the student page and its Appwrite API Function. The student's approved page content and appearance are unchanged.

1. Connect the whole project folder to the existing Netlify site through its Git repository. Use the folder containing `netlify.toml` as the project root. **Do not deploy only `public/`**; the API Function source is alongside it.
2. Add the values from `server/.env.example` in **Netlify → Site configuration → Environment variables**. Set the real `ADMIN_EMAIL`, Appwrite endpoint/project/database/table/bucket/admin-user IDs, and the Appwrite API key. Keep secrets in Netlify's private settings—never in browser files or the repository.
3. If the admin portal is on another website, set `ALLOWED_ORIGINS` to its exact HTTPS origin (no wildcard). Netlify supplies the student site's own `URL` setting.
4. Trigger a deploy. `netlify.toml` publishes the `public/` website and explicitly packages `server/index.js` with the Function, so the site and API deploy together.
5. Test with dummy details and images before directing students to the form.

The Netlify site is the only host needed. `public/config.js` can leave `apiBase` empty because `/api/submissions` is routed to the same-site Function. Do not create a separate API service or upload Appwrite secrets into public files.
