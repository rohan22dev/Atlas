import { RepayForm } from "@/components/vault/repay-form";
import { ActionPageShell } from "@/components/vault/action-page-shell";

export default function RepayPage() {
  return (
    <ActionPageShell title="Repay Debt" description="Pay down your outstanding USDC balance to improve your health factor.">
      <RepayForm />
    </ActionPageShell>
  );
}
