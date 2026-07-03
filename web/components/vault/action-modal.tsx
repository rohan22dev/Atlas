"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { DepositForm } from "./deposit-form";
import { WithdrawForm } from "./withdraw-form";
import { BorrowForm } from "./borrow-form";
import { RepayForm } from "./repay-form";

export type VaultAction = "deposit" | "withdraw" | "borrow" | "repay";

const COPY: Record<VaultAction, { title: string; description: string }> = {
  deposit: { title: "Deposit XLM", description: "Add collateral to your Atlas vault." },
  withdraw: { title: "Withdraw XLM", description: "Remove collateral from your vault." },
  borrow: { title: "Borrow USDC", description: "Borrow stablecoins against your collateral." },
  repay: { title: "Repay USDC", description: "Pay down your outstanding debt." },
};

export function ActionModal({
  action,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  action: VaultAction;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;
  const copy = COPY[action];

  const Form = { deposit: DepositForm, withdraw: WithdrawForm, borrow: BorrowForm, repay: RepayForm }[action];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger as React.ReactElement} />}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        <Form onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
