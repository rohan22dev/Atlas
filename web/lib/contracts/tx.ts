import {
  BASE_FEE,
  Contract,
  rpc,
  scValToNative,
  Transaction,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";
import { ADMIN_ADDRESS, NETWORK_PASSPHRASE, RPC_URL } from "./config";
import { describeContractError, extractContractErrorCode } from "./errors";

export const server = new rpc.Server(RPC_URL);

/** Thrown when a contract call fails simulation or execution, with the
 * raw diagnostic message surfaced from the Soroban host so the UI can
 * show a meaningful error instead of a generic failure. */
export class ContractCallError extends Error {
  constructor(message: string, public readonly raw?: unknown) {
    super(message);
    this.name = "ContractCallError";
  }
}

function buildInvocation(contractId: string, method: string, args: xdr.ScVal[]) {
  const contract = new Contract(contractId);
  return contract.call(method, ...args);
}

/**
 * Simulates a read-only contract call and returns the decoded native
 * value. Used for every view function (balances, positions, prices,
 * health factors, etc). No wallet signature is required -- simulation
 * alone is enough to execute a Soroban view call.
 */
export async function readContract<T>(
  contractId: string,
  method: string,
  args: xdr.ScVal[] = [],
  sourceAddress: string = ADMIN_ADDRESS,
  errorMap: Record<number, string> = {},
): Promise<T> {
  const account = await server.getAccount(sourceAddress);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(buildInvocation(contractId, method, args))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new ContractCallError(parseSimulationError(sim.error, errorMap), sim);
  }
  if (!sim.result) {
    throw new ContractCallError(`No result returned from ${method}`, sim);
  }
  return scValToNative(sim.result.retval) as T;
}

/**
 * Builds and simulates a state-changing contract call, returning an
 * assembled (auth + footprint resolved) transaction XDR ready to be
 * handed to a wallet for signing. The caller must submit the signed XDR
 * via `submitSignedTransaction`.
 */
export async function buildContractTx(
  contractId: string,
  method: string,
  args: xdr.ScVal[],
  sourcePublicKey: string,
  errorMap: Record<number, string> = {},
): Promise<string> {
  const account = await server.getAccount(sourcePublicKey);
  const tx = new TransactionBuilder(account, {
    fee: (Number(BASE_FEE) * 10).toString(),
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(buildInvocation(contractId, method, args))
    .setTimeout(60)
    .build();

  const prepared = await server.prepareTransaction(tx).catch((err) => {
    throw new ContractCallError(parseSimulationError(err, errorMap), err);
  });

  return prepared.toXDR();
}

export interface SubmitResult<T> {
  status: "SUCCESS";
  hash: string;
  value: T | undefined;
}

/** Submits an already-signed transaction XDR and polls until it lands. */
export async function submitSignedTransaction<T>(signedXdr: string): Promise<SubmitResult<T>> {
  const tx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE) as Transaction;
  const sendResult = await server.sendTransaction(tx);

  if (sendResult.status === "ERROR") {
    throw new ContractCallError(
      parseSimulationError(sendResult.errorResult ?? sendResult),
      sendResult,
    );
  }

  const hash = sendResult.hash;
  let response = await server.getTransaction(hash);
  const start = Date.now();
  while (response.status === rpc.Api.GetTransactionStatus.NOT_FOUND) {
    if (Date.now() - start > 30_000) {
      throw new ContractCallError("Timed out waiting for transaction confirmation");
    }
    await new Promise((r) => setTimeout(r, 1200));
    response = await server.getTransaction(hash);
  }

  if (response.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
    throw new ContractCallError(parseSimulationError(response), response);
  }

  const value = response.returnValue ? (scValToNative(response.returnValue) as T) : undefined;
  return { status: "SUCCESS", hash, value };
}

function parseSimulationError(error: unknown, errorMap: Record<number, string> = {}): string {
  const raw =
    typeof error === "string"
      ? error
      : error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : "Unknown contract error";

  const code = extractContractErrorCode(raw);
  if (code !== undefined) {
    return describeContractError(code, errorMap) ?? `Contract error code ${code}`;
  }
  return raw;
}
