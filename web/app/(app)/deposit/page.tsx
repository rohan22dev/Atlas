import { DepositForm } from "@/components/vault/deposit-form";
import { ActionPageShell } from "@/components/vault/action-page-shell";

export default function DepositPage() {
  return (
    <ActionPageShell title="Deposit Collateral" description="Add XLM to your Atlas vault to unlock borrow power.">
      <DepositForm />
    </ActionPageShell>
  );
}
