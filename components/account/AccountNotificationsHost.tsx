"use client";

import InviteToast from "@/components/account/InviteToast";
import NotificationCenter from "@/components/account/NotificationCenter";
import { useAccountInvites } from "@/components/account/AccountInvitesProvider";

/** Host global : toast + panneau, montés une fois dans le shell. */
export default function AccountNotificationsHost() {
  const { userId } = useAccountInvites();
  if (!userId) return null;
  return (
    <>
      <NotificationCenter />
      <InviteToast />
    </>
  );
}
