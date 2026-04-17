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

    await expect(page.getByRole('tab', { name: 'Score' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Leaderboard' })).toBeVisible()

    const scoreInputs = page.locator('input[type="number"]')
    await expect(scoreInputs).toHaveCount(2)

    const firstPlus = scoreInputs.nth(0).locator('..').getByRole('button').nth(1)
    const secondPlus = scoreInputs.nth(1).locator('..').getByRole('button').nth(1)

    await firstPlus.click()
    await secondPlus.click()

    await expect(scoreInputs.nth(0)).toHaveValue('5')
    await expect(scoreInputs.nth(1)).toHaveValue('5')

    await page.getByRole('tab', { name: 'Leaderboard' }).click()
    await expect(page.getByText('1 holes logged').first()).toBeVisible()

    const competitionUrl = page.url()
    await page.reload()
    await expect(page).toHaveURL(competitionUrl)
    await expect(page.getByRole('tab', { name: 'Score' })).toBeVisible()
    await page.getByRole('tab', { name: 'Leaderboard' }).click()
    await expect(page.getByText('1 holes logged').first()).toBeVisible()
  })
})
