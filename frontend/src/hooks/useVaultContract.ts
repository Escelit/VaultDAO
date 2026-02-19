import { useState } from 'react';
import {
    xdr,
    Address,
    Operation,
    TransactionBuilder,
    SorobanRpc,
    nativeToScVal,
    scValToNative
} from 'stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';
import { useWallet } from '../context/WalletContext';
import { parseError } from '../utils/errorParser';
import type { VaultActivity, VaultEventsFilters, GetVaultEventsResult, VaultEventType } from '../types/activity';

// Replace with your actual Contract ID
const CONTRACT_ID = "CDXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
const RPC_URL = "https://soroban-testnet.stellar.org";
const EVENTS_PAGE_SIZE = 20;

const server = new SorobanRpc.Server(RPC_URL);

/** Known contract event names (topic[0] symbol) */
const EVENT_SYMBOLS: VaultEventType[] = [
    'proposal_created', 'proposal_approved', 'proposal_ready', 'proposal_executed',
    'proposal_rejected', 'signer_added', 'signer_removed', 'config_updated', 'initialized', 'role_assigned'
];

function getEventTypeFromTopic(topic0Base64: string): VaultEventType {
    try {
        const scv = xdr.ScVal.fromXDR(topic0Base64, 'base64');
        const native = scValToNative(scv);
        if (typeof native === 'string' && EVENT_SYMBOLS.includes(native as VaultEventType)) {
            return native as VaultEventType;
        }
        return 'unknown';
    } catch {
        return 'unknown';
    }
}

function addressFromScVal(scv: xdr.ScVal): string {
    try {
        const native = scValToNative(scv);
        if (typeof native === 'object' && native && 'address' in native) {
            const addr = (native as { address: () => string }).address?.() ?? String(native);
            return addr;
        }
        if (typeof native === 'string') return native;
        return '';
    } catch {
        return '';
    }
}

function parseEventValue(valueXdrBase64: string, eventType: VaultEventType): { actor: string; details: Record<string, unknown> } {
    const details: Record<string, unknown> = {};
    let actor = '';
    try {
        const scv = xdr.ScVal.fromXDR(valueXdrBase64, 'base64');
        const native = scValToNative(scv);
        if (Array.isArray(native)) {
            const vec = native as unknown[];
            if (eventType === 'proposal_created' && vec.length >= 3) {
                actor = addressFromScVal(xdr.ScVal.fromXDR(Buffer.from(JSON.stringify(vec[0])).toString('base64'), 'base64'));
                details.proposer = actor;
                details.recipient = vec[1] != null ? String(vec[1]) : '';
                details.amount = vec[2] != null ? String(vec[2]) : '';
            } else if (eventType === 'proposal_approved' && vec.length >= 3) {
                actor = vec[0] != null ? String(vec[0]) : '';
                details.approval_count = vec[1];
                details.threshold = vec[2];
            } else if (eventType === 'proposal_executed' && vec.length >= 3) {
                actor = vec[0] != null ? String(vec[0]) : '';
                details.recipient = vec[1];
                details.amount = vec[2];
            } else if (eventType === 'proposal_rejected' && vec.length >= 1) {
                actor = vec[0] != null ? String(vec[0]) : '';
            } else if ((eventType === 'signer_added' || eventType === 'signer_removed') && vec.length >= 2) {
                actor = vec[0] != null ? String(vec[0]) : '';
                details.total_signers = vec[1];
            } else if (eventType === 'config_updated' || eventType === 'initialized') {
                actor = vec[0] != null ? String(vec[0]) : '';
            } else if (eventType === 'role_assigned' && vec.length >= 2) {
                actor = vec[0] != null ? String(vec[0]) : '';
                details.role = vec[1];
            } else {
                actor = vec[0] != null ? String(vec[0]) : '';
                details.raw = native;
            }
        } else if (native !== null && typeof native === 'object') {
            details.raw = native;
        }
    } catch {
        details.parseError = true;
    }
    return { actor, details };
}

/** Raw event from getEvents RPC */
interface RawEvent {
    type: string;
    ledger: string;
    ledgerClosedAt?: string;
    contractId?: string;
    id: string;
    pagingToken?: string;
    inSuccessfulContractCall?: boolean;
    topic?: string[];
    value?: { xdr: string };
}

export const useVaultContract = () => {
    const { address, isConnected } = useWallet();
    const [loading, setLoading] = useState(false);

    const proposeTransfer = async (
        recipient: string,
        token: string,
        amount: string, // passed as string to handle large numbers safely
        memo: string
    ) => {
        if (!isConnected || !address) {
            throw new Error("Wallet not connected");
        }

        setLoading(true);
        try {
            // 1. Get latest ledger/account data
            const account = await server.getAccount(address);

            // 2. Build Transaction
            const tx = new TransactionBuilder(account, { fee: "100" })
                .setNetworkPassphrase(NETWORK_PASSPHRASE)
                .setTimeout(30)
                .addOperation(Operation.invokeHostFunction({
                    func: xdr.HostFunction.hostFunctionTypeInvokeContract(
                        new xdr.InvokeContractArgs({
                            contractAddress: Address.fromString(CONTRACT_ID).toScAddress(),
                            functionName: "propose_transfer",
                            args: [
                                new Address(address).toScVal(),
                                new Address(recipient).toScVal(),
                                new Address(token).toScVal(),
                                nativeToScVal(BigInt(amount)),
                                xdr.ScVal.scvSymbol(memo),
                            ],
                        })
                    ),
                    auth: [],
                }))
                .build();

            // 3. Simulate Transaction (Check required Auth)
            const simulation = await server.simulateTransaction(tx);
            if (SorobanRpc.Api.isSimulationError(simulation)) {
                throw new Error(`Simulation Failed: ${simulation.error}`);
            }

            // Assemble transaction with simulation data (resources/auth)
            const preparedTx = SorobanRpc.assembleTransaction(tx, simulation).build();

            // 4. Sign with Freighter
            const signedXdr = await signTransaction(preparedTx.toXDR(), {
                network: "TESTNET",
            });

            // 5. Submit Transaction
            const response = await server.sendTransaction(TransactionBuilder.fromXDR(signedXdr as string, NETWORK_PASSPHRASE));

            if (response.status !== "PENDING") {
                throw new Error("Transaction submission failed");
            }

            // 6. Poll for status (Simplified)
            // Real app should loop check status
            return response.hash;

        } catch (e: any) {
            // Parse Error
            const parsed = parseError(e);
            throw parsed;
        } finally {
            setLoading(false);
        }
    };

    const rejectProposal = async (proposalId: number) => {
        if (!isConnected || !address) {
            throw new Error("Wallet not connected");
        }

        setLoading(true);
        try {
            // 1. Get latest ledger/account data
            const account = await server.getAccount(address);

            // 2. Build Transaction
            const tx = new TransactionBuilder(account, { fee: "100" })
                .setNetworkPassphrase(NETWORK_PASSPHRASE)
                .setTimeout(30)
                .addOperation(Operation.invokeHostFunction({
                    func: xdr.HostFunction.hostFunctionTypeInvokeContract(
                        new xdr.InvokeContractArgs({
                            contractAddress: Address.fromString(CONTRACT_ID).toScAddress(),
                            functionName: "reject_proposal",
                            args: [
                                new Address(address).toScVal(),
                                nativeToScVal(BigInt(proposalId), { type: "u64" }),
                            ],
                        })
                    ),
                    auth: [],
                }))
                .build();

            // 3. Simulate Transaction
            const simulation = await server.simulateTransaction(tx);
            if (SorobanRpc.Api.isSimulationError(simulation)) {
                throw new Error(`Simulation Failed: ${simulation.error}`);
            }

            // Assemble transaction with simulation data
            const preparedTx = SorobanRpc.assembleTransaction(tx, simulation).build();

            // 4. Sign with Freighter
            const signedXdr = await signTransaction(preparedTx.toXDR(), {
                network: "TESTNET",
            });

            // 5. Submit Transaction
            const response = await server.sendTransaction(TransactionBuilder.fromXDR(signedXdr as string, NETWORK_PASSPHRASE));

            if (response.status !== "PENDING") {
                throw new Error("Transaction submission failed");
            }

            return response.hash;

        } catch (e: any) {
            const parsed = parseError(e);
            throw parsed;
        } finally {
            setLoading(false);
        }
    };

    return {
        proposeTransfer,
        rejectProposal,
        loading
    };
};
