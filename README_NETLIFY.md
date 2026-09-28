# Niksmarvel Public Enrollment Form — Netlify

This package is a standalone Netlify site for the public enrollment form.

## Deploy
1. Create a new Netlify site from this folder/repository.
2. Netlify will use the included `netlify.toml`.
3. The form and `/api/*` function are deployed on the same origin.
4. Do **not** upload or commit `server/.env`; configure the server variables in Netlify Site configuration → Environment variables.

## Important
The supplied `.env` is preserved exactly as provided. The Appwrite API key remains blank in that file if it was blank in your source package; no credential was invented.

Do not place private credentials in `site/config.js` or other browser files.


### Upload limit
Each submitted image is limited to 2 MB in the form and API. This keeps a submission containing both the passport photo and signature safely below the serverless request-size ceiling; the Appwrite bucket may remain configured at its 5 MB maximum.
