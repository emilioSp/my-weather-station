---
type: Roadmap
id: 'R-11'
title: 'Replace PostgREST with a small Node.js backend'
status: later
---

## Objective

Remove PostgREST from the dashboard's data path. Add a small Node.js service that uses Knex to read current measurements and chart history from the existing Supabase
PostgreSQL database. Decide whether to use an external hosting provider or run the service on existing infrastructure.

**Why replace PostgREST?**

On November 25, 2026, the Supabase Data API returned `HTTP 504 / PGRST003` for all three sensors' latest-reading requests. PostgREST timed out waiting for a connection
from its internal PostgreSQL pool, before the queries could run. The dashboard could not load the readings and never reached the chart history request. The collector kept
writing through Knex, which connects to PostgreSQL without going through PostgREST.

A database snapshot during the incident showed eight client connections. The only visible PostgREST `authenticator` session was idle on `LISTEN "pgrst"`, with no open
transaction or blocking PID, and the role had no connection limit. The cause of the pool timeout remains unknown. The evidence does not establish a bug in `supabase-js`
or PostgreSQL 18, or show that earlier incidents had the same cause. The proposed service would bypass the layer that timed out without replacing the database.

**Hosting decision**

The API is deployed on Render Free at <https://my-weather-station-api.onrender.com/>. The dashboard still needs to switch from PostgREST to this API.

**Hosting options considered**

Starting prices below are planning estimates from the hosting comparison.

| Provider                                                                       |               Starting price | What to expect                                                                                             |
| ------------------------------------------------------------------------------ | ---------------------------: | ---------------------------------------------------------------------------------------------------------- |
| [DigitalOcean App Platform](https://www.digitalocean.com/pricing/app-platform) |                     $5/month | Always-on managed Node.js service                                                                          |
| [Koyeb](https://www.koyeb.com/pricing)                                         |                    Free tier | Managed Node.js hosting with idle suspension on the free tier                                              |
| [Fly.io](https://fly.io/pricing/)                                              |            About $2.19/month | Small VM with configurable auto-stop. Pricing varies by region                                             |
| [Scalingo](https://scalingo.com/pricing)                                       |                  €7.20/month | Always-on managed container                                                                                |
| [Clever Cloud](https://www.clever.cloud/pricing/)                              |                  Usage-based | Managed Node.js hosting with trial credits                                                                 |
| [Google Cloud Run](https://cloud.google.com/run/pricing)                       | Usage-based with a free tier | Managed container that can scale to zero                                                                   |
| [Vercel Hobby](https://vercel.com/docs/plans/hobby)                            |        Free for personal use | Node.js functions with database pooling to manage                                                          |
| [Render](https://render.com/pricing)                                           |                    Free tier | Managed Node.js service; free instances spin down after 15 minutes idle. Always-on Starter costs $7/month. |
| [Heroku Basic](https://www.heroku.com/pricing/)                                |                     $7/month | Always-on managed Node.js service                                                                          |
| [Hetzner Cloud](https://www.hetzner.com/cloud/)                                | About €5.49/month before VAT | Self-managed European VPS                                                                                  |
| [AWS Lightsail](https://aws.amazon.com/lightsail/pricing/)                     |                     $5/month | Self-managed VPS with predictable pricing                                                                  |

## Completed When

The dashboard loads current readings and chart history through the Node.js service without using PostgREST, and the hosting decision is recorded.
[ADR-005](../adr/0005-replace-postgrest-with-a-nodejs-backend.md) records the decision to replace PostgREST for dashboard reads.
