# Niksmarvel Fashion Academy — Enrollment Form

This is the **single-Netlify deployment** for the student enrollment website and its Appwrite-connected API Function. The approved page design, logo, wording, fields, and styling are preserved from the uploaded project.

## Quick setup

1. Connect this whole project folder (the folder containing `netlify.toml`) to Netlify through a Git repository. Do not deploy only the `public/` folder, because that would omit the API Function.
2. In the Netlify site's environment-variable settings, add the Appwrite settings listed in `server/.env.example` and the academy's real authorized admin email. Keep the API key in Netlify's private environment variables only; never put it in `public/config.js`.
3. Deploy/redeploy the site. Netlify publishes `public/` and deploys the API Function at the same time. The function packages `server/index.js` explicitly, fixing the missing-module error.

The student site and API stay on the same Netlify origin, so `public/config.js` can keep `apiBase` empty. The existing `/api/*` route sends submissions to the bundled Function; there is no second hosting provider to configure.

See [`README_NETLIFY.md`](README_NETLIFY.md) for a short deploy checklist. The Appwrite key is intentionally blank in the example file and must be entered privately in Netlify.
