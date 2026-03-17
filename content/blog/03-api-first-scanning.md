# API-First Scanning: Why Your CI/CD Pipeline Needs a Quality Gate

*Published on preship.dev/blog*

---

Manual QA made sense when development cycles lasted months. A team would build features, hand them to a QA engineer, wait for a report, fix the issues, and repeat. The process was slow, expensive, and entirely dependent on human attention to detail.

That model is dead. Modern development moves too fast for manual quality assurance to keep pace. When a solo developer can ship a complete application in a weekend using AI coding tools, there is no room in the workflow for a three-day manual audit cycle.

But speed without quality is just shipping bugs faster. The answer is not to slow down. It is to automate quality assurance and embed it directly into the deployment pipeline.

## The Problem with Traditional Scanning Tools

Most accessibility, security, and performance scanning tools were designed for a different era. They assume a human will navigate to a dashboard, configure a scan, wait for results, and manually interpret findings. Some require browser extensions. Others demand authenticated access to a web portal. Nearly all produce reports designed for human consumption rather than programmatic processing.

This creates friction at every step. Developers do not run scans because the tools are not in their workflow. When they do run scans, the results arrive in PDF reports or dashboard views that cannot be automatically parsed, compared, or acted upon.

The result is predictable: scanning happens occasionally rather than continuously. Issues accumulate. Regressions ship undetected. Quality degrades over time.

## The API-First Approach

An API-first scanning platform treats quality assurance as a programmable service. Instead of navigating a dashboard, you make an HTTP request. Instead of reading a PDF, you parse a JSON response. Instead of manually scheduling scans, you trigger them automatically on every deployment.

This is the core design principle behind PreShip. Every feature is accessible through a REST API. There is no dashboard you are required to use, no browser extension to install, no manual workflow to follow.

A scan is a single HTTP request:

```bash
curl -X POST https://api.preship.dev/v1/scan \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-app.vercel.app",
    "checks": ["accessibility", "security", "performance"]
  }'
```

The response is structured JSON containing scores for each dimension, individual findings with severity levels and DOM locations, and actionable fix recommendations:

```json
{
  "scores": {
    "accessibility": 42,
    "security": 67,
    "performance": 55
  },
  "findings": [
    {
      "type": "accessibility",
      "severity": "critical",
      "rule": "image-alt",
      "message": "Image element missing alt attribute",
      "selector": "main > section:nth-child(2) > img",
      "fix": "Add descriptive alt text: alt=\"Description of image content\""
    }
  ],
  "summary": {
    "critical": 8,
    "major": 14,
    "minor": 23,
    "total": 45
  }
}
```

Every field is machine-readable. Every finding can be programmatically routed, filtered, and tracked.

## Integration with GitHub Actions

The most powerful use of an API-first scanner is as a deployment gate in your CI/CD pipeline. Here is a GitHub Actions workflow that blocks deployment when quality scores fall below acceptable thresholds:

```yaml
name: PreShip Quality Gate
on:
  pull_request:
    branches: [main]

jobs:
  quality-check:
    runs-on: ubuntu-latest
    steps:
      - name: Wait for preview deployment
        uses: actions/github-script@v7
        id: preview
        with:
          script: |
            // Wait for Vercel/Netlify preview URL

      - name: Run PreShip scan
        id: scan
        run: |
          RESULT=$(curl -s -X POST https://api.preship.dev/v1/scan \
            -H "Authorization: Bearer ${{ secrets.PRESHIP_API_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"url": "${{ steps.preview.outputs.url }}"}')

          echo "accessibility=$(echo $RESULT | jq '.scores.accessibility')" >> $GITHUB_OUTPUT
          echo "security=$(echo $RESULT | jq '.scores.security')" >> $GITHUB_OUTPUT

      - name: Enforce quality gate
        run: |
          if [ "${{ steps.scan.outputs.accessibility }}" -lt 80 ]; then
            echo "Accessibility score below threshold"
            exit 1
          fi
          if [ "${{ steps.scan.outputs.security }}" -lt 70 ]; then
            echo "Security score below threshold"
            exit 1
          fi
```

This workflow runs on every pull request. It waits for the preview deployment to go live, triggers a PreShip scan against the preview URL, and fails the check if scores drop below configured thresholds. No manual intervention required. No dashboard to check. Quality enforcement happens automatically.

## Beyond CI/CD

An API-first architecture unlocks use cases that dashboard-based tools cannot support:

**Scheduled monitoring.** Run scans on a cron schedule against production URLs. Detect regressions from third-party script changes, CMS content updates, or infrastructure modifications that bypass your deployment pipeline.

**Multi-tenant scanning.** If you operate a platform where users build sites or applications, scan their output programmatically. Surface quality scores in your own dashboard. Offer accessibility compliance as a platform feature.

**Custom reporting.** Pull scan results into your existing observability stack. Track quality scores in Datadog, alert on regressions in PagerDuty, graph trends in Grafana. The data is yours to route however you want.

**AI-assisted remediation.** Feed PreShip findings back into your AI coding tool. Use the structured output to generate targeted fix prompts. Close the loop between detection and resolution automatically.

## Quality as Code

The shift from manual QA to automated quality gates mirrors the broader infrastructure-as-code movement. Just as Terraform made infrastructure reproducible and version-controlled, API-first scanning makes quality assurance reproducible and enforceable.

Every scan is logged. Every score is tracked. Every regression is caught. Quality becomes a first-class part of your development workflow rather than an afterthought checked occasionally before a major release.

**Get your API key at [preship.dev](https://preship.dev).** Start with the free tier — 50 scans per month, no credit card required. Add quality gates to your pipeline in under five minutes.
