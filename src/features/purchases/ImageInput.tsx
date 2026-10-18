import { useEffect, useId, useRef, useState } from 'react';
import { IMAGE_ACCEPT, validateImage } from './image';
type Selection = { file: File; url: string };
/** Files and object URLs exist only in this component/current purchase draft. */
export function ImageInput({
  kind,
  onImage,
}: {
  kind: 'photo' | 'receipt';
  onImage: (image: File | null) => void;
}) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const serial = useRef(0);
  const urls = useRef(new Set<string>());
  const selected = useRef<Selection | null>(null);
  const pending = useRef<HTMLImageElement | null>(null);
  const id = useId();
  useEffect(
    () => () => {
      serial.current++;
      if (pending.current) {
        pending.current.onload = null;
        pending.current.onerror = null;
        pending.current.src = '';
      }
      for (const url of urls.current) URL.revokeObjectURL(url);
      urls.current.clear();
    },
    [],
  );
  function release(url: string) {
    URL.revokeObjectURL(url);
    urls.current.delete(url);
  }
  function remove() {
    serial.current++;
    if (pending.current) {
      pending.current.onload = null;
      pending.current.onerror = null;
      pending.current.src = '';
      pending.current = null;
    }
    for (const url of urls.current) URL.revokeObjectURL(url);
    urls.current.clear();
    selected.current = null;
    setSelection(null);
    setLoading(false);
    setError('');
    onImage(null);
  }
  async function select(file: File | undefined) {
    if (!file) return;
    const token = ++serial.current;
    if (pending.current) {
      pending.current.onload = null;
      pending.current.onerror = null;
      pending.current.src = '';
      pending.current = null;
    }
    for (const old of urls.current) if (old !== selected.current?.url) release(old);
    setError('');
    setLoading(true);
    let url: string | undefined;
    try {
      await validateImage(file);
      if (token !== serial.current) return;
      url = URL.createObjectURL(file);
      urls.current.add(url);
      const img = new Image();
      pending.current = img;
      await new Promise<void>((resolve, reject) => {
        img.onload = () =>
          img.naturalWidth > 0 && img.naturalHeight > 0 && img.naturalWidth * img.naturalHeight <= 40_000_000
            ? resolve()
            : reject(new Error('Choose an image smaller than 40 megapixels.'));
        img.onerror = () => reject(new Error('This image could not be opened. Choose another image.'));
        img.src = url!;
      });
      img.onload = null;
      img.onerror = null;
      if (token !== serial.current) {
        if (urls.current.has(url)) release(url);
        return;
      }
      pending.current = null;
      if (selected.current) release(selected.current.url);
      selected.current = { file, url };
      setSelection(selected.current);
      onImage(file);
    } catch (err) {
      if (url && urls.current.has(url)) release(url);
      if (token === serial.current)
        setError(err instanceof Error ? err.message : 'Could not open this image.');
    } finally {
      if (token === serial.current) setLoading(false);
    }
  }
  return (
    <section
      aria-label={kind === 'photo' ? 'Purchase photo' : 'Receipt image'}
      className="min-w-0 space-y-3 rounded border p-3"
    >
      <p id={`${id}-help`}>
        Private preview only. JPEG, PNG or WebP, up to 8 MB. No image is uploaded or saved with your visit.
        Images are discarded when leaving entry or changing methods.
      </p>
      {kind === 'photo' && (
        <label className="block">
          Take a purchase photo
          <input
            className="field min-w-0 max-w-full"
            type="file"
            accept={IMAGE_ACCEPT}
            capture="environment"
            aria-describedby={`${id}-help`}
            onChange={(e) => {
              void select(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>
      )}
      <label className="block">
        {kind === 'photo' ? 'Upload a purchase photo' : 'Upload a receipt image'}
        <input
          className="field min-w-0 max-w-full"
          type="file"
          accept={IMAGE_ACCEPT}
          aria-describedby={`${id}-help`}
          onChange={(e) => {
            void select(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </label>
      {loading && <p role="status">Checking image…</p>}
      {error && <p role="alert">{error} Existing entries and any valid preview are kept.</p>}
      {selection && (
        <>
          <img
            className="max-h-64 max-w-full rounded object-contain"
            src={selection.url}
            alt={
              kind === 'photo'
                ? 'Selected purchase photo for your reference'
                : 'Selected receipt for your reference'
            }
          />
          <p className="break-words">Image ready for local reference. Select another image to replace it.</p>
        </>
      )}
      {(selection || loading) && (
        <button type="button" className="btn-secondary" onClick={remove}>
          Remove image
        </button>
      )}
    </section>
  );
}
