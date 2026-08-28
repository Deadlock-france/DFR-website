import { createServiceRoleClient } from "@/lib/supabase/admin";

/**
 * Efface le compte Auth + profil.
 * Archives showmatch : display_name / pseudo conservés, IDs Discord et Steam
 * retirés, avatar Discord retiré (l’URL CDN contient le snowflake).
 */
export async function eraseOwnAccount(userId: string): Promise<void> {
  const admin = createServiceRoleClient();

  const { error: rpcError } = await admin.rpc("anonymize_user_for_erasure", {
    p_user_id: userId,
  });
  if (rpcError) {
    throw new Error(rpcError.message);
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    throw new Error(deleteError.message);
  }
}
