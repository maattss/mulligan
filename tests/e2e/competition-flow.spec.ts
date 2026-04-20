import { expect, test } from '@playwright/test'

test.describe('Mulligan mobile flow', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies()
    await context.clearPermissions()
  })

  test('loads the scoreboard with the Mulligan chrome', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Mulligan/)
    await expect(page.getByRole('heading', { name: 'Scoreboard' })).toBeVisible()
    await expect(page.getByText('Bundled Courses')).toBeVisible()
  })

  test('creates players, starts a stroke-play round and persists scores', async ({ page }) => {
    await page.goto('/players')

    await page.getByRole('button', { name: 'Add the first player' }).click()
    await page.getByLabel('Name').fill('Alice')
    await page.getByRole('button', { name: 'Save Player' }).click()

    await page.getByRole('button', { name: 'Add Player' }).click()
    await page.getByLabel('Name').fill('Bob')
    await page.getByRole('button', { name: 'Save Player' }).click()

    await expect(page.getByRole('cell', { name: 'Alice' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Bob' })).toBeVisible()

    await page.goto('/competitions/new')
    await expect(page.getByText('Competition Basics')).toBeVisible()

    const includeSwitches = page.getByRole('switch')
    await includeSwitches.nth(0).click()
    await includeSwitches.nth(1).click()

    await page.getByRole('button', { name: 'Start Competition' }).click()
    await expect(page).toHaveURL(/\/competitions\/[0-9a-f-]+$/)

    await expect(page.getByText('Leaderboard · thru', { exact: false })).toBeVisible()

    const aliceRow = page.getByRole('button', { name: 'Edit score for Alice' })
    const bobRow = page.getByRole('button', { name: 'Edit score for Bob' })

    await aliceRow.click()
    await page.getByRole('button', { name: 'Digit 4' }).click()
    await page.getByRole('button', { name: 'Submit score' }).click()

    await bobRow.click()
    await page.getByRole('button', { name: 'Digit 5' }).click()
    await page.getByRole('button', { name: 'Submit score' }).click()

    await expect(aliceRow).toContainText('4')
    await expect(bobRow).toContainText('5')

    await expect(page.getByText('Leaderboard · thru 1')).toBeVisible()

    const competitionUrl = page.url()
    await page.reload()
    await expect(page).toHaveURL(competitionUrl)
    await expect(page.getByText('Leaderboard · thru 1')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Edit score for Alice' })).toContainText('4')
  })
})
