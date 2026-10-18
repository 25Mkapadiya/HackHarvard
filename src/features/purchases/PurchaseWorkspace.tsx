import { resolveVisitEvidence } from '../sustainability/adapters/visits';
import { EvidenceDetails } from '../sustainability/EvidenceDetails';
import { SustainabilityDashboard } from '../sustainability/SustainabilityDashboard';
import { useEffect, useState } from 'react';
import { PurchaseEntry, type PurchaseMarket } from './PurchaseEntry';
import { demoPurchases, isExpiredSession, type PurchaseRepository } from './repository';
import type { Visit } from './model';
const repositoryKeys = new WeakMap<PurchaseRepository, number>();
let nextRepositoryKey = 0;
/** Repository identity is a private-state boundary, not an authentication/authorization check. */
export function PurchaseWorkspace({
  markets,
  repository = demoPurchases,
}: {
  markets: PurchaseMarket[];
  repository?: PurchaseRepository | null;
}) {
  if (repository === null)
    return (
      <p role="status">
        Purchase history is unavailable without an active connection. No private purchase information is
        displayed.
      </p>
    );
  if (!repositoryKeys.has(repository)) repositoryKeys.set(repository, ++nextRepositoryKey);
  return (
    <RepositoryWorkspace key={repositoryKeys.get(repository)} markets={markets} repository={repository} />
  );
}
function RepositoryWorkspace({
  markets,
  repository,
}: {
  markets: PurchaseMarket[];
  repository: PurchaseRepository;
}) {
  const [loaded, setLoaded] = useState<{ repository: PurchaseRepository; visits: Visit[] } | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [scenarioId, setScenarioId] = useState('');
  const [expired, setExpired] = useState(false);
  const [clearing, setClearing] = useState(false);
  function expire() {
    setLoaded(null);
    setScenarioId('');
    setExpired(true);
  }
  const currentVisits = loaded?.repository === repository ? loaded.visits : [];
  const collection = resolveVisitEvidence(currentVisits, markets, scenarioId || undefined);
  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(() => repository.list())
      .then(
        (v) => {
          if (active) {
            setLoaded({ repository, visits: v });
            setError('');
          }
        },
        (err) => {
          if (active) {
            if (isExpiredSession(err)) expire();
            else
              setError(
                'Could not load purchase records. Your purchase entry is kept; retry loading history.',
              );
          }
        },
      );
    return () => {
      active = false;
    };
  }, [repository, revision]);
  if (expired)
    return (
      <p role="alert">
        Your purchase session expired. Private history, draft and scenario selection were cleared from this
        view. Reconnect through the account system to continue.
      </p>
    );
  return (
    <div className="space-y-5">
      <PurchaseEntry
        markets={markets}
        repository={repository}
        onRecorded={() => setRevision((r) => r + 1)}
        onSessionExpired={expire}
      />
      {error && (
        <div>
          <p role="alert">{error}</p>
          <button
            className="btn-secondary"
            onClick={() => {
              setError('');
              setLoaded(null);
              setRevision((r) => r + 1);
            }}
          >
            Retry loading history
          </button>
        </div>
      )}
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
        disabled={clearing}
        onClick={async () => {
          setClearing(true);
          try {
            await repository.clear();
            setRevision((r) => r + 1);
          } catch (err) {
            if (isExpiredSession(err)) expire();
            else setError('Could not clear purchase records. Your entry is kept; retry when ready.');
          } finally {
            setClearing(false);
          }
        }}
      >
        Clear purchase records
      </button>
    </div>
  );
}
