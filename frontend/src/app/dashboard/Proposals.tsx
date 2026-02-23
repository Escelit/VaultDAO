import React, { useState, useMemo } from 'react';
import { useWallet } from '../../context/WalletContext';
import { useVaultContract } from '../../hooks/useVaultContract';
import ConfirmationModal from '../../components/ConfirmationModal';
import AdvancedSearch from '../../components/AdvancedSearch';
import { fuzzySearch, applyFilters, highlightMatch } from '../../utils/search';
import type { FilterValue } from '../../components/SearchFilters';
import type { FilterFieldConfig } from '../../components/SearchFilters';

interface Proposal {
    id: number;
    proposer: string;
    recipient: string;
    amount: string;
    token: string;
    memo: string;
    status: 'Pending' | 'Approved' | 'Executed' | 'Rejected' | 'Expired';
    approvals: number;
    threshold: number;
    createdAt: string;
}

const PROPOSAL_FILTER_FIELDS: FilterFieldConfig[] = [
  { key: 'status', label: 'Status', type: 'select', options: [
    { value: 'Pending', label: 'Pending' },
    { value: 'Approved', label: 'Approved' },
    { value: 'Executed', label: 'Executed' },
    { value: 'Rejected', label: 'Rejected' },
    { value: 'Expired', label: 'Expired' },
  ]},
  { key: 'token', label: 'Token', type: 'select', options: [
    { value: 'USDC', label: 'USDC' },
    { value: 'XLM', label: 'XLM' },
  ]},
  { key: 'amount', label: 'Amount', type: 'number_range' },
  { key: 'createdAt', label: 'Created', type: 'date_range' },
];

// Mock data for demonstration
const mockProposals: Proposal[] = [
    {
        id: 1,
        proposer: 'GABC...XYZ1',
        recipient: 'GDEF...ABC2',
        amount: '1000',
        token: 'USDC',
        memo: 'Marketing budget',
        status: 'Pending',
        approvals: 1,
        threshold: 3,
        createdAt: '2024-02-15',
    },
    {
        id: 2,
        proposer: 'GABC...XYZ1',
        recipient: 'GHIJ...DEF3',
        amount: '500',
        token: 'XLM',
        memo: 'Development costs',
        status: 'Approved',
        approvals: 3,
        threshold: 3,
        createdAt: '2024-02-14',
    },
];

const Proposals: React.FC = () => {
    const { address, isConnected } = useWallet();
    const { rejectProposal, loading } = useVaultContract();
    const [proposals, setProposals] = useState<Proposal[]>(mockProposals);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterValues, setFilterValues] = useState<FilterValue[]>([]);
    const [selectedProposal, setSelectedProposal] = useState<number | null>(null);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const searchKeys: (keyof Proposal)[] = ['proposer', 'recipient', 'memo', 'token', 'amount', 'status', 'createdAt'];
    const filterFieldSet = useMemo(() => new Set(PROPOSAL_FILTER_FIELDS.map((f) => f.key)), []);

    const filteredProposals = useMemo(() => {
        const asRecords = proposals.map((p) => ({
            id: p.id,
            proposer: p.proposer,
            recipient: p.recipient,
            amount: p.amount,
            token: p.token,
            memo: p.memo,
            status: p.status,
            approvals: p.approvals,
            threshold: p.threshold,
            createdAt: p.createdAt,
        }));
        const fuzzy = fuzzySearch(asRecords, searchQuery, searchKeys, { threshold: 0.4 });
        return applyFilters(fuzzy, filterValues, filterFieldSet).map((r) => proposals.find((p) => p.id === r.id)!).filter(Boolean);
    }, [proposals, searchQuery, filterValues, filterFieldSet]);

    // Mock user role - in production, fetch from contract
    const userRole = 'Admin'; // or 'Treasurer' or 'None'

    const canRejectProposal = (proposal: Proposal): boolean => {
        if (!isConnected || !address) {
            // For demo purposes, allow rejection even without wallet connection
            // In production, this should return false
            return true;
        }
        // User can reject if they are the proposer or an admin
        return proposal.proposer === address || userRole === 'Admin';
    };

    const handleRejectClick = (proposalId: number) => {
        setSelectedProposal(proposalId);
        setShowRejectModal(true);
    };

    const handleRejectConfirm = async (reason?: string) => {
        if (selectedProposal === null) return;

        try {
            // Call contract to reject proposal
            const txHash = await rejectProposal(selectedProposal);
            
            // Update local state
            setProposals(prev =>
                prev.map(p =>
                    p.id === selectedProposal
                        ? { ...p, status: 'Rejected' as const }
                        : p
                )
            );

            // Show success toast
            setToast({
                message: `Proposal #${selectedProposal} rejected successfully`,
                type: 'success',
            });

            console.log('Rejection reason:', reason);
            console.log('Transaction hash:', txHash);
        } catch (error: any) {
            // Show error toast
            setToast({
                message: error.message || 'Failed to reject proposal',
                type: 'error',
            });
        } finally {
            setShowRejectModal(false);
            setSelectedProposal(null);
        }
    };

    const handleRejectCancel = () => {
        setShowRejectModal(false);
        setSelectedProposal(null);
    };

    // Auto-hide toast after 5 seconds
    React.useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const getStatusColor = (status: Proposal['status']) => {
        switch (status) {
            case 'Pending':
                return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
            case 'Approved':
                return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'Executed':
                return 'bg-green-500/10 text-green-400 border-green-500/20';
            case 'Rejected':
                return 'bg-red-500/10 text-red-400 border-red-500/20';
            case 'Expired':
                return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
            default:
                return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <h2 className="text-3xl font-bold">Proposals</h2>
                <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium min-h-[44px] sm:min-h-0">
                    New Proposal
                </button>
            </div>

            <AdvancedSearch<Record<string, unknown>>
                value={searchQuery}
                onChange={setSearchQuery}
                filterFields={PROPOSAL_FILTER_FIELDS}
                filterValues={filterValues}
                onFilterChange={setFilterValues}
                results={filteredProposals.map((p) => ({
                    id: p.id,
                    proposer: p.proposer,
                    recipient: p.recipient,
                    amount: p.amount,
                    token: p.token,
                    memo: p.memo,
                    status: p.status,
                    createdAt: p.createdAt,
                }))}
                exportFilename="proposals-search-results.csv"
                placeholder="Search proposals by memo, recipient, token…"
            />

            {/* Toast Notification */}
            {toast && (
                <div
                    className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg border ${
                        toast.type === 'success'
                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <span>{toast.message}</span>
                        <button
                            onClick={() => setToast(null)}
                            className="text-gray-400 hover:text-white"
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}

            {/* Proposals List */}
            <div className="space-y-4">
                {filteredProposals.length === 0 ? (
                    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                        <div className="p-8 text-center text-gray-400">
                            <p>No proposals found.</p>
                        </div>
                    </div>
                ) : (
                    filteredProposals.map((proposal) => (
                        <div
                            key={proposal.id}
                            className="bg-gray-800 rounded-xl border border-gray-700 p-4 sm:p-6"
                        >
                            {/* Mobile Layout */}
                            <div className="space-y-4">
                                {/* Header Row */}
                                <div className="flex justify-between items-start gap-4">
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">
                                            Proposal #{proposal.id}
                                        </h3>
                                        <p
                                            className="text-sm text-gray-400 mt-1"
                                            dangerouslySetInnerHTML={{
                                                __html: highlightMatch(proposal.memo, searchQuery),
                                            }}
                                        />
                                    </div>
                                    <span
                                        className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                            proposal.status
                                        )}`}
                                    >
                                        {proposal.status}
                                    </span>
                                </div>

                                {/* Details Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-gray-400">Amount:</span>
                                        <span className="text-white ml-2 font-medium">
                                            {proposal.amount} {proposal.token}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400">Approvals:</span>
                                        <span className="text-white ml-2 font-medium">
                                            {proposal.approvals}/{proposal.threshold}
                                        </span>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <span className="text-gray-400">Recipient:</span>
                                        <span
                                            className="text-white ml-2 font-mono text-xs"
                                            dangerouslySetInnerHTML={{
                                                __html: highlightMatch(proposal.recipient, searchQuery),
                                            }}
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <span className="text-gray-400">Proposer:</span>
                                        <span
                                            className="text-white ml-2 font-mono text-xs"
                                            dangerouslySetInnerHTML={{
                                                __html: highlightMatch(proposal.proposer, searchQuery),
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <span className="text-gray-400">Created:</span>
                                        <span className="text-white ml-2">
                                            {proposal.createdAt}
                                        </span>
                                    </div>
                                </div>

                                {/* Actions */}
                                {proposal.status === 'Pending' && (
                                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                        <button className="flex-1 sm:flex-none bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 sm:py-2 rounded-lg font-medium transition-colors min-h-[44px] sm:min-h-0">
                                            Approve
                                        </button>
                                        {canRejectProposal(proposal) && (
                                            <button
                                                onClick={() => handleRejectClick(proposal.id)}
                                                disabled={loading}
                                                className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 text-white px-6 py-3 sm:py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] sm:min-h-0"
                                            >
                                                {loading && selectedProposal === proposal.id
                                                    ? 'Rejecting...'
                                                    : 'Reject'}
                                            </button>
                                        )}
                                    </div>
                                )}

                                {proposal.status === 'Approved' && (
                                    <button className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-6 py-3 sm:py-2 rounded-lg font-medium transition-colors min-h-[44px] sm:min-h-0">
                                        Execute
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={showRejectModal}
                title="Reject Proposal"
                message="Are you sure you want to reject this proposal? This action is permanent and cannot be undone."
                confirmText="Reject Proposal"
                cancelText="Cancel"
                onConfirm={handleRejectConfirm}
                onCancel={handleRejectCancel}
                showReasonInput={true}
                reasonPlaceholder="Enter rejection reason (optional)"
                isDestructive={true}
            />
        </div>
    );
};

export default Proposals;
