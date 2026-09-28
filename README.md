# Niksmarvel Fashion Academy — Public Enrollment Form

A standalone, mobile-friendly static enrollment form. This version's layout is restyled to match the client's reference screenshots: a top contact bar, a call/menu/logo header, a radio-list program picker, gray "Choose File" buttons, and a dark footer with the academy logo, social links, and quick-link columns. Brand colors stay Niksmarvel's own ivory/espresso/gold palette rather than copying the reference site's exact colors — say the word if you'd like an exact color match (e.g. the blue submit button) instead.

It now uses the academy's actual logo (`assets/logo.png`, supplied in Downloads.zip) in the header and footer.

## Important: connect the private API before accepting applications — nothing here changed

This archive contains only the public form. It does **not** keep applicant data in browser storage and it does not call Appwrite directly. Form submission posts to the secure API included in the separate **Admin Portal & Secure API** ZIP, exactly as before. Until that API is configured, submissions fail closed and no applicant data is stored. `config.js` and the submission logic in `form.js` are untouched.

Open `config.js` and set `apiBase` to the HTTPS origin serving the private portal/API when the two sites are hosted separately. Leave it as an empty string only when the API shares this site's origin. When hosted separately, add this form's exact HTTPS origin to the API server's `ALLOWED_ORIGINS` setting.

## Files

- `index.html` — enrollment form and content (restructured: top bar, hamburger header, radio-based program picker)
- `styles.css` — new layout/visual styling
- `form.js` — same required-field checks, image checks and API submission, plus a small mobile-menu toggle
- `config.js` — unchanged; public API base address only, never a secret
- `assets/logo.png` — the academy logo, added to the header and footer

## What changed vs. the previous build

- Added a top contact bar (phone, WhatsApp, TikTok handle).
- Header now has a call button, centered logo, and a hamburger menu (inline nav on desktop).
- "Which program are you interested in" is now a radio-button list (matching the reference) instead of a dropdown.
- File inputs render as a plain gray "Choose File" button.
- Footer rebuilt with logo, description, social icons, and two link columns, on a dark espresso background.
- Submit button uses a blue accent to match the reference's call-to-action color; everything else keeps the academy's gold/espresso identity.

## Run or host

Open `index.html` through a static web server or deploy the files to a static HTTPS host. Avoid opening it as `file://` if the API will be on another origin, because browsers block cross-origin requests from local files. No build step is required.

The form accepts JPG, PNG and WEBP uploads up to 5 MB each. Applicants do not receive a list or copy of academy records. The server—not the browser—sets the official submission time.

## Before launch

- Configure and test the paired secure API first.
- Confirm the final public business name and the six program names/durations, which were marked as open questions in the handoff brief.
- Set the API base URL and exact CORS origin(s) after the hostnames are final.
- Verify that submission fails closed if the server or Appwrite is not configured.
- Confirm the academy's public contact email/address if you'd like those added to the top bar too (only phone/WhatsApp/TikTok were confirmed).


## Contact footer
The public form includes a direct WhatsApp Business contact for **0803 548 2868**, using WhatsApp click-to-chat with a short pre-filled help message. The footer also carries the site copyright notice and the design credit **Designed by SwiftWebDesign**.
