/**
 * Normalized event types for the VaultDAO system.
 * These are used by the indexer, notification system, and frontend.
 */
export enum EventType {
  INITIALIZED = "INITIALIZED",
  PROPOSAL_CREATED = "PROPOSAL_CREATED",
  PROPOSAL_APPROVED = "PROPOSAL_APPROVED",
  PROPOSAL_ABSTAINED = "PROPOSAL_ABSTAINED",
  PROPOSAL_READY = "PROPOSAL_READY",
  PROPOSAL_EXECUTED = "PROPOSAL_EXECUTED",
  PROPOSAL_EXPIRED = "PROPOSAL_EXPIRED",
  PROPOSAL_CANCELLED = "PROPOSAL_CANCELLED",
  PROPOSAL_REJECTED = "PROPOSAL_REJECTED",
  ROLE_ASSIGNED = "ROLE_ASSIGNED",
  CONFIG_UPDATED = "CONFIG_UPDATED",
  UNKNOWN = "UNKNOWN",
}

/**
 * Metadata shared by all normalized events.
 */
export interface EventMetadata {
  readonly id: string;
  readonly contractId: string;
  readonly ledger: number;
  readonly ledgerClosedAt: string;
}

/**
 * The base structure for all normalized events.
 */
export interface NormalizedEvent<T = any> {
  readonly type: EventType;
  readonly data: T;
  readonly metadata: EventMetadata;
}

/**
 * Specific payload for Proposal Created event.
 */
export interface ProposalCreatedData {
  readonly proposalId: string;
  readonly proposer: string;
  readonly recipient: string;
  readonly token: string;
  readonly amount: string;
  readonly insuranceAmount: string;
}

/**
 * Specific payload for Proposal Executed event.
 */
export interface ProposalExecutedData {
  readonly proposalId: string;
  readonly executor: string;
  readonly recipient: string;
  readonly token: string;
  readonly amount: string;
  readonly ledger: number;
}

/**
 * Map of contract event topics to internal NormalizedEvent types.
 */
export const CONTRACT_EVENT_MAP: Record<string, EventType> = {
  initialized: EventType.INITIALIZED,
  proposal_created: EventType.PROPOSAL_CREATED,
  proposal_approved: EventType.PROPOSAL_APPROVED,
  proposal_abstained: EventType.PROPOSAL_ABSTAINED,
  proposal_ready: EventType.PROPOSAL_READY,
  proposal_executed: EventType.PROPOSAL_EXECUTED,
  proposal_expired: EventType.PROPOSAL_EXPIRED,
  proposal_cancelled: EventType.PROPOSAL_CANCELLED,
  proposal_rejected: EventType.PROPOSAL_REJECTED,
  role_assigned: EventType.ROLE_ASSIGNED,
  config_updated: EventType.CONFIG_UPDATED,
};
