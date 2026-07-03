import { BorrowForm } from "@/components/vault/borrow-form";
import { ActionPageShell } from "@/components/vault/action-page-shell";

export default function BorrowPage() {
  return (
    <ActionPageShell title="Borrow USDC" description="Borrow stablecoins against your deposited collateral, up to 60% LTV.">
      <BorrowForm />
    </ActionPageShell>
  );
}
