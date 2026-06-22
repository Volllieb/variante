Vercel Deployment Checklist — ab-tool
===================================

This checklist helps deploy the `ab-tool` Next.js app to Vercel and verify the new /ab.js snippet and API routes.

1) Push code to remote
----------------------
- Add remote and push branch (example):
  git remote add origin <git-url>
  git push -u origin master

2) Create Vercel project
------------------------
- In Vercel, choose "Import Project" and connect your Git provider (GitHub/GitLab/Bitbucket).
- Select the repository and authorize access.
- For monorepos, point the root to `ab-tool/`.

3) Environment variables (Vercel > Settings > Environment Variables)
-------------------------------------------------------------------
- SUPABASE_URL (e.g. https://xyz.supabase.co) — public, used by server and client
- SUPABASE_KEY (service_role or anon? Use service_role ONLY for server-side secret tasks; prefer anon for client-side) — secret
- NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_KEY if client code needs access (prefer anon)
- Any other secrets used by ab-tool (e.g., OPENAI_KEY) — secret

4) Build & Output settings
--------------------------
- Framework Preset: Next.js (should auto-detect)
- Root Directory: `ab-tool/` (important for monorepo)
- Build Command: `npm run build`
- Output Directory: (leave default for Next.js)

5) Migrations & Database
------------------------
- Run SQL migration before or after deploy (recommended BEFORE deploying if DB schema changes are required at runtime):
  -- run in Supabase SQL editor:
  alter table tests add column if not exists goal_candidates jsonb;

6) Verify /ab.js serving
------------------------
- After deployment, open:
  https://<your-vercel-domain>/ab.js
- Response: Content-Type application/javascript and JS body similar to local file.
- Troubleshooting: If 404, ensure file exists at `app/ab.js/route.ts` and project root is correct (ab-tool/). Re-deploy after commit.

7) API checks
-------------
- Verify these endpoints return expected responses:
  GET  /api/resolve?host=example.com&path=/
  GET  /api/tests
  PATCH /api/tests/<id>   (try updating status to 'paused')
  DELETE /api/tests/<id>?confirm=true
  GET  /api/assign?testId=<snippet_key>
  GET  /api/variant?testId=<snippet_key>
  POST /api/event (send a small JSON payload to test)

8) ab-spike integration test
----------------------------
- Ensure ab-spike layout includes in <head>:
  <script async src="https://<your-vercel-domain>/ab.js"></script>
- Open the ab-spike page in browser.
- Console: look for assignment/variant logs (ab.js doesn't log aggressively; check network requests to /api/assign and /api/variant).
- Click the CTA (`a.cta-btn`) — it should trigger the delegated click listener (if the goal selector matches) and send a POST to /api/event.

9) Smoke test steps
-------------------
- Create a test via the plugin/dashboard with site_url pointing to the ab-spike domain and selector matching .cta-btn.
- Ensure test status is `active` and selector set.
- Visit ab-spike in an incognito window (to avoid localStorage ties) and confirm /api/assign is called and a variant assigned.
- If assigned B and variant HTML exists, the DOM should be replaced accordingly.
- Click CTA → check /api/event received payload with event: 'conversion'.

10) Troubleshooting
-------------------
- 404 /ab.js: route missing or build output not including app routes. Verify `app/ab.js/route.ts` exists and commit was pushed.
- CORS errors: ensure corsHeaders in API routes allow the ab-spike origin if needed.
- DB errors: check Supabase logs; verify MIGRATIONS ran and columns exist.
- Missing variant HTML: ensure `variant_b_html` is populated for test rows (generate step created HTML).

11) Rollback
-----------
- Revert to previous commit on Git and re-deploy via Vercel dashboard or `git push`.

Notes
-----
- Use Next.js app directory routes; `app/ab.js/route.ts` returns JS with header application/javascript.
- Keep secrets out of the client; use NEXT_PUBLIC_ for safe public keys only.

