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
  const [visits, setVisits] = useState<Visit[]>([]);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    repository.list().then(
      (v) => {
        if (active) {
          setVisits(v);
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
      <p>{visits.length} submitted visits in this repository.</p>
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
