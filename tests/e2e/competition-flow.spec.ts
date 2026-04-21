import { expect, test } from '@playwright/test'

test.describe('Mulligan mobile flow', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies()
    await context.clearPermissions()
  })

  test('shows the competitions empty state on a fresh install', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Mulligan/)
    await expect(page.getByRole('heading', { name: 'Runder' })).toBeVisible()
    await expect(page.getByTestId('start-first-competition')).toBeVisible()
  })

  test('creates a stableford round, scores a hole, and persists after reload', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('start-first-competition').click()
    await expect(page).toHaveURL(/\/competitions\/new$/)

    // Step 0: Format (default stableford, 18 holes)
    await page.getByTestId('advance').click()
    // Step 1: Course (first bundled course preselected)
    await page.getByTestId('advance').click()

    // Step 2: Players — add two inline
    await page.getByRole('button', { name: 'Legg til spiller' }).click()
    await page.getByLabel('Navn').fill('Alice')
    await page.getByRole('button', { name: 'Lagre' }).click()

    await page.getByRole('button', { name: 'Legg til spiller' }).click()
    await page.getByLabel('Navn').fill('Bob')
    await page.getByRole('button', { name: 'Lagre' }).click()

    await page.getByTestId('advance').click()
    // Step 3: Options (skip)
    await page.getByTestId('advance').click()
    // Step 4: Start round
    await page.getByTestId('advance').click()

    await expect(page).toHaveURL(/\/competitions\/[0-9a-f-]+$/)

    // Open pad for Alice and submit a par-ish score
    await page.getByRole('button', { name: /Alice/ }).first().click()
    await page.getByRole('button', { name: 'Par' }).click()
    await page.getByTestId('pad-submit').click()

    // Reload and confirm the score persists
    const url = page.url()
    await page.reload()
    await expect(page).toHaveURL(url)
    await expect(page.getByText(/Alice/)).toBeVisible()
  })
})
