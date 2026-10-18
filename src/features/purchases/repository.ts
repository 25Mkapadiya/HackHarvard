import { validateNewVisit, visitFingerprint, type Visit, type VisitInput, type NewVisitInput } from './model';
export type SubmitResult = { status: 'submitted' | 'duplicate'; visit: Visit };
export type DeleteResult = { status: 'deleted' | 'not-found' };
export type RepositoryErrorCode = 'session-expired' | 'forbidden' | 'unavailable';
/** Safe machine-readable errors; never expose raw server messages or credentials. */
export class PurchaseRepositoryError extends Error {
  constructor(readonly code: RepositoryErrorCode) {
    super(code);
    this.name = 'PurchaseRepositoryError';
  }
}
export const isExpiredSession = (error: unknown) =>
  error instanceof PurchaseRepositoryError && error.code === 'session-expired';
/** Always bound to one verified session by the backend owner; no client owner-ID parameter. */
export interface PurchaseRepository {
  readonly persistence: 'memory' | 'authenticated';
  list(): Promise<Visit[]>;
  get(submissionId: string): Promise<Visit | null>;
  submit(input: NewVisitInput): Promise<SubmitResult>;
  delete(submissionId: string): Promise<DeleteResult>;
  clear(): Promise<void>;
}
/** Return null while signed out/expired. Provide a fresh repository on every session transition. */
export interface PurchaseSession {
  purchases(): Promise<PurchaseRepository | null>;
}
function payloadFingerprint(visit: VisitInput): string {
  return JSON.stringify([
    visitFingerprint(visit),
    visit.items
      .map((i) => [i.id, i.productId ?? null, i.vendor ?? null, i.origin ?? null])
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
  ]);
}
/** Development fallback only: no localStorage, uploads, account identity or durable security. */
export class MemoryPurchaseRepository implements PurchaseRepository {
  readonly persistence = 'memory' as const;
  private visits: Visit[] = [];
  private submissions = new Map<string, { payload: string | null; visitId: string }>();
  constructor(private readonly clock = () => new Date()) {}
  async list(): Promise<Visit[]> {
    return structuredClone(
      [...this.visits].sort(
        (a, b) => a.submittedAt.localeCompare(b.submittedAt) || a.submissionId.localeCompare(b.submissionId),
      ),
    );
  }
  async get(submissionId: string): Promise<Visit | null> {
    return structuredClone(this.visits.find((v) => v.submissionId === submissionId) ?? null);
  }
  async submit(input: NewVisitInput): Promise<SubmitResult> {
    const parsed = validateNewVisit(input, this.clock());
    const receipt = this.submissions.get(parsed.submissionId);
    if (receipt) {
      if (receipt.payload === null)
        throw new Error('This submission was deleted. Start a new visit to record it again.');
      if (receipt.payload !== payloadFingerprint(parsed))
        throw new Error('Submission key already used for different information');
      const saved = this.visits.find((v) => v.submissionId === receipt.visitId);
      if (!saved) throw new Error('This submission was deleted. Start a new visit to record it again.');
      return { status: 'duplicate', visit: structuredClone(saved) };
    }
    const existing = this.visits.find((v) => visitFingerprint(v) === visitFingerprint(parsed));
    if (existing) {
      this.submissions.set(parsed.submissionId, {
        payload: payloadFingerprint(parsed),
        visitId: existing.submissionId,
      });
      return { status: 'duplicate', visit: structuredClone(existing) };
    }
    const visit: Visit = { ...parsed, submittedAt: this.clock().toISOString() };
    this.visits.push(structuredClone(visit));
    this.submissions.set(parsed.submissionId, {
      payload: payloadFingerprint(parsed),
      visitId: visit.submissionId,
    });
    return { status: 'submitted', visit: structuredClone(visit) };
  }
  async delete(submissionId: string): Promise<DeleteResult> {
    if (!this.visits.some((v) => v.submissionId === submissionId)) return { status: 'not-found' };
    this.visits = this.visits.filter((v) => v.submissionId !== submissionId);
    for (const receipt of this.submissions.values())
      if (receipt.visitId === submissionId) receipt.payload = null;
    return { status: 'deleted' };
  }
  async clear(): Promise<void> {
    for (const receipt of this.submissions.values()) receipt.payload = null;
    this.visits = [];
  }
}
export const demoPurchases = new MemoryPurchaseRepository();
