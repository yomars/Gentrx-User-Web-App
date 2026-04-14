# Gentrx User Web App Workspace Rules

- Production topology is fixed.
- `gentrx.ph` is this repo: `yomars/Gentrx-User-Web-App`.
- `admin.gentrx.ph` is `yomars/Gentrx-Admin-Web-App-Vultr`.
- `api.gentrx.ph` is the Laravel backend on the same Vultr server.
- Server IP is `149.28.145.80`.
- Frontend runtime path is `/var/www/gentrx-user-web-app`.
- Frontend PM2 process is `gentrx-main`.
- Nginx fronts the public site.

- Do not assume Vercel for this repo.
- Do not reintroduce `vercel.json`, Vercel workflows, or Vercel deployment logic unless explicitly requested.
- Do not invent or modify deployment architecture unless explicitly asked.

- Standard production deploy flow for this repo is:
  1. `npm run build`
  2. `npm run package:dist`
  3. `& .\scripts\deploy\deploy_prod_149.ps1 -ArtifactPath <artifact> -UsePasswordAuth:$true -SshPassword '<password>'`

- Always invoke `deploy_prod_149.ps1` directly from the current PowerShell session using `&`.
- Do not invoke that deploy script through `powershell -File`; boolean parameters break in that path.

- `src/Controllers/apiAddress.js` is a sensitive file.
- Keep its behavior simple: if `VITE_API_ADDRESS` is set, honor it; only fall back to same-origin when config is missing.
- Do not add hostname suffix matching or heuristics that can treat `gentrx.ph` and `api.gentrx.ph` as equivalent.
- Any change to API base routing must be explicitly requested and validated against production behavior.

- Before changing deployment or routing code, verify whether the last known-good behavior already exists in git history and preserve it unless there is a clear requested reason to change it.