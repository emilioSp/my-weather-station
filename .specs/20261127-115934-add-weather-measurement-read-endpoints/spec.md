# 20261127-115934-add-weather-measurement-read-endpoints: Add weather measurement read endpoints

## Requirements

Both endpoints keep PostgreSQL column names in their JSON responses. Chart history keys keep the exact stored device names.

### REQ1: The API MUST return the latest measurement for the requested device

Delta: added

`GET /get-latest-measure` takes a required, nonblank `device_name`. Match the stored device name exactly. On success, return HTTP `200` with a single measurement object or JSON `null` if there is no matching row.

Verified by: [AC1](#ac1-latest-reading-for-the-requested-device), [AC2](#ac2-no-reading-for-the-requested-device), [AC3](#ac3-invalid-device-name)

#### AC1: Latest reading for the requested device

- GIVEN PostgreSQL has multiple readings for one device and a newer reading for another
- WHEN the caller requests the first device's latest measurement
- THEN the API returns HTTP `200` with the first device's newest measurement as an object

| Stored readings | Request | Response |
| --- | --- | --- |
| Kitchen at 09:00 (18 °C) and 10:00 (20 °C), garden at 11:00 (12 °C), all on January 2, 2026 UTC | `GET /get-latest-measure?device_name=kitchen` | `200`, one measurement object with `"device_name": "kitchen"`, `measured_at` at 10:00 UTC, and `"temperature": 20` |

#### AC2: No reading for the requested device

- GIVEN no readings exist for the requested device
- WHEN the caller requests its latest measurement
- THEN the API returns HTTP `200` with JSON `null`

| Stored readings | Request | Response |
| --- | --- | --- |
| Kitchen has a reading; office has none | `GET /get-latest-measure?device_name=office` | `200`, `null` |

#### AC3: Invalid device name

- GIVEN the API accepts latest-measurement requests
- WHEN the caller omits the device name or supplies a blank value
- THEN the API returns HTTP `400`

| Request | Status |
| --- | --- |
| `GET /get-latest-measure` | `400` |
| `GET /get-latest-measure?device_name=%20` | `400` |

### REQ2: The API MUST return chart history grouped by device for the effective date range

Delta: added

`GET /get-chart-history` takes a required `start_date` and an optional `end_date`. Both are ISO 8601 timestamps with an explicit time zone. Readings at both effective bounds are included. On success, return HTTP `200` with an object keyed by device name, with readings oldest first per device.

Verified by: [AC4](#ac4-grouped-history-with-inclusive-bounds), [AC5](#ac5-empty-history), [AC6](#ac6-invalid-history-parameters)

#### AC4: Grouped history with inclusive bounds

- GIVEN different devices have readings inside the range, at the bounds, and outside the range
- WHEN the caller requests chart history for the range
- THEN the API returns HTTP `200` with the in-range readings in time order under their device names

| Stored readings on January 2, 2026 UTC | History query | Response |
| --- | --- | --- |
| Kitchen at 08:59, 09:00, and 10:00; `back_yard` at 09:30 and 10:01 | `start_date=2026-01-02T09:00:00Z&end_date=2026-01-02T10:00:00Z` | `200`, `kitchen` with two readings (`measured_at` at 09:00 then 10:00); `back_yard` with one reading (`measured_at` at 09:30) |

#### AC5: Empty history

- GIVEN no readings are within the effective range
- WHEN the caller requests chart history
- THEN the API returns HTTP `200` with an empty JSON object

| Stored readings | History query | Response |
| --- | --- | --- |
| One kitchen reading at `2026-01-03T09:00:00Z` | `start_date=2026-01-02T09:00:00Z&end_date=2026-01-02T10:00:00Z` | `200`, `{}` |

#### AC6: Invalid history parameters

- GIVEN the API accepts history requests
- WHEN the caller sends a missing start, an invalid timestamp, or a start after the requested end
- THEN the API returns HTTP `400`

| History query | Status |
| --- | --- |
| `end_date=2026-01-02T10:00:00Z` | `400` |
| `start_date=2026-01-02T09:00:00` | `400` |
| `start_date=2026-01-02T09:00:00Z&end_date=` | `400` |
| `start_date=2026-01-02T10:00:00Z&end_date=2026-01-02T09:00:00Z` | `400` |

### REQ3: The API MUST resolve the effective chart history range

Delta: added

Use the current time when `end_date` is omitted. If a supplied end is in the future, cap it at the current time. Keep at most 31 days ending at that effective end, by moving the start forward if needed. Use one current-time value per request.

Verified by: [AC7](#ac7-omitted-end_date-uses-the-current-time), [AC8](#ac8-future-end-is-capped-at-the-current-time), [AC9](#ac9-long-range-keeps-the-last-31-days)

#### AC7: Omitted end_date uses the current time

- GIVEN readings exist at and after the current time
- WHEN the caller requests history without an end
- THEN the API uses the current time as the inclusive end

| Current time | Stored kitchen readings on January 2, 2026 UTC | History query | Returned kitchen readings |
| --- | --- | --- | --- |
| `2026-01-02T10:00:00Z` | 09:00, 10:00, 10:01 | `start_date=2026-01-02T09:00:00Z` | 09:00 and 10:00 UTC |

#### AC8: Future end is capped at the current time

- GIVEN readings exist at and after the current time
- WHEN the caller requests history ending in the future
- THEN the API excludes readings after the current time

| Current time | Stored kitchen readings on January 2, 2026 UTC | History query | Returned kitchen readings |
| --- | --- | --- | --- |
| `2026-01-02T10:00:00Z` | 09:00, 10:00, 10:01 | `start_date=2026-01-02T09:00:00Z&end_date=2026-01-02T11:00:00Z` | 09:00 and 10:00 UTC |

#### AC9: Long range keeps the last 31 days

- GIVEN readings exist around the 31-day cutoff for a past end
- WHEN the caller requests more than 31 days of history
- THEN the API includes only the readings within the last 31 days of the range

| Current time | Stored kitchen readings (UTC) | History query | Returned kitchen readings (UTC) |
| --- | --- | --- | --- |
| July 1, 2026 00:00 | April 30 23:59, May 1 00:00, June 1 00:00 | `start_date=2026-01-01T00:00:00Z&end_date=2026-06-01T00:00:00Z` | May 1 00:00 and June 1 00:00 |
