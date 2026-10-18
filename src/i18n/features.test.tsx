import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { createInstance } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import type { ReactNode } from 'react';
import { expect, it, vi } from 'vitest';
import en from './features.en.json';
import es from './features.es.json';
import { useFeatureTranslation } from './featureText';
import { monthName } from '../lib/format';
import { PurchaseEntry } from '../features/purchases/PurchaseEntry';
import { MemoryPurchaseRepository } from '../features/purchases/repository';
import { seasonalCatalog } from '../features/seasonal/catalog/catalog';

async function setup(language = 'es') {
  const i18n = createInstance();
  await i18n.use(initReactI18next).init({
    lng: language,
    fallbackLng: 'en',
    resources: { en: { features: en }, es: { features: es } },
    interpolation: { escapeValue: false },
  });
  return {
    i18n,
    wrapper: ({ children }: { children: ReactNode }) => (
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    ),
  };
}

it('provides matching Spanish keys and interpolation parameters for every feature message', () => {
  expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
  for (const key of Object.keys(en) as (keyof typeof en)[]) {
    expect(es[key].trim(), key).not.toBe('');
    expect(es[key].match(/\{\{\w+\}\}/g)?.sort() ?? [], key).toEqual(
      en[key].match(/\{\{\w+\}\}/g)?.sort() ?? [],
    );
    expect(es[key].match(/^\s*/)?.[0], key).toEqual(en[key].match(/^\s*/)?.[0]);
    expect(es[key].match(/\s*$/)?.[0], key).toEqual(en[key].match(/\s*$/)?.[0]);
  }
  for (const product of seasonalCatalog.products)
    expect(es[product.name as keyof typeof es]).toBe(product.nameEs);
});

it('uses the selected language for all twelve months and for diagnostic templates', async () => {
  const { wrapper, i18n } = await setup();
  const { result } = renderHook(useFeatureTranslation, { wrapper });
  expect(Array.from({ length: 12 }, (_, index) => monthName(index + 1, result.current.language))).toEqual([
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ]);
  expect(result.current.text('2026-10-17 · My apples: mass or complete sourced freight legs unknown')).toBe(
    '2026-10-17 · My apples: masa o tramos de transporte documentados completos desconocidos',
  );
  expect(
    result.current.text(
      '2026-10-17 · My apples: Recorded mass required (kg, g, lb or oz); no count/price conversion assumed.',
    ),
  ).toContain('Se requiere masa registrada');
  expect(result.current.text('Too big: expected string to have <=120 characters')).toContain(
    'como máximo 120 caracteres',
  );
  expect(result.current.text('My own farm name')).toBe('My own farm name');
  await act(() => i18n.changeLanguage('en'));
  expect(result.current.text('In season · harvest')).toBe('In season · harvest');
  expect(monthName(10, result.current.language)).toBe('October');
});

it('switches purchase drafts, errors, confirmation dates and completion messages without changing records', async () => {
  const { wrapper, i18n } = await setup();
  const repository = new MemoryPurchaseRepository();
  const onRecorded = vi.fn();
  render(
    <PurchaseEntry
      markets={[{ id: 'm', name: 'Test Market', city: 'Boston', state: 'MA' }]}
      repository={repository}
      onRecorded={onRecorded}
    />,
    { wrapper },
  );
  fireEvent.change(screen.getByLabelText('Mercado de agricultores'), { target: { value: 'm' } });
  fireEvent.click(screen.getByRole('button', { name: 'Ingresar compras' }));
  fireEvent.change(screen.getByLabelText('Fecha de visita'), { target: { value: '2026-10-17' } });
  fireEvent.change(screen.getByLabelText('Nombre del producto'), { target: { value: 'Manzanas' } });
  fireEvent.change(screen.getByLabelText('Cantidad'), { target: { value: '2' } });
  fireEvent.change(screen.getByLabelText('Unidad'), { target: { value: 'each' } });
  expect(screen.getByText(/El conteo o volumen se conserva/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Total gastado en USD'), { target: { value: '2.001' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar información' }));
  expect(screen.getByRole('alert')).toHaveTextContent('máximo de dos decimales');
  await act(() => i18n.changeLanguage('en'));
  expect(screen.getByRole('alert')).toHaveTextContent('at most two decimal places');
  expect(screen.getByLabelText('Product name')).toHaveValue('Manzanas');
  await act(() => i18n.changeLanguage('es'));
  fireEvent.change(screen.getByLabelText('Total gastado en USD'), { target: { value: '2.50' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar información' }));
  expect(screen.getByText('17 de octubre de 2026')).toBeInTheDocument();
  expect(screen.getByText(/Manzanas: 2 unidad/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Enviar visita' }));
  await waitFor(() => expect(onRecorded).toHaveBeenCalledOnce());
  expect(screen.getByRole('status')).toHaveTextContent('Se registró una visita al mercado.');
  await act(() => i18n.changeLanguage('en'));
  expect(screen.getByRole('status')).toHaveTextContent('One market visit recorded.');
  expect((await repository.list())[0]).toMatchObject({
    totalCents: 250,
    items: [{ product: 'Manzanas', productId: 'apples', quantity: 2, unit: 'each' }],
  });
});
