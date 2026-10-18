import { validateVisit, visitFingerprint, type Visit, type VisitInput } from './model';
export type SubmitResult = { status: 'submitted' | 'duplicate'; visit: Visit };
export interface PurchaseRepository {
  readonly persistence: 'memory' | 'authenticated';
  list(): Promise<Visit[]>;
  submit(input: VisitInput): Promise<SubmitResult>;
  clear(): Promise<void>;
}
/** Integration seam only. The auth owner supplies a session-bound, RLS-backed repository. */
export interface PurchaseSession {
  purchases(): Promise<PurchaseRepository | null>;
}
/** Never stores data in the public demo store, localStorage, a URL, or an account. */
export class MemoryPurchaseRepository implements PurchaseRepository {
  readonly persistence = 'memory' as const;
  private visits: Visit[] = [];
  constructor(private readonly clock = () => new Date()) {}
  async list(): Promise<Visit[]> {
    return structuredClone(this.visits);
  }
  async submit(input: VisitInput): Promise<SubmitResult> {
    const parsed = validateVisit(input, this.clock());
    const sameKey = this.visits.find((v) => v.submissionId === parsed.submissionId);
    if (sameKey && visitFingerprint(sameKey) !== visitFingerprint(parsed))
      throw new Error('Submission key already used for different information');
    const existing = sameKey ?? this.visits.find((v) => visitFingerprint(v) === visitFingerprint(parsed));
    if (existing) return { status: 'duplicate', visit: structuredClone(existing) };
    const visit: Visit = { ...parsed, submittedAt: this.clock().toISOString() };
    this.visits.push(structuredClone(visit));
    return { status: 'submitted', visit: structuredClone(visit) };
  }
  async clear(): Promise<void> {
    this.visits = [];
  }
}
export const demoPurchases = new MemoryPurchaseRepository();
