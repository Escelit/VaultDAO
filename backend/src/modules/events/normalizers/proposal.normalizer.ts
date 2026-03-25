import type { ContractEvent } from "../events.types.js";
import type { 
  NormalizedEvent, 
  ProposalCreatedData, 
  ProposalExecutedData 
} from "../types.js";
import { EventType } from "../types.js";

/**
 * ProposalNormalizer
 * 
 * Normalizes proposal-related contract events into structured backend events.
 */
export class ProposalNormalizer {
  /**
   * Normalizes a "proposal_created" contract event.
   */
  public static normalizeCreated(event: ContractEvent): NormalizedEvent<ProposalCreatedData> {
    const data = event.value;

    return {
      type: EventType.PROPOSAL_CREATED,
      data: {
        proposalId: String(event.topic[1] ?? "0"),
        proposer: data[0] ?? "",
        recipient: data[1] ?? "",
        token: data[2] ?? "",
        amount: String(data[3] ?? "0"),
        insuranceAmount: String(data[4] ?? "0"),
      },
      metadata: {
        id: event.id,
        contractId: event.contractId,
        ledger: event.ledger,
        ledgerClosedAt: event.ledgerClosedAt,
      },
    };
  }

  /**
   * Normalizes a "proposal_executed" contract event.
   */
  public static normalizeExecuted(event: ContractEvent): NormalizedEvent<ProposalExecutedData> {
    const data = event.value;

    return {
      type: EventType.PROPOSAL_EXECUTED,
      data: {
        proposalId: String(event.topic[1] ?? "0"),
        executor: data[0] ?? "",
        recipient: data[1] ?? "",
        token: data[2] ?? "",
        amount: String(data[3] ?? "0"),
        ledger: Number(data[4] ?? 0),
      },
      metadata: {
        id: event.id,
        contractId: event.contractId,
        ledger: event.ledger,
        ledgerClosedAt: event.ledgerClosedAt,
      },
    };
  }
}
