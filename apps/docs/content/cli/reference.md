---
title: CLI Reference
description: Install and use the PreShip CLI for local and CI/CD accessibility scanning.
---

# CLI Reference

## Installation

```bash
npm install -g @preship/cli
```

## Commands

### preship scan <url>

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--checks` | `-c` | `accessibility` | Check types (comma-separated) |
| `--pages` | `-p` | `1` | Pages to crawl |
| `--threshold` | `-t` | -- | Min scores: `accessibility:90,performance:80` |
| `--format` | `-f` | `table` | Output: `table`, `json`, `markdown`, `junit` |
| `--output` | `-o` | -- | Write results to file |
| `--verbose` | `-v` | `false` | Show detailed issues |

### preship login
### preship config
### preship report <scan-id>
### preship projects

## Exit Codes

| Code | Description |
|------|-------------|
| 0 | Scan passed all thresholds |
| 1 | One or more thresholds failed |
| 2 | Scan failed or error occurred |

See the full MDX documentation at `src/app/cli/page.mdx` for complete examples.
