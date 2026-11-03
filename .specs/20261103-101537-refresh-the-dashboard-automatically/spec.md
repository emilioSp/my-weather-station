# Refresh the dashboard automatically

Scope: [proposal.md](proposal.md).

## Requirements

### REQ1: Automatic refresh interval

Delta: added

While the dashboard is open, perform a refresh every 60 seconds without reloading the page. The first tick is 60 seconds after opening the dashboard. Manual refresh and data or history-range changes do not restart the timer.

Keep the timer active in hidden tabs, subject to browser timer delays and device sleep. Returning to the page does not trigger an extra refresh; delivery of an overdue browser timer is not an extra visibility-triggered refresh.

Verified by: [AC1](#ac1-refresh-follows-the-60-second-schedule), [AC2](#ac2-tab-visibility-does-not-change-the-schedule).

#### AC1: Refresh follows the 60-second schedule

1. Probe: Open the dashboard with successful initial requests. Observe requests through two timer ticks, with a completed manual refresh and a history-range change between ticks.
2. Expected result: Each tick starts one refresh at the original 60-second boundaries, without a page reload or user action.
3. Example: Open at t=0; no automatic refresh occurs by t=59. One starts at t=60. Complete a manual refresh at t=80 and change to Last day at t=90. The next automatic refresh starts at t=120, not t=140 or t=150.

#### AC2: Tab visibility does not change the schedule

1. Probe: With browser timers allowed to run, hide the dashboard through a scheduled tick and then return before the next tick.
2. Expected result: The normal timer remains active, with no additional request caused by returning to the tab.
3. Example: Open at t=0, hide at t=20, and allow the t=60 refresh to complete while hidden. Return at t=70. There is no refresh at t=70; the next starts at t=120.

### REQ2: Use the manual refresh action

Delta: added

Automatic refresh performs the same action as pressing Refresh readings for every configured meter. Update the cards and latest measurement time from successful readings. When readings change, load chart history for the selected range so plotted values and metric low/high values and dates reflect the returned history. Keep the selected range.

As with the existing manual action, unchanged reading IDs do not cause a history reload when history is already successfully loaded. Failed-history recovery is specified in REQ4.

Verified by: [AC3](#ac3-automatic-refresh-updates-current-readings), [AC4](#ac4-automatic-refresh-updates-history-for-the-selected-range), [AC5](#ac5-unchanged-readings-do-not-reload-successful-history). Existing manual-action coverage: [weather-station.spec.ts](../../packages/web/e2e/weather-station.spec.ts), “given updated readings when refreshing twice then shows changed values and retains them on the unchanged response”; [metric-extreme-dates.spec.ts](../../packages/web/e2e/metric-extreme-dates.spec.ts), “given newer readings and history when refreshing then updates the maximum date and value”.

#### AC3: Automatic refresh updates current readings

1. Probe: Load configured meters with known readings, then return different reading IDs and values at a scheduled tick without clicking Refresh readings.
2. Expected result: The displayed current-reading snapshot, including the latest measurement time, reflects the new response for each configured meter.
3. Example: Garden initially shows 25.0°C and kitchen 20.0°C at 2026-10-06T10:00:00Z. At t=60 their new readings are 26.0°C and 21.0°C at 2026-10-06T12:00:00Z. Both cards show the new values and the header shows 06 Oct · 14:00:00 in Europe/Rome.

#### AC4: Automatic refresh updates history for the selected range

1. Probe: Select Last 6 hours, then let an automatic refresh receive newer readings and history containing changed temperature, humidity, and dew point extremes.
2. Expected result: History is refreshed for the still-selected six-hour range, including plotted measurements and each metric's low/high values and dates.
3. Example: Garden history has readings at 2026-10-06T10:00:00Z with temperature 25, humidity 70, dew point 12, and at 12:00:00Z with temperature 26, humidity 71, dew point 13. After the automatic refresh, Last 6 hours remains selected, the history query spans 06:00:00Z to 12:00:00Z, and the charts include both points. Lows are 25.0°C, 70%, and 12.0°C at 06 Oct · 12:00; highs are 26.0°C, 71%, and 13.0°C at 06 Oct · 14:00, all in Europe/Rome.

#### AC5: Unchanged readings do not reload successful history

1. Probe: With successfully loaded history, return the same latest reading IDs at an automatic tick.
2. Expected result: No additional history request is made.
3. Example: Garden reading ID ending 0017 and kitchen reading ID ending 0027 are unchanged at t=60. The history-request count remains at its pre-tick value.

### REQ3: Keep the refresh button visible

Delta: modified

Before: initial current-reading loading and current-reading errors replace the dashboard with pages that do not contain the refresh button.

Keep Refresh readings visible during initial loading, empty data, successful display, and errors. Availability while busy is governed by REQ5.

Verified by: [AC6](#ac6-the-refresh-control-remains-visible).

#### AC6: The refresh control remains visible

1. Probe: Observe initial loading, an initial readings error, an empty successful response, a populated response, and a later refresh error.
2. Expected result: Refresh readings is visible in every state.
3. Example: Hold the initial request pending, then return “Latest readings unavailable”. The button is visible before and after that response. It remains visible after retries return an empty result, then a 26.0°C reading, then another error.

### REQ4: Show errors and recover after refresh failures

Delta: modified

Before: a later refresh does not retry failed history when latest reading IDs are unchanged.

For both manual and automatic refresh failures, show the error instead of the failed section's data. A current-readings failure replaces the cards and history with the readings error. A history failure replaces the charts with the history error while current-reading cards remain visible. Do not show previously loaded data in place of the failed section. The refresh button remains visible as required by REQ3.

Retry on the next normal 60-second tick, including after initial-load failures and failed history requests with unchanged reading IDs. Manual retry remains available when idle. Clear the relevant error after successful recovery.

Verified by: [AC7](#ac7-readings-failures-replace-dashboard-content-with-an-error), [AC8](#ac8-history-failures-replace-charts-with-an-error), [AC9](#ac9-readings-errors-recover-on-the-next-tick), [AC10](#ac10-history-errors-recover-with-unchanged-reading-ids), [AC11](#ac11-manual-retry-remains-available-after-errors).

#### AC7: Readings failures replace dashboard content with an error

1. Probe: Load readings and history successfully, then fail a current-readings request. Exercise both manual and automatic refresh.
2. Expected result: The readings error replaces the current-reading cards and history content.
3. Example: Garden shows 25.0°C with a chart high of 25.0°C at 06 Oct · 12:00. A refresh returns “Latest readings unavailable”. That message is shown instead of the cards and history; the old 25.0°C reading and chart are not displayed.

#### AC8: History failures replace charts with an error

1. Probe: Load history successfully, then return newer current readings followed by a failed history request. Exercise both manual and automatic refresh.
2. Expected result: The history error replaces the charts without replacing the current-reading cards.
3. Example: Garden's chart high is 25.0°C at 06 Oct · 12:00. The next refresh receives a newer 26.0°C reading but history returns “Chart history unavailable”. The card shows 26.0°C and the history area shows that error instead of the old charts.

#### AC9: Readings errors recover on the next tick

1. Probe: Fail the initial readings request and, separately, a refresh after a successful load. Restore successful readings before the next timer tick.
2. Expected result: The next scheduled refresh replaces the readings error with the successfully loaded data without user action.
3. Example: A request fails at t=0 or a scheduled refresh fails at t=60 with “Latest readings unavailable”. Restore Garden's 26.0°C reading before the respective next tick, t=60 or t=120. That tick displays 26.0°C and removes the readings error.

#### AC10: History errors recover with unchanged reading IDs

1. Probe: Fail the initial history request and, separately, a later history refresh. Restore history while continuing to return the same latest reading IDs.
2. Expected result: The next scheduled refresh retries history and replaces its error with the successful chart data.
3. Example: Latest Garden ID ending 0017 is loaded, but history fails with “Chart history unavailable”. At the next tick the same ID is returned and history is available with a 26.0°C high at 06 Oct · 14:00. The chart shows that high and date, and the history error disappears.

#### AC11: Manual retry remains available after errors

1. Probe: After a readings error and, separately, a history error, restore the failed service and press Refresh readings before the next automatic tick.
2. Expected result: Manual refresh recovers the failed part immediately rather than waiting for the timer.
3. Example: At t=60 a readings request fails; restore a 26.0°C response and click at t=75. The card shows 26.0°C before t=120. For a history error with unchanged latest IDs, a click at t=75 reloads the available chart and clears that error before t=120.

### REQ5: Prevent overlapping refreshes

Delta: modified

Before: the manual refresh button is disabled during latest-reading refresh and its minimum spinner time, but not necessarily until the dependent history request finishes.

Allow only one refresh at a time, including dependent chart requests. Do not start a refresh while initial data loading is still pending. Keep the button visible but disabled while busy. Skip timer ticks during pending work rather than queuing another refresh; resume at the next normal tick.

Verified by: [AC12](#ac12-busy-ticks-are-skipped-without-queuing), [AC13](#ac13-the-button-is-disabled-until-refresh-work-finishes).

#### AC12: Busy ticks are skipped without queuing

1. Probe: Hold initial loading, a manual refresh, and an automatic refresh pending across a timer tick. Cover pending readings and dependent history responses.
2. Expected result: No additional refresh starts while busy or immediately upon completion of the pending work.
3. Example: A manual refresh starts at t=55 and its history response completes at t=75. The t=60 tick makes no new readings request; completion at t=75 starts no queued refresh. The next refresh starts at t=120. The same exclusion applies if the pending work was initial loading or an automatic refresh.

#### AC13: The button is disabled until refresh work finishes

1. Probe: Hold readings pending, then release changed readings while holding the dependent history response pending, and finally complete or fail that response. Exercise initial loading, manual refresh, and automatic refresh.
2. Expected result: The visible refresh button is disabled throughout the pending work and becomes enabled after it finishes.
3. Example: A refresh starts at t=60; readings complete at t=61 and history completes or fails at t=70. Refresh readings is disabled at t=60 and t=65, and enabled once the refresh finishes at t=70.
