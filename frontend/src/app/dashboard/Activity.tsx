import React, { useState, useMemo } from 'react';
import type { ActivityLike } from '../../types/analytics';
import AdvancedSearch from '../../components/AdvancedSearch';
import { fuzzySearch, applyFilters, highlightMatch } from '../../utils/search';
import type { FilterValue } from '../../components/SearchFilters';
import type { FilterFieldConfig } from '../../components/SearchFilters';

function getMockActivities(): ActivityLike[] {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const activities: ActivityLike[] = [];
  const signers = ['GAAA...1111', 'GBBB...2222', 'GCCC...3333'];
  const recipients = ['GDEF...ABC1', 'GHIJ...DEF2', 'GKLM...GHI3'];
  for (let i = 0; i < 30; i++) {
    const d = new Date(now - (29 - i) * day);
    if (i % 3 === 0) {
      activities.push({
        id: `c-${i}`,
        type: 'proposal_created',
        timestamp: d.toISOString(),
        actor: signers[i % signers.length],
        details: { ledger: String(i), amount: 100 * (i + 1), recipient: recipients[i % 3] },
      });
    }
    if (i % 2 === 0 && i > 0) {
      activities.push({
        id: `a-${i}`,
        type: 'proposal_approved',
        timestamp: new Date(d.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        actor: signers[(i + 1) % signers.length],
        details: { ledger: String(i - 1), approval_count: 1, threshold: 2 },
      });
    }
    if (i % 4 === 0 && i >= 2) {
      activities.push({
        id: `e-${i}`,
        type: 'proposal_executed',
        timestamp: new Date(d.getTime() + 5 * 60 * 60 * 1000).toISOString(),
        actor: signers[0],
        details: { amount: 500 + i * 10, recipient: recipients[i % 3] },
      });
    }
    if (i === 5 || i === 12) {
      activities.push({
        id: `r-${i}`,
        type: 'proposal_rejected',
        timestamp: d.toISOString(),
        actor: signers[2],
        details: {},
      });
    }
  }
  return activities;
}

type ActivityRecord = ActivityLike & { detailsStr: string; date: string };

const ACTIVITY_FILTER_FIELDS: FilterFieldConfig[] = [
  {
    key: 'type',
    label: 'Type',
    type: 'select',
    options: [
      { value: 'proposal_created', label: 'Proposal created' },
      { value: 'proposal_approved', label: 'Proposal approved' },
      { value: 'proposal_executed', label: 'Proposal executed' },
      { value: 'proposal_rejected', label: 'Proposal rejected' },
    ],
  },
  { key: 'date', label: 'Date', type: 'date_range' },
  { key: 'actor', label: 'Actor', type: 'text', placeholder: 'Filter by signer' },
];

const Activity: React.FC = () => {
  const [activities] = useState<ActivityLike[]>(() => getMockActivities());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValues, setFilterValues] = useState<FilterValue[]>([]);

  const records: ActivityRecord[] = useMemo(
    () =>
      activities.map((a) => ({
        ...a,
        detailsStr: JSON.stringify(a.details),
        date: a.timestamp.slice(0, 10),
      })),
    [activities]
  );

  const searchKeys = ['type', 'actor', 'timestamp', 'detailsStr'] as (keyof ActivityRecord)[];
  const filterFieldSet = useMemo(() => new Set(ACTIVITY_FILTER_FIELDS.map((f) => f.key)), []);

  const filteredActivities = useMemo(() => {
    const fuzzy = fuzzySearch(records, searchQuery, searchKeys, { threshold: 0.4 });
    return applyFilters(
      fuzzy as unknown as Record<string, unknown>[],
      filterValues,
      filterFieldSet
    ) as unknown as ActivityRecord[];
  }, [records, searchQuery, filterValues, filterFieldSet]);

  const formatType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Activity</h2>
        <p className="text-gray-400 mt-1">Search and filter vault transactions and events.</p>
      </div>

      <AdvancedSearch<Record<string, unknown>>
        value={searchQuery}
        onChange={setSearchQuery}
        filterFields={ACTIVITY_FILTER_FIELDS}
        filterValues={filterValues}
        onFilterChange={setFilterValues}
        results={filteredActivities.map((a) => ({
          id: a.id,
          type: a.type,
          actor: a.actor,
          timestamp: a.timestamp,
          details: a.detailsStr,
        }))}
        exportFilename="activity-search-results.csv"
        placeholder="Search by type, actor, or details…"
      />

      <div className="space-y-4">
        {filteredActivities.length === 0 ? (
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="p-8 text-center text-gray-400">
              <p>No activity found.</p>
            </div>
          </div>
        ) : (
          filteredActivities.map((activity) => (
            <div
              key={activity.id}
              className="bg-gray-800 rounded-xl border border-gray-700 p-4 sm:p-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <span
                    className="inline-block px-2 py-1 rounded text-sm font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30"
                    dangerouslySetInnerHTML={{
                      __html: highlightMatch(formatType(activity.type), searchQuery),
                    }}
                  />
                  <p className="text-sm text-gray-400 mt-1">
                    <span
                      className="text-white font-mono"
                      dangerouslySetInnerHTML={{
                        __html: highlightMatch(activity.actor, searchQuery),
                      }}
                    />
                    {' · '}
                    {new Date(activity.timestamp).toLocaleString()}
                  </p>
                </div>
                {Object.keys(activity.details).length > 0 && (
                  <pre className="text-xs text-gray-500 bg-gray-900/50 p-2 rounded overflow-x-auto max-w-full">
                    {JSON.stringify(activity.details)}
                  </pre>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Activity;
