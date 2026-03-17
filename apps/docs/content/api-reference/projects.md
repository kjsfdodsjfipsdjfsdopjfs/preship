---
title: Projects API
description: Create, manage, and track projects for ongoing accessibility monitoring.
---

# Projects API

## POST /api/v1/projects - Create a Project

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Project display name |
| `url` | string | Yes | Base URL to monitor |
| `checks` | string[] | No | Default check types |
| `schedule` | string | No | Cron expression for automated scanning |
| `thresholds` | object | No | Minimum score thresholds |

## GET /api/v1/projects - List Projects
## GET /api/v1/projects/:id - Get a Project
## GET /api/v1/projects/:id/history - Get Project History
## PATCH /api/v1/projects/:id - Update a Project
## DELETE /api/v1/projects/:id - Delete a Project

See the full MDX documentation at `src/app/api-reference/projects/page.mdx` for complete examples with curl, JavaScript, and Python.
