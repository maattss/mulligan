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
    // Step 3: Options (default 100% allowance for stableford)
    await expect(page.getByText('100% handicap-tildeling')).toBeVisible()
    await page.getByTestId('advance').click()
    // Step 4: Start round
    await page.getByTestId('advance').click()

    await expect(page).toHaveURL(/\/competitions\/[0-9a-f-]+$/)

    const aliceRow = page.getByRole('button', { name: /Alice/ }).first()

    // Open pad for Alice — quick-pick "Par" auto-saves and closes the pad
    await aliceRow.click()
    await page.getByTestId('pad-quick').filter({ hasText: 'Par' }).click()
    await expect(aliceRow).toContainText('Par')

    // Reload and confirm the score persists
    const url = page.url()
    await page.reload()
    await expect(page).toHaveURL(url)
    await expect(page.getByRole('button', { name: /Alice/ }).first()).toContainText('Par')
  })
})
