import { useEffect, useRef, useState } from 'react';
import { ImageInput } from './ImageInput';
import {
  recognizeProducts,
  unavailableRecognition,
  type ProductRecognitionProvider,
  type SuggestedProduct,
} from './recognition';
import { extractReceipt, unavailableReceiptExtraction, type ReceiptExtractionProvider } from './receipt';
import { suggestionDraft, type DraftItem } from './draft';
type Suggestions = {
  products: (SuggestedProduct & { priceCents?: number | null })[];
  totalCents?: number | null;
  uncertainty: string[];
};
export function PurchaseAssistance({
  kind,
  onAdd,
  onTotal,
  recognition = unavailableRecognition,
  receipt = unavailableReceiptExtraction,
}: {
  kind: 'photo' | 'receipt';
  onAdd: (item: DraftItem) => boolean;
  onTotal: (total: string) => void;
  recognition?: ProductRecognitionProvider;
  receipt?: ReceiptExtractionProvider;
}) {
  const [image, setImage] = useState<File | null>(null);
  const [result, setResult] = useState<Suggestions | null>(null);
  const [added, setAdded] = useState<number[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const request = useRef<AbortController | null>(null);
  const available = kind === 'photo' ? recognition.available : receipt.available;
  useEffect(() => () => request.current?.abort(), []);
  function changeImage(file: File | null) {
    request.current?.abort();
    request.current = null;
    setImage(file);
    setResult(null);
    setAdded([]);
    setMessage('');
    setBusy(false);
  }
  async function processImage() {
    if (!image || !available || busy) return;
    const controller = new AbortController();
    request.current?.abort();
    request.current = controller;
    setBusy(true);
    setMessage('');
    setResult(null);
    setAdded([]);
    try {
      const input = { image, signal: controller.signal };
      const response =
        kind === 'photo' ? await recognizeProducts(recognition, input) : await extractReceipt(receipt, input);
      if (request.current !== controller || controller.signal.aborted) return;
      if (response.status === 'unavailable')
        setMessage('Automatic processing is unavailable. Enter your purchases manually below.');
      else {
        setResult(response);
        setMessage('Suggestions need your review. Nothing has been added to your visit.');
      }
    } catch {
      if (request.current === controller && !controller.signal.aborted)
        setMessage(
          'Could not process this image. Your existing entries are unchanged. Enter or check them manually below.',
        );
    } finally {
      if (request.current === controller && !controller.signal.aborted) setBusy(false);
    }
  }
  return (
    <div className="space-y-3">
      <ImageInput kind={kind} onImage={changeImage} />
      {!available ? (
        <p>
          Automatic {kind === 'photo' ? 'product recognition' : 'receipt extraction'} is not yet enabled. Use
          the preview as a reference and enter purchases below. No provider is connected.
        </p>
      ) : (
        <>
          <p>
            Processing sends this image to the configured provider only when you press the button. Check
            suggestions against your food or receipt. Recognition cannot establish production origin or
            reliable weight from a photograph.
          </p>
          <button
            type="button"
            className="btn-secondary"
            disabled={!image || busy}
            onClick={() => void processImage()}
          >
            {busy
              ? 'Processing…'
              : kind === 'photo'
                ? 'Send image for product suggestions'
                : 'Send receipt for extraction'}
          </button>
          {busy && (
            <button
              type="button"
              className="btn-quiet"
              onClick={() => {
                request.current?.abort();
                request.current = null;
                setBusy(false);
                setMessage('Processing cancelled. Your entries are unchanged.');
              }}
            >
              Cancel processing
            </button>
          )}
        </>
      )}
      {message && <p role="status">{message}</p>}
      {result && (
        <section aria-label="Unconfirmed extraction suggestions" className="space-y-2 rounded border p-3">
          <h3 className="font-bold">Unconfirmed suggestions</h3>
          {result.uncertainty.map((u, i) => (
            <p key={i}>{u}</p>
          ))}
          {!result.products.length && (
            <p>No itemized products were returned. Add products manually; some receipts are not itemized.</p>
          )}
          <ul className="space-y-2">
            {result.products.map((p, i) => (
              <li key={i}>
                <p>
                  {p.name} · {p.uncertainty}
                </p>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={added.includes(i)}
                  onClick={() => {
                    if (onAdd(suggestionDraft(p, p.priceCents ?? undefined))) {
                      setAdded((old) => [...old, i]);
                      setMessage(
                        'Added an unconfirmed draft. Check its fields and confirm the product below.',
                      );
                    } else
                      setMessage(
                        'A visit supports up to 100 products. Remove a product before adding another.',
                      );
                  }}
                >
                  {added.includes(i) ? 'Added for review' : `Add suggestion ${i + 1} for review`}
                </button>
              </li>
            ))}
          </ul>
          {result.totalCents != null && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                onTotal((result.totalCents! / 100).toFixed(2));
                setMessage('Receipt total copied for review. Check it before submitting.');
              }}
            >
              Use suggested total ${(result.totalCents / 100).toFixed(2)} (replaces entered total)
            </button>
          )}
        </section>
      )}
    </div>
  );
}
