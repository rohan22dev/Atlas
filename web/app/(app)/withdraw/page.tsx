import { WithdrawForm } from "@/components/vault/withdraw-form";
import { ActionPageShell } from "@/components/vault/action-page-shell";

export default function WithdrawPage() {
  return (
    <ActionPageShell title="Withdraw Collateral" description="Remove XLM from your vault. Blocked if it would leave you unhealthy.">
      <WithdrawForm />
    </ActionPageShell>
  );
}
