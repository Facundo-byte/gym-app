import { test, expect, activate, addAssignment, createRoutine, expectProgress } from './helpers.js'

const cases = [
  { name: 'Sunday/Monday and year boundary with UTC ahead of the local date', zone: 'America/Argentina/Buenos_Aires', instant: '2027-01-04T02:59:58Z', first: 'Sunday, January 3, 2027', next: 'Monday, January 4, 2027', gapInstant: '2027-01-05T03:00:01Z', gap: 'Tuesday, January 5, 2027', days: [7, 1], newWeek: true },
  { name: 'local Monday while UTC is Sunday, then next-day refresh', zone: 'Pacific/Auckland', instant: '2027-01-04T10:59:58Z', first: 'Monday, January 4, 2027', next: 'Tuesday, January 5, 2027', gapInstant: '2027-01-05T11:00:01Z', gap: 'Wednesday, January 6, 2027', days: [1, 2], newWeek: false },
  { name: 'leap day to the next month without rewriting completed training', zone: 'America/Argentina/Buenos_Aires', instant: '2028-03-01T02:59:58Z', first: 'Tuesday, February 29, 2028', next: 'Wednesday, March 1, 2028', gapInstant: '2028-03-02T03:00:01Z', gap: 'Thursday, March 2, 2028', days: [2, 3], newWeek: false },
  { name: 'midnight after a 23-hour daylight-saving day', zone: 'America/New_York', instant: '2026-03-09T03:59:58Z', first: 'Sunday, March 8, 2026', next: 'Monday, March 9, 2026', gapInstant: '2026-03-10T04:00:01Z', gap: 'Tuesday, March 10, 2026', days: [7, 1], newWeek: true },
]

for (const scenario of cases) {
  test.describe(scenario.name, () => {
    test.use({ timezoneId: scenario.zone })
    test('open midnight timer, date guard, visibility refresh and saved completion', async ({ page }) => {
      // Install before loading the app; leave enough simulated setup time before midnight.
      const midnight = new Date(scenario.instant)
      await page.clock.install({ time: new Date(midnight.getTime() - 30 * 60_000) })
      if (scenario.zone === 'Pacific/Auckland') {
        await page.goto('/')
        // UTC Sunday corresponds to local Monday before this test's midnight crossing.
        await page.clock.setSystemTime(new Date('2027-01-03T12:00:00Z'))
        await page.evaluate(() => window.dispatchEvent(new Event('focus')))
        await expect(page.getByText(scenario.first, { exact: true })).toBeVisible()
      }
      const path = await createRoutine(page, 'Calendar Plan', scenario.days)
      await addAssignment(page, path, scenario.days[0], 'Bench Press', { Sets: 3, Reps: 10, 'Target weight (kg)': 60 })
      await addAssignment(page, path, scenario.days[1], 'Bench Press', { Sets: 4, Reps: 8, 'Target weight (kg)': 70 })
      await page.goto('/')
      await expect(page.getByText(scenario.first, { exact: true })).toBeVisible()
      await page.clock.pauseAt(midnight)
      await activate(page, page.getByRole('button', { name: 'Finish workout: Calendar Plan', exact: true }))
      await expect(page.getByText('Workout completed and saved.', { exact: true })).toBeVisible()
      await expectProgress(page, 1, scenario.newWeek ? 1 : 2, scenario.newWeek ? 100 : 50)

      await page.clock.runFor(3100)
      await expect(page.getByText(scenario.next, { exact: true })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Finish workout: Calendar Plan', exact: true })).toBeEnabled()
      await expect(page.locator('.workout-exercise__targets')).toContainText('4 × 8')
      await expect(page.locator('.workout-exercise__targets')).toContainText('70 kg')
      await expectProgress(page, scenario.newWeek ? 0 : 1, 2, scenario.newWeek ? 0 : 50)

      // A card carrying the previous local date must never complete after a clock change.
      await page.clock.setSystemTime(new Date(scenario.gapInstant))
      await activate(page, page.getByRole('button', { name: 'Finish workout: Calendar Plan', exact: true }))
      await expect(page.getByRole('alert')).toContainText('The workout date has changed')
      await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
      await expect(page.getByText(scenario.gap, { exact: true })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Rest day', exact: true })).toBeVisible()
      await expectProgress(page, scenario.newWeek ? 0 : 1, 2, scenario.newWeek ? 0 : 50)
      // Reload initializes an asynchronous React chunk; allow its startup timers to run.
      // All controlled midnight/date-guard assertions above remain on the paused clock.
      await page.clock.resume()
      await page.reload()
      await expect(page.getByText(scenario.gap, { exact: true })).toBeVisible()
      await expectProgress(page, scenario.newWeek ? 0 : 1, 2, scenario.newWeek ? 0 : 50)
      if (!scenario.newWeek) await expect(page.locator('.weekday-strip > li').nth(scenario.days[0] - 1)).toHaveAttribute('aria-label', /Completed\. 1 of 1/)
    })
  })
}
