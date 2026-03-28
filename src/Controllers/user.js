import { getStorageJSON } from "../lib/storage";

// Safely read user from storage with tracking prevention fallback
// Deferred read to avoid blocking app bootstrap when tracking prevention is active
let user = null;
try {
  user = getStorageJSON("user");
} catch (err) {
  console.warn("Failed to read user from storage on module load:", err);
  // Gracefully continue with null — user data will be fetched when needed
}

export default user;
