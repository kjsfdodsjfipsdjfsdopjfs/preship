---
name: Infrastructure reference
description: Railway, Cloudflare, GitHub, domains, email, GA4, and service accounts for PreShip
type: reference
---

## Railway
- Dashboard: https://railway.com/project/690bf785-a1e7-4340-806a-962d46d5fa03
- Project ID: `690bf785-a1e7-4340-806a-962d46d5fa03`
- API service: `858e1fa6` → api.preship.dev
- Web service: `d125b8e1` (loving-joy) → preship.dev
- Postgres: `47511649`, Redis: `8f2ef052`
- Token: `998d780d-b0a7-43e6-a14f-acf7cf192d74`
- Environment ID: `3fdb7420-4cfa-4fed-8e67-fe7386b74188`

## Cloudflare
- Dashboard: https://dash.cloudflare.com
- Account ID: `986a06d4d920111d88972137107d0dd5`
- CNAME: `api` → `ghfeui40.up.railway.app` (DNS only)
- CNAME: `preship.dev` → `945priz4.up.railway.app` (DNS only)

## GitHub
- Repo: https://github.com/kjsfdodsjfipsdjfsdopjfs/preship.git
- Branch: main

## Custom domains
- Web: preship.dev, API: api.preship.dev
- SSL: Railway auto-cert, valid until 2026-06-15
- Registrar: GoDaddy, DNS: Cloudflare

## Google Analytics
- Measurement ID: **G-WPMEJ88G9C**
- Account: PreShip
- Property: preship.dev
- Env var: `NEXT_PUBLIC_GA_ID` set on Railway web service
- Cookie consent required before tracking (GDPR)

## Project Email
- Email: preshipdev@gmail.com
- Password: Preship111@
- App Password (SMTP/IMAP): `qvhacqjskiizccun`
- SMTP: smtps://smtp.gmail.com:465
- IMAP: imaps://imap.gmail.com:993
- 2FA: enabled, phone (11) 97583-4695

## Social Accounts
- Twitter/X: @preshipdev (created by Rodrigo)
- Reddit: not yet created
- Product Hunt: not yet created
- LinkedIn: not yet created

## Test Account (on preship.dev)
- Email: dev@preship.dev / Password: Shipdevtest123
- Plan: internal (999999 scans, unlimited)
- User ID: 86ad58c6-3971-4414-a64e-f182e4b280f5
- Admin endpoint: POST /internal/upgrade-plan (x-admin-secret = JWT_SECRET)
