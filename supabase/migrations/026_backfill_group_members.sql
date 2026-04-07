-- Backfill group_members for accepted invites that never got a row inserted.
-- Root cause: the old service client ran under the user session, so the RLS
-- "Group creator can manage members" INSERT policy silently blocked non-creators.
--
-- Strategy: match accepted invites to auth users by email (robust, works even
-- when accepted_by was not recorded).

-- Step 1: Ensure user_profiles exists for every auth user that has an accepted invite.
INSERT INTO user_profiles (id, email, full_name, created_at, updated_at)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
  au.created_at,
  now()
FROM auth.users au
JOIN group_invites gi ON lower(gi.invited_email) = lower(au.email)
WHERE gi.accepted_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_profiles up WHERE up.id = au.id
  )
ON CONFLICT (id) DO NOTHING;

-- Step 2: Insert the missing group_members rows.
INSERT INTO group_members (group_id, user_id, role, joined_at)
SELECT
  gi.group_id,
  au.id,
  'member',
  gi.accepted_at
FROM group_invites gi
JOIN auth.users au ON lower(au.email) = lower(gi.invited_email)
WHERE gi.accepted_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = gi.group_id AND gm.user_id = au.id
  )
ON CONFLICT (group_id, user_id) DO NOTHING;
