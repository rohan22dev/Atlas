import { rpc, scValToNative } from "@stellar/stellar-sdk";
import { server } from "./tx";

export interface ActivityEvent {
  id: string;
  ledger: number;
  closedAt: string;
  txHash: string;
  eventName: string;
  contractId?: string;
  data: Record<string, unknown>;
}

/** Testnet RPC providers cap how far back getEvents can look; try
 * progressively smaller windows so we degrade gracefully instead of
 * erroring outright. */
const LEDGER_WINDOWS = [120_000, 40_000, 17_280, 4_320];

export async function fetchContractEvents(contractIds: string[], limit = 100): Promise<ActivityEvent[]> {
  const latest = await server.getLatestLedger();

  for (const window of LEDGER_WINDOWS) {
    const startLedger = Math.max(1, latest.sequence - window);
    try {
      const res = await server.getEvents({
        startLedger,
        filters: [{ type: "contract", contractIds }],
        limit,
      });
      return res.events
        .map(parseEvent)
        .filter((e): e is ActivityEvent => e !== null)
        .reverse();
    } catch {
      continue;
    }
  }
  return [];
}

function parseEvent(event: rpc.Api.EventResponse): ActivityEvent | null {
  if (event.topic.length === 0) return null;
  try {
    const eventName = scValToNative(event.topic[0]) as string;
    const raw = scValToNative(event.value);
    const data: Record<string, unknown> =
      raw && typeof raw === "object" && !Array.isArray(raw) ? { ...(raw as Record<string, unknown>) } : { value: raw };
    // Additional indexed topics (e.g. the user address) are appended too.
    for (let i = 1; i < event.topic.length; i++) {
      data[`topic${i}`] = scValToNative(event.topic[i]);
    }
    return {
      id: event.id,
      ledger: event.ledger,
      closedAt: event.ledgerClosedAt,
      txHash: event.txHash,
      eventName,
      contractId: event.contractId?.toString(),
      data,
    };
  } catch {
    return null;
  }
}
