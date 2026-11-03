# Refresh the dashboard automatically

Starting point: [original proposal](../20261103-090348-refresh-the-dashboard-automatically/proposal.md) and [original specification](../20261103-090348-refresh-the-dashboard-automatically/spec.md). The required behavior is carried forward unchanged.

## Problem

The open dashboard becomes stale unless the owner presses Refresh readings or reloads the page.

## Goal and scope

Deliver [R-10](../../ROADMAP.md#r-10-refresh-the-dashboard-automatically): keep the dashboard up to date without user action, using periodic data requests rather than page reloads. Make refresh failures recoverable while keeping the refresh control visible. Show errors instead of retaining stale data in the failed section.

## Out of scope

Changes to meter collection, stored measurements, unrelated dashboard features, and dependency versions. No host dependency installation is authorized. Existing locked dependencies may be installed in disposable Docker volumes for visual verification.

## Required behavior

See [spec.md](spec.md).
