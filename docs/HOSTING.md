# Cloud Hosting Options for Next.js with SQLite

## Overview

| Platform | Free Tier | Paid Starting | SQLite Support | Best For |
|----------|-----------|---------------|----------------|----------|
| Vercel | Yes (limited) | $20/user/mo | No (serverless) | Static/Serverless |
| Railway | $5/mo credits | $5/mo | Yes (volumes) | Full-stack apps |
| Render | Yes | $7/mo | Yes (disks) | Simple deployments |
| Fly.io | Trial only | ~$5/mo | Yes (volumes) | Global latency |
| Supabase | Yes | $25/mo | No (Postgres) | Scale + features |

---

## 1. Vercel

### Hobby Tier Limits
| Resource | Limit |
|----------|-------|
| Function Invocations | 1,000,000/mo |
| Function Duration | 100 GB-hours/mo |
| Provisioned Memory | 360 GB-hours/mo |
| Bandwidth | 100 GB/mo (Pro: unlimited with $20 credit) |
| Build Minutes | 6,000 min/mo |

### What Happens When Exceeded
- Functions: Served with 500 errors until cycle resets
- Build minutes: Builds fail until next month
- Usage-based billing kicks in on Pro plan

### SQLite Gotchas
**SQLite does NOT work reliably on Vercel serverless:**

1. **Ephemeral filesystem**: Each function invocation gets a fresh filesystem. SQLite database in `/data` will be empty on every request.

2. **No persistent storage**: Serverless functions cannot persist files between invocations.

3. **better-sqlite3 specifically**: This package uses native bindings that may not work in Vercel's Edge Runtime and has compatibility issues with serverless environments.

4. **Workarounds exist but are complex**:
   - Use Vercel KV (Redis) or Blob for file storage
   - External database service (PlanetScale, Neon, Supabase)
   - SQLite on Vercel Edge with libSQL (limited)

**Verdict**: Do NOT use SQLite on Vercel serverless. Migrate to a managed database or use a different hosting platform.

---

## 2. Railway

### Free Tier Limits
| Resource | Limit |
|----------|-------|
| Monthly Credits | $5 (new users: $20 via referral) |
| Storage | 1GB (shared) |
| Active Services | 1 (on hobby plan) |
| Sleep | 7 days inactivity = suspended |

### Pricing (Beyond Free)
| Resource | Price |
|----------|-------|
| Compute (1GB RAM, 0.5 CPU) | ~$5/mo |
| Additional RAM | $2/GB/mo |
| Additional CPU | $4/vCPU/mo |
| Storage (volume) | $10/GB/mo |
| Outbound Bandwidth | $0.10/GB |

### SQLite Support
- **Persistent disks**: Yes, volumes mount to `/data`
- **Setup**: Create a volume, mount to your service, store SQLite file there
- **Pros**: Simple, persistent, works with better-sqlite3
- **Cons**: Volume storage costs extra

### Example Cost for Your App
- 1 service (512MB RAM): ~$3/mo
- 1GB volume for SQLite: $10/mo
- **Total**: ~$13/mo

---

## 3. Render

### Free Tier Limits
| Resource | Limit |
|----------|-------|
| Web Services | 1 free |
| Sleep After Inactivity | 15 minutes |
| Bandwidth | 100 GB/mo |
| Custom Domains | 1 |
| Build Minutes | 500 min/mo |

### Sleep/Wake Behavior
- **Auto-sleep**: After 15 minutes of no requests
- **Cold start**: ~25 seconds to wake up
- **Workaround**: Use cron-job.org to ping every 5 minutes

### SQLite Support
- **Persistent disks**: Only on **paid** plans ($7+/mo)
- **Free tier**: Ephemeral filesystem - SQLite data lost on redeploy/restart
- **Workaround for free**: Not recommended for SQLite

### Pricing (Paid)
| Service | Price |
|---------|-------|
| Web Service (512MB) | $7/mo |
| Persistent Disk (1GB) | $1/GB/mo |
| PostgreSQL (free tier available) | Free |

---

## 4. Fly.io

### Free Tier Status
**As of 2024, Fly.io no longer offers free tier for new users.**

- New signups: 2-hour trial (or 7 days)
- Legacy hobby plans: May still exist
- No free VMs currently

### Pricing
| Resource | Price |
|----------|-------|
| Shared CPU (1GB RAM) | $1.94/mo |
| Volume Storage | $0.15/GB/mo |
| Outbound Bandwidth | $0.02/GB |

### SQLite Support
- **Volumes**: Yes, persistent storage
- **Setup**: Create volume, mount to `/data`
- **Example**: 3 shared VMs + 1GB volume = ~$6/mo

### Pros
- Global edge deployment (multiple regions)
- Low latency for international users
- Persistent storage works well

### Cons
- More complex setup than Railway/Render
- No free tier
- Bandwidth can get expensive at scale

---

## 5. Supabase

### Free Tier Limits
| Resource | Limit |
|----------|-------|
| Database (Nano) | 500MB |
| API Requests | Unlimited |
| Auth Users | 50,000/mo |
| Storage | 1GB |
| Bandwidth | 5GB/mo |

### Connection Pooling
| Compute Size | Direct Connections | Pooler Connections |
|--------------|-------------------|-------------------|
| Nano (free) | 60 | 200 |

**Connection pooling is built-in** via Supavisor - handles connection limits automatically for serverless/Next.js.

### SQLite to Postgres Migration
Your app uses **better-sqlite3**. Migration to Postgres considerations:

1. **Prisma/ drizzle-orm**: Switch ORM to support Postgres
2. **SQL differences**: Some SQLite-specific queries may need adjustment
3. **next-auth**: Works with Postgres (requires adapter)
4. **Image uploads**: Use Supabase Storage (replaces `/public/uploads`)

### Pricing (Beyond Free)
| Tier | Price |
|------|-------|
| Nano | $0/mo |
| Micro | $25/mo |
| Small | $50/mo |

---

## 6. Recommendation

### For Small Personal Project (< 100 users)

**Recommended: Railway**

| Pros | Cons |
|------|------|
| $5/mo is very affordable | Volume storage adds cost |
| Persistent SQLite works | Sleeps after 7 days inactive |
| Simple setup | |
| Git deploy | |

**Alternative: Render (free tier)**

- If you can tolerate 15-min sleep cycles
- Use external database for SQLite persistence
- Best for: prototypes, demos

### For Project Expecting 1000+ Users

**Recommended: Railway (paid) or Supabase**

#### Railway (Paid)
- Cost: ~$13-20/mo (service + volume)
- Predictable pricing
- Full control over SQLite

#### Supabase (Postgres)
- Cost: $25/mo (Micro tier)
- Handles scaling automatically
- Built-in auth, storage, real-time
- Requires Postgres migration

**Migration path**: If you expect growth, consider migrating from SQLite to Supabase now - the connection pooling and managed scaling will save headaches later.

---

## Quick Decision Matrix

| Scenario | Choice |
|----------|--------|
| Stay on Vercel, switch to Postgres | Supabase |
| Keep SQLite, cheap full hosting | Railway |
| Want free, tolerate sleep | Render |
| Need global latency | Fly.io |
| Expect 1000+ users soon | Supabase |
