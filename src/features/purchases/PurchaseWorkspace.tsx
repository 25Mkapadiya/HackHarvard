import { resolveVisitEvidence } from '../sustainability/adapters/visits';
import { EvidenceDetails } from '../sustainability/EvidenceDetails';
import { SustainabilityDashboard } from '../sustainability/SustainabilityDashboard';
import { useEffect, useState } from 'react';
import { PurchaseEntry, type PurchaseMarket } from './PurchaseEntry';
import { demoPurchases, type PurchaseRepository } from './repository';
import type { Visit } from './model';
export function PurchaseWorkspace({
  markets,
  repository = demoPurchases,
}: {
  markets: PurchaseMarket[];
  repository?: PurchaseRepository;
}) {
  const [loaded, setLoaded] = useState<{ repository: PurchaseRepository; visits: Visit[] } | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [scenarioId, setScenarioId] = useState('');
  const currentVisits = loaded?.repository === repository ? loaded.visits : [];
  const collection = resolveVisitEvidence(currentVisits, markets, scenarioId || undefined);
  useEffect(() => {
    let active = true;
    repository.list().then(
      (v) => {
        if (active) {
          setLoaded({ repository, visits: v });
          setError('');
        }
      },
      () => {
        if (active) setError('Could not load purchase records.');
      },
    );
    return () => {
      active = false;
    };
  }, [repository, revision]);
  return (
    <div className="space-y-5">
      <PurchaseEntry markets={markets} repository={repository} onRecorded={() => setRevision((r) => r + 1)} />
      {error && <p role="alert">{error}</p>}
      {!error && loaded?.repository === repository ? (
        <>
          <EvidenceDetails scenarioId={scenarioId} onScenarioChange={setScenarioId} collection={collection} />
          <SustainabilityDashboard
            visits={loaded.visits}
            markets={markets}
            evidence={collection.impact}
            comparisonBasis={scenarioId ? 'modeled-scenario' : 'actual-observed'}
          />
        </>
      ) : (
        !error && <p role="status">Loading purchase records…</p>
      )}
      <button
        className="btn-secondary"
        onClick={async () => {
          try {
            await repository.clear();
            setRevision((r) => r + 1);
          } catch {
            setError('Could not clear purchase records.');
          }
        }}
      >
        Clear purchase records
      </button>
    </div>
  );
}
