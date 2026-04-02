-- Use this logic in the doctor listing/detail query so existing frontend
-- continues receiving a non-empty `image` field without any frontend change.
--
-- Recommended expression:
COALESCE(
  NULLIF(users.image, ''),
  NULLIF(doctors.image, ''),
  NULLIF(users.image_path, ''),
  NULLIF(doctors.image_path, '')
) AS image
