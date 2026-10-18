import { expect, test } from '@playwright/test';

test('Spanish seasonal guidance includes all months, food names and harvest/storage distinctions', async ({
  page,
}) => {
  await page.goto('#/search?state=FL&month=1&q=fresa');
  await page.getByRole('button', { name: 'Español', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Búsqueda de temporada', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'enero · Florida', exact: true })).toBeVisible();
  await expect(page.getByLabel('Mes', { exact: true }).locator('option')).toHaveText([
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
  await expect(page.getByRole('button', { name: 'Fresas', exact: true })).toBeVisible();
  await expect(page.getByText('De temporada · cosecha', { exact: true })).toBeVisible();
  await page.getByLabel('Mes', { exact: true }).selectOption('7');
  await expect(page.getByText('Fuera del período de cosecha documentado', { exact: true })).toBeVisible();
  await page.getByLabel('Estado para la guía de temporada').selectOption('MI');
  await page.getByLabel('Mes', { exact: true }).selectOption('1');
  await page.getByRole('searchbox').fill('manzana');
  await expect(
    page.getByText('Disponible de almacenamiento · no de cosecha fresca', { exact: true }),
  ).toBeVisible();
  await page.getByText('Evidencia del calendario', { exact: true }).click();
  await expect(
    page.getByText(/La página de la fuente fecha el recurso el 29 de marzo de 2013/),
  ).toBeVisible();
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'January · Michigan', exact: true })).toBeVisible();
  await expect(page.getByRole('searchbox')).toHaveValue('manzana');
  await expect(page.getByText('Available from storage · not fresh harvest', { exact: true })).toBeVisible();
});

test('Spanish mobile purchase, dashboard and product report preserve demo data across language changes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('#/search?view=purchases');
  await page.getByRole('button', { name: 'Español', exact: true }).click();
  await page.getByLabel('Buscar un mercado', { exact: true }).fill('Copley');
  await page.getByLabel('Mercado de agricultores', { exact: true }).selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Ingresar compras', exact: true }).click();
  await page.getByLabel('Fecha de visita', { exact: true }).fill('2026-10-17');
  await page.getByLabel('Nombre del producto', { exact: true }).fill('Manzanas');
  await page.getByLabel('Cantidad', { exact: true }).fill('2');
  await page.getByLabel('Unidad', { exact: true }).selectOption('kg');
  await expect(page.getByText('Ingrese el peso medido de este producto.')).toBeVisible();
  await page.getByLabel('Total gastado en USD').fill('7.001');
  await page.getByRole('button', { name: 'Confirmar información', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('máximo de dos decimales');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('at most two decimal places');
  await expect(page.getByLabel('Product name', { exact: true })).toHaveValue('Manzanas');
  await page.getByRole('button', { name: 'Español', exact: true }).click();
  await page.getByLabel('Total gastado en USD').fill('7.29');
  await page.getByRole('button', { name: 'Confirmar información', exact: true }).click();
  await expect(page.getByText('17 de octubre de 2026', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Enviar visita', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Se registró una visita al mercado.');
  await expect(page.getByText('Visitas al mercado', { exact: true }).locator('..').locator('dd')).toHaveText(
    '1',
  );
  const dashboard = page.getByRole('region', { name: 'Panel de sostenibilidad' });
  await expect(dashboard.getByText('No disponible', { exact: true })).toHaveCount(5);
  await expect(
    dashboard.getByText(/^Calidad de los datos: no disponible · Cobertura de evidencia:/),
  ).toHaveCount(5);
  await expect(dashboard.getByText('Escenario regional ilustrativo', { exact: true })).toBeVisible();
  await expect(page.getByText(/Estas estimaciones comparan cadenas de suministro/)).toBeVisible();
  expect(await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')).toBe(true);
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.getByText('Market visits', { exact: true }).locator('..').locator('dd')).toHaveText('1');
  await expect(
    page.getByText('Recorded market spending', { exact: true }).locator('..').locator('dd'),
  ).toHaveText('$7.29 USD');
  await page.getByRole('button', { name: 'Español', exact: true }).click();
  await page
    .getByRole('button', { name: 'Reportar productos observados · demostración local', exact: true })
    .click();
  await page.getByLabel('Buscar un mercado para reportar').fill('Copley');
  await page.getByLabel('Mercado del reporte de productos').selectOption({ index: 1 });
  await page.getByLabel('Fecha de observación').fill('2026-10-17');
  await page.getByRole('checkbox', { name: 'Manzanas', exact: true }).check();
  await page.getByRole('button', { name: 'Revisar reporte', exact: true }).click();
  await page.getByRole('button', { name: 'Agregar a la demostración local', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('No se subió ni se guardó nada permanentemente.');
  await expect(page.getByRole('button', { name: 'Envío público no disponible' })).toBeDisabled();
});
