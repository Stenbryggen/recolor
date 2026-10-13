import { expect, test } from '@playwright/test';

// A 1x1 PNG, so there is something to upload.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
const png = (name) => ({ name, mimeType: 'image/png', buffer: PNG });

// Seed tickets (see backend/src/seed): ticket-1 is Pixelworks, article 15377522 is ClipMaster.
const PIXELWORKS_TICKET = 'ticket-1';
const CLIPMASTER_ARTICLE = '15377522';

async function actAs(page, name) {
  await page.getByLabel('Acting user').click();
  await page.getByRole('option', { name: new RegExp(name) }).click();
  // The page loads again for the new user.
  await expect(page.getByLabel('Acting user')).toContainText(name);
}

// Chooses an option in a PrimeVue select and waits until its list is gone,
// so the next select does not find the options of this one.
async function choose(page, selectId, option) {
  await page.locator(selectId).click();
  await page.getByRole('option', { name: option, exact: true }).click();
  await expect(page.locator('.p-select-overlay')).toHaveCount(0);
}

const menu = (page) => page.locator('.nav a');

test.describe('roles', () => {
  test('the menu follows the role', async ({ page }) => {
    await page.goto('/');

    await expect(menu(page)).toHaveText(['Dashboard', 'Queue', 'New ticket', 'Approved Library', 'Partner Overview']);

    await actAs(page, 'Jens Andersen');
    await expect(menu(page)).toHaveText(['Dashboard', 'Queue', 'Approved Library', 'Partner Overview']);

    await actAs(page, 'Anh Tran');
    await expect(menu(page)).toHaveText(['Dashboard', 'Queue', 'Approved Library']);
  });

  test('a partner user is sent away from a page it may not open', async ({ page }) => {
    await page.goto('/partners');
    await expect(page.getByRole('heading', { name: 'Partner Overview' })).toBeVisible();

    await actAs(page, 'Anh Tran');

    await expect(page).toHaveURL(/\/queue/);
  });

  test('a partner user only sees the tickets of its own partner', async ({ page }) => {
    await page.goto('/');
    await actAs(page, 'Ravi Patel');

    await page.goto('/queue');
    await expect(page.getByRole('cell', { name: CLIPMASTER_ARTICLE })).toBeVisible();
    await expect(page.getByRole('cell', { name: '15377489' })).toHaveCount(0);

    await page.goto(`/tickets/${PIXELWORKS_TICKET}`);
    await expect(page.getByText('does not exist, or you cannot see it')).toBeVisible();
  });
});

test.describe('the queue', () => {
  test('a link gives the receiver the same view', async ({ page, browser }) => {
    await page.goto('/queue?statuses=PENDING&q=' + CLIPMASTER_ARTICLE);
    await expect(page.getByRole('cell', { name: CLIPMASTER_ARTICLE })).toBeVisible();
    await expect(page.locator('tbody tr')).toHaveCount(1);

    // Someone else opens the same link in their own browser.
    const receiver = await (await browser.newContext()).newPage();
    await receiver.goto(page.url());

    await expect(receiver.getByPlaceholder('Article or reference number')).toHaveValue(CLIPMASTER_ARTICLE);
    await expect(receiver.locator('tbody tr')).toHaveCount(1);
    await receiver.close();
  });

  test('changing the filters changes the URL', async ({ page }) => {
    await page.goto('/queue');
    await page.getByPlaceholder('Article or reference number').fill(CLIPMASTER_ARTICLE);
    await page.getByRole('button', { name: 'Filter' }).click();

    await expect(page).toHaveURL(/q=15377522/);
  });

  test('a dashboard tile opens the queue with that status', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /Pending/ }).first().click();

    await expect(page).toHaveURL(/statuses=PENDING/);
    await expect(page.locator('tbody tr').first()).toBeVisible();
  });
});

test.describe('creating a ticket', () => {
  test('shows the errors of the API at the fields', async ({ page }) => {
    await page.goto('/tickets/new');
    await page.getByRole('button', { name: 'Create ticket' }).click();

    await expect(page.getByText('Please correct the fields marked below')).toBeVisible();
    await expect(page.getByText('An article number is required')).toBeVisible();
  });
});

test('a ticket goes through the whole workflow', async ({ page }) => {
  // A new article number each run, so the test also works on an API that already holds earlier runs.
  const ARTICLE = String(Date.now()).slice(-8);
  let ticketUrl;

  await test.step('Maria creates a ticket with an AOP variant', async () => {
    await page.goto('/tickets/new');
    await page.getByLabel('Article number').fill(ARTICLE);
    await page.getByLabel('Reference number').fill('1234567');
    await choose(page, '#partner', 'Pixelworks');
    await page.getByLabel('Guideline').fill('Make it green. Keep one clipping path.');

    await choose(page, '#colour-0', 'Granita');
    await page.getByRole('button', { name: 'Add variant' }).click();
    await choose(page, '#colour-1', 'Night Sky');
    await page.locator('#aop-1').click();
    await choose(page, '#pattern-1', 'Block Libre');

    await page.locator('#file-FRONT').setInputFiles(png(`${ARTICLE}_1234567_001.png`));
    await page.locator('#file-BACK').setInputFiles(png(`${ARTICLE}_1234567_002.png`));
    await page.locator('#file-STYLE').setInputFiles(png(`${ARTICLE}_1234567_007.png`));
    await page.locator('#file-REFERENCE').setInputFiles(png('Block Libre.png'));
    await page.getByRole('button', { name: 'Create ticket' }).click();

    await expect(page.getByRole('heading', { name: `Article ${ARTICLE}` })).toBeVisible();
    await expect(page.getByText('Pending', { exact: true }).first()).toBeVisible();
    ticketUrl = page.url();
  });

  await test.step('Maria sends it to the partner', async () => {
    await page.getByRole('button', { name: 'Send to partner' }).click();
    await expect(page.getByText('Sent', { exact: true }).first()).toBeVisible();
  });

  await test.step('the Partner Overview shows that the receipt is awaited', async () => {
    await page.getByRole('link', { name: 'Partner Overview' }).click();
    await expect(page.getByText('awaiting receipt').first()).toBeVisible();
  });

  await test.step('Anh Tran confirms receipt, but cannot deliver without results', async () => {
    await actAs(page, 'Anh Tran');
    await page.goto(ticketUrl);
    await page.getByRole('button', { name: 'Confirm receipt' }).click();
    await expect(page.getByText('In progress', { exact: true }).first()).toBeVisible();

    await page.getByRole('button', { name: 'Deliver' }).click();
    await expect(page.locator('.p-toast-detail').first()).toContainText('Result images are missing for variant 1');
  });

  await test.step('Anh Tran fills in the results and delivers', async () => {
    await page.getByRole('button', { name: 'Fill with placeholder images (demo)' }).click();
    await expect(page.locator('.results-table img')).toHaveCount(6);
    await page.getByRole('button', { name: 'Deliver' }).click();
    await expect(page.getByText('Completed', { exact: true }).first()).toBeVisible();
  });

  await test.step('Jens must give a reason to reject, and rejects', async () => {
    await actAs(page, 'Jens Andersen');
    await page.goto(ticketUrl);
    await page.getByRole('button', { name: 'Reject' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Reject' }).click();
    await expect(dialog.locator('.field-error')).toBeVisible();

    await page.getByLabel('What must the partner correct?').fill('The back image has two clipping paths.');
    await dialog.getByRole('button', { name: 'Reject' }).click();
    await expect(page.getByText('Rejected: The back image has two clipping paths.')).toBeVisible();
  });

  await test.step('Maria sends it again and Sofie delivers round 2', async () => {
    await actAs(page, 'Maria Hansen');
    await page.goto(ticketUrl);
    await page.getByRole('button', { name: 'Send again' }).click();
    await expect(page.getByText('Sent', { exact: true }).first()).toBeVisible();

    await actAs(page, 'Sofie Larsen');
    await page.goto(ticketUrl);
    await page.getByRole('button', { name: 'Confirm receipt' }).click();
    await page.getByRole('button', { name: 'Fill with placeholder images (demo)' }).click();
    await page.getByRole('button', { name: 'Deliver' }).click();
    await expect(page.getByText('Completed', { exact: true }).first()).toBeVisible();
    // Round 1 is kept next to round 2.
    await expect(page.getByRole('heading', { name: 'Result images (round 1)' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Result images (round 2)' })).toBeVisible();
  });

  await test.step('Jens approves after the clipping-path check', async () => {
    await actAs(page, 'Jens Andersen');
    await page.goto(ticketUrl);
    await page.getByRole('button', { name: 'Approve' }).click();
    const approve = page.getByRole('dialog').getByRole('button', { name: 'Approve' });
    await expect(approve).toBeDisabled();
    await page.getByLabel('Every image has the original, single clipping path').click();
    await approve.click();
    await expect(page.getByText('Approved', { exact: true }).first()).toBeVisible();
  });

  await test.step('the results are in the Approved Library', async () => {
    await page.getByRole('link', { name: 'Approved Library' }).click();
    await page.getByPlaceholder('Article or reference number').fill(ARTICLE);
    await page.getByRole('button', { name: 'Filter' }).click();
    await expect(page.getByRole('link', { name: new RegExp(`Article ${ARTICLE}`) })).toHaveCount(2);
  });

  await test.step('another partner cannot see the ticket', async () => {
    await actAs(page, 'Ravi Patel');
    await page.goto(ticketUrl);
    await expect(page.getByText('does not exist, or you cannot see it')).toBeVisible();
  });
});
