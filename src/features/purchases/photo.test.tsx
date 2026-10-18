import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ImageInput } from './ImageInput';
import { validateImage, MAX_IMAGE_BYTES } from './image';
import {
  ProductRecognitionResult,
  canonicalProductId,
  recognizeProducts,
  unavailableRecognition,
} from './recognition';
import { ReceiptExtractionResult, extractReceipt, unavailableReceiptExtraction } from './receipt';
import { suggestionDraft } from './draft';
import { parseQuantity } from './quantity';
import { PurchaseEntry } from './PurchaseEntry';
import { MemoryPurchaseRepository } from './repository';
function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
const png = () =>
  new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0])], 'private.png', {
    type: 'image/png',
  });
const suggestion = () => ({
  name: 'apple',
  candidateProductId: 'apples',
  quantity: 3,
  unit: 'each' as const,
  confidence: null,
  uncertainty: 'Synthetic fixture; check count.',
});
let images: HTMLImageElement[] = [];
let count = 0;
const revoke = vi.fn();
beforeEach(() => {
  images = [];
  count = 0;
  revoke.mockClear();
  vi.stubGlobal(
    'Image',
    class {
      naturalWidth = 100;
      naturalHeight = 100;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';
      constructor() {
        images.push(this as unknown as HTMLImageElement);
      }
    },
  );
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => `blob:test-${++count}`),
  });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revoke });
});
afterEach(() => vi.unstubAllGlobals());
async function select(label: string, file = png()) {
  const previousCount = images.length;
  fireEvent.change(screen.getByLabelText(label), { target: { files: [file] } });
  await waitFor(() => expect(images.length).toBeGreaterThan(previousCount));
  await act(async () => images.at(-1)!.onload?.(new Event('load')));
}
describe('private image selection', () => {
  it('validates supported file signatures', async () => {
    await expect(validateImage(png())).resolves.toBeUndefined();
    await expect(
      validateImage(new File([new Uint8Array([255, 216, 255, 0])], 'a.jpg', { type: 'image/jpeg' })),
    ).resolves.toBeUndefined();
    await expect(
      validateImage(new File(['RIFF0000WEBP'], 'a.webp', { type: 'image/webp' })),
    ).resolves.toBeUndefined();
  });
  it.each(['image/heic', 'image/svg+xml', 'application/pdf', 'text/plain', ''])(
    'rejects unsupported format %s',
    async (type) => {
      await expect(validateImage(new File(['fake'], 'image', { type }))).rejects.toThrow('JPEG');
    },
  );
  it('rejects empty, oversized and spoofed images', async () => {
    await expect(validateImage(new File([], 'a.png', { type: 'image/png' }))).rejects.toThrow('empty');
    const big = png();
    Object.defineProperty(big, 'size', { value: MAX_IMAGE_BYTES + 1 });
    await expect(validateImage(big)).rejects.toThrow('8 MB');
    await expect(validateImage(new File(['not an image'], 'a.png', { type: 'image/png' }))).rejects.toThrow(
      'contents',
    );
  });
  it('previews, replaces, removes and cleans image URLs on unmount', async () => {
    const onImage = vi.fn();
    const { unmount } = render(<ImageInput kind="photo" onImage={onImage} />);
    expect(screen.getByLabelText('Take a purchase photo')).toHaveAttribute('capture', 'environment');
    await select('Upload a purchase photo');
    expect(screen.getByAltText('Selected purchase photo for your reference')).toHaveAttribute(
      'src',
      'blob:test-1',
    );
    expect(onImage).toHaveBeenCalledWith(expect.any(File));
    fireEvent.change(screen.getByLabelText('Upload a purchase photo'), { target: { files: [png()] } });
    await waitFor(() => expect(images).toHaveLength(2));
    await act(async () => images[1].onload?.(new Event('load')));
    expect(revoke).toHaveBeenCalledWith('blob:test-1');
    fireEvent.click(screen.getByRole('button', { name: 'Remove image' }));
    expect(revoke).toHaveBeenCalledWith('blob:test-2');
    expect(onImage).toHaveBeenLastCalledWith(null);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Upload a purchase photo'), { target: { files: [png()] } });
    await waitFor(() => expect(images).toHaveLength(3));
    await act(async () => images[2].onload?.(new Event('load')));
    unmount();
    expect(revoke).toHaveBeenCalledWith('blob:test-3');
  });
  it('retains valid preview after invalid replacement or decoding failure', async () => {
    render(<ImageInput kind="receipt" onImage={() => {}} />);
    await select('Upload a receipt image');
    fireEvent.change(screen.getByLabelText('Upload a receipt image'), {
      target: { files: [new File(['bad'], 'a.svg', { type: 'image/svg+xml' })] },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('not supported');
    fireEvent.change(screen.getByLabelText('Upload a receipt image'), { target: { files: [png()] } });
    await waitFor(() => expect(images).toHaveLength(2));
    await act(async () => images[1].onerror?.(new Event('error')));
    expect(screen.getByRole('alert')).toHaveTextContent('could not be opened');
    expect(screen.getByRole('img')).toHaveAttribute('src', 'blob:test-1');
    expect(revoke).toHaveBeenCalledWith('blob:test-2');
  });
  it('drops stale pending selection and cleans up before decoding finishes', async () => {
    const onImage = vi.fn();
    const { unmount } = render(<ImageInput kind="photo" onImage={onImage} />);
    fireEvent.change(screen.getByLabelText('Upload a purchase photo'), { target: { files: [png()] } });
    await waitFor(() => expect(images).toHaveLength(1));
    fireEvent.change(screen.getByLabelText('Upload a purchase photo'), { target: { files: [png()] } });
    await waitFor(() => expect(images).toHaveLength(2));
    expect(images[0].onload).toBeNull();
    expect(revoke).toHaveBeenCalledWith('blob:test-1');
    unmount();
    expect(images[1].onload).toBeNull();
    expect(revoke).toHaveBeenCalledWith('blob:test-2');
    expect(onImage.mock.calls.flat().every((value) => value === null)).toBe(true);
  });
});
describe('provider boundaries and quantities', () => {
  it('production adapters never invent results or call a provider', async () => {
    const image = png(),
      signal = new AbortController().signal;
    expect(await recognizeProducts(unavailableRecognition, { image, signal })).toEqual({
      status: 'unavailable',
    });
    expect(await extractReceipt(unavailableReceiptExtraction, { image, signal })).toEqual({
      status: 'unavailable',
    });
    const provider = { available: false, recognize: vi.fn() };
    await recognizeProducts(provider, { image, signal });
    expect(provider.recognize).not.toHaveBeenCalled();
  });
  it('supports validated future suggestions and fails closed on malformed output', async () => {
    const request = { image: png(), signal: new AbortController().signal };
    expect(
      await recognizeProducts(
        {
          available: true,
          recognize: async () => ({ status: 'suggestions', products: [suggestion()], uncertainty: [] }),
        },
        request,
      ),
    ).toMatchObject({ status: 'suggestions' });
    await expect(
      recognizeProducts(
        { available: true, recognize: async () => ({ status: 'success', products: [{ name: 'fake' }] }) },
        request,
      ),
    ).rejects.toThrow();
  });
  it.each([
    { confidence: 1.1 },
    { candidateProductId: 'unknown' },
    { quantity: -1 },
    { unit: 'ton' },
    { quantity: 2, unit: null },
    { origin: 'local' },
  ])('rejects malformed suggestion %j', (patch) => {
    expect(
      ProductRecognitionResult.safeParse({
        status: 'suggestions',
        products: [{ ...suggestion(), ...patch }],
        uncertainty: [],
      }).success,
    ).toBe(false);
  });
  it('supports non-itemized receipts and rejects unsafe currency or personal data fields', () => {
    expect(
      ReceiptExtractionResult.safeParse({
        status: 'suggestions',
        products: [],
        totalCents: 450,
        uncertainty: ['Not itemized'],
      }).success,
    ).toBe(true);
    expect(
      ReceiptExtractionResult.safeParse({
        status: 'suggestions',
        products: [],
        totalCents: -1,
        uncertainty: [],
      }).success,
    ).toBe(false);
    expect(
      ReceiptExtractionResult.safeParse({
        status: 'suggestions',
        products: [],
        totalCents: null,
        uncertainty: [],
        cardNumber: 'private',
      }).success,
    ).toBe(false);
  });
  it('maps only exact aliases and never copies suggested mass into measured quantities', () => {
    expect(canonicalProductId('APPLE')).toBe('apples');
    expect(canonicalProductId('Mystery food')).toBeUndefined();
    expect(suggestionDraft({ ...suggestion(), unit: 'kg' })).toMatchObject({
      quantity: '',
      needsReview: true,
    });
    expect(
      suggestionDraft({ ...suggestion(), candidateProductId: null, name: 'Unknown food' }),
    ).toMatchObject({ product: 'Unknown food', needsReview: true });
  });
  it.each(['0', '-1', 'NaN', 'Infinity', '10000001'])('rejects invalid quantity %s', (value) =>
    expect(() => parseQuantity(value)).toThrow(),
  );
  it('preserves blank quantities and supported positive values', () => {
    expect(parseQuantity(' ')).toBeUndefined();
    expect(parseQuantity('0.25')).toBe(0.25);
  });
});
function entry(props: Partial<React.ComponentProps<typeof PurchaseEntry>> = {}) {
  const repository = new MemoryPurchaseRepository();
  render(
    <PurchaseEntry
      markets={[{ id: 'm', name: 'Test Market', city: 'Boston', state: 'MA' }]}
      repository={repository}
      onRecorded={() => {}}
      {...props}
    />,
  );
  fireEvent.change(screen.getByLabelText('Farmers market'), { target: { value: 'm' } });
  fireEvent.click(screen.getByRole('button', { name: 'Enter purchases' }));
  return repository;
}
describe('purchase integration', () => {
  it('keeps typed entries through photo/receipt/manual methods and discards photos at review', async () => {
    const repo = entry();
    fireEvent.change(screen.getByLabelText('Product name'), { target: { value: 'Apples' } });
    fireEvent.change(screen.getByLabelText('Total spent USD'), { target: { value: '5.25' } });
    fireEvent.click(screen.getByLabelText('Take or upload a purchase photo'));
    expect(screen.getByText(/Automatic product recognition is not yet enabled/)).toBeInTheDocument();
    await select('Upload a purchase photo');
    fireEvent.click(screen.getByLabelText('Upload a receipt'));
    expect(revoke).toHaveBeenCalledWith('blob:test-1');
    expect(screen.getByLabelText('Product name')).toHaveValue('Apples');
    await select('Upload a receipt image');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm information' }));
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(revoke).toHaveBeenCalledWith('blob:test-2');
    fireEvent.click(screen.getByRole('button', { name: 'Submit visit' }));
    await waitFor(async () => expect(await repo.list()).toHaveLength(1));
    expect((await repo.list())[0]).toMatchObject({ totalCents: 525, items: [{ product: 'Apples' }] });
    expect(JSON.stringify(await repo.list())).not.toContain('blob:');
  });
  it('requires explicit processing, adding, correcting and confirming synthetic suggestions', async () => {
    const recognize = vi.fn(async () => ({
      status: 'suggestions',
      products: [suggestion()],
      uncertainty: ['Test provider only'],
    }));
    const repo = entry({ recognition: { available: true, recognize } });
    fireEvent.click(screen.getByLabelText('Take or upload a purchase photo'));
    await select('Upload a purchase photo');
    expect(recognize).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Send image for product suggestions' }));
    await screen.findByRole('button', { name: 'Add suggestion 1 for review' });
    expect(screen.getByLabelText('Product name')).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: 'Add suggestion 1 for review' }));
    fireEvent.change(screen.getByLabelText('Total spent USD'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm information' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Check each suggested product');
    expect(await repo.list()).toHaveLength(0);
    fireEvent.change(screen.getByLabelText('Product name'), { target: { value: 'Pears' } });
    fireEvent.change(screen.getByLabelText('Quantity (optional)'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /I checked product 1/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm information' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit visit' }));
    await waitFor(async () => expect(await repo.list()).toHaveLength(1));
    expect((await repo.list())[0].items[0]).toMatchObject({ product: 'Pears', quantity: 2, unit: 'each' });
  });
  it('keeps existing entries after processing fails', async () => {
    entry({
      recognition: {
        available: true,
        recognize: async () => {
          throw new Error('private upstream text');
        },
      },
    });
    fireEvent.change(screen.getByLabelText('Product name'), { target: { value: 'Bread' } });
    fireEvent.click(screen.getByLabelText('Take or upload a purchase photo'));
    await select('Upload a purchase photo');
    fireEvent.click(screen.getByRole('button', { name: 'Send image for product suggestions' }));
    await screen.findByText(/Could not process this image/);
    expect(screen.getByLabelText('Product name')).toHaveValue('Bread');
    expect(screen.queryByText(/private upstream text/)).not.toBeInTheDocument();
  });
});

it('rejects excessive decoded dimensions and releases the pending URL', async () => {
  render(<ImageInput kind="photo" onImage={() => {}} />);
  fireEvent.change(screen.getByLabelText('Upload a purchase photo'), { target: { files: [png()] } });
  await waitFor(() => expect(images).toHaveLength(1));
  Object.defineProperty(images[0], 'naturalWidth', { value: 10000 });
  Object.defineProperty(images[0], 'naturalHeight', { value: 10000 });
  await act(async () => images[0].onload?.(new Event('load')));
  expect(screen.getByRole('alert')).toHaveTextContent('40 megapixels');
  expect(revoke).toHaveBeenCalledWith('blob:test-1');
});
it('never invokes either provider for an already cancelled request', async () => {
  const controller = new AbortController();
  controller.abort();
  const recognize = vi.fn(),
    extract = vi.fn();
  const request = { image: png(), signal: controller.signal };
  await expect(recognizeProducts({ available: true, recognize }, request)).rejects.toThrow('cancelled');
  await expect(extractReceipt({ available: true, extract }, request)).rejects.toThrow('cancelled');
  expect(recognize).not.toHaveBeenCalled();
  expect(extract).not.toHaveBeenCalled();
});
it('rejects provider results that arrive after cancellation', async () => {
  const controller = new AbortController();
  const response = deferred<unknown>();
  const pending = recognizeProducts(
    { available: true, recognize: () => response.promise },
    { image: png(), signal: controller.signal },
  );
  controller.abort();
  response.resolve({ status: 'suggestions', products: [suggestion()], uncertainty: [] });
  await expect(pending).rejects.toThrow('cancelled');
});
it('keeps receipt totals and item prices unconfirmed until explicitly applied and checked', async () => {
  const extract = vi.fn(async () => ({
    status: 'suggestions',
    products: [{ ...suggestion(), quantity: null, unit: null, priceCents: 250 }],
    totalCents: 375,
    uncertainty: ['Synthetic receipt fixture only'],
  }));
  const repo = entry({ receipt: { available: true, extract } });
  fireEvent.change(screen.getByLabelText('Total spent USD'), { target: { value: '1' } });
  fireEvent.click(screen.getByLabelText('Upload a receipt'));
  await select('Upload a receipt image');
  expect(extract).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Send receipt for extraction' }));
  await screen.findByRole('button', { name: /Use suggested total/ });
  expect(screen.getByLabelText('Total spent USD')).toHaveValue('1');
  fireEvent.click(screen.getByRole('button', { name: 'Add suggestion 1 for review' }));
  expect(screen.getByLabelText('Item price USD (optional)')).toHaveValue('2.50');
  fireEvent.click(screen.getByRole('checkbox', { name: /I checked product 1/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm information' }));
  expect(screen.getByRole('alert')).toHaveTextContent('cannot exceed');
  fireEvent.click(screen.getByRole('button', { name: /Use suggested total/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm information' }));
  expect(await repo.list()).toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: 'Submit visit' }));
  await waitFor(async () => expect(await repo.list()).toHaveLength(1));
  expect((await repo.list())[0]).toMatchObject({ totalCents: 375, items: [{ spendingCents: 250 }] });
});
it('ignores late suggestions after switching back to manual input', async () => {
  const response = deferred<unknown>();
  let signal: AbortSignal | undefined;
  entry({
    recognition: {
      available: true,
      recognize: (request) => {
        signal = request.signal;
        return response.promise;
      },
    },
  });
  fireEvent.change(screen.getByLabelText('Product name'), { target: { value: 'Bread' } });
  fireEvent.click(screen.getByLabelText('Take or upload a purchase photo'));
  await select('Upload a purchase photo');
  fireEvent.click(screen.getByRole('button', { name: 'Send image for product suggestions' }));
  fireEvent.click(screen.getByLabelText('Enter purchases manually'));
  expect(signal?.aborted).toBe(true);
  await act(async () =>
    response.resolve({ status: 'suggestions', products: [suggestion()], uncertainty: [] }),
  );
  expect(screen.getByLabelText('Product name')).toHaveValue('Bread');
  expect(screen.queryByRole('button', { name: 'Add suggestion 1 for review' })).not.toBeInTheDocument();
});
it('prevents double submission while the repository is saving', async () => {
  const repo = new MemoryPurchaseRepository();
  const original = repo.submit.bind(repo);
  const gate = deferred<void>();
  const submit = vi.spyOn(repo, 'submit').mockImplementation(async (input) => {
    await gate.promise;
    return original(input);
  });
  const onRecorded = vi.fn();
  entry({ repository: repo, onRecorded });
  fireEvent.change(screen.getByLabelText('Product name'), { target: { value: 'Apples' } });
  fireEvent.change(screen.getByLabelText('Total spent USD'), { target: { value: '3' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm information' }));
  fireEvent.click(screen.getByRole('button', { name: 'Submit visit' }));
  const button = screen.getByRole('button', { name: 'Submitting…' });
  fireEvent.click(button);
  expect(button).toBeDisabled();
  expect(submit).toHaveBeenCalledOnce();
  await act(async () => gate.resolve(undefined));
  await waitFor(() => expect(onRecorded).toHaveBeenCalledOnce());
  expect(await repo.list()).toHaveLength(1);
});
