# Backend Patch Handoff

These files are implementation aids for the backend/API repository, because the real controller code is not present in this workspace.

Files:

1. `DoctorController.image-persistence.example.php`
   - Example controller/helper patch for doctor image create/update/remove persistence.
2. `doctor-image-response-coalesce.example.sql`
   - Query expression to preserve current `image` response behavior.
3. `doctors_sequence_healthcheck.sql`
   - Read-only SQL checks for the duplicate `doctors_pkey` issue seen during mutating smoke tests.

Recommended backend rollout order:

1. Apply controller persistence fix.
2. Ensure `get_doctor` / `get_doctor/{id}` resolves `image` using COALESCE.
3. Run sequence healthcheck.
4. Deploy backend.
5. Re-run:

```powershell
pwsh -ExecutionPolicy Bypass -File scripts/backend/automate_image_integrity_fix.ps1 -SkipRemote -AllowMutatingCrudCheck
```
