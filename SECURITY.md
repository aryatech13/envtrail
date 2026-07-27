# Security policy

## Supported versions

The latest minor release receives security fixes. Critical fixes may be
backported when the affected release remains widely used.

## Reporting a vulnerability

Please use GitHub's **Report a vulnerability** button in this repository's
Security tab. That creates a private advisory visible only to maintainers.

Include:

- affected version and platform;
- a minimal reproduction;
- realistic impact;
- whether environment values can be exposed; and
- any suggested mitigation.

Do not open a public issue for a vulnerability that could expose configuration
or credentials. Maintainers will acknowledge a complete report within seven
days and share a remediation plan after triage.

## Security boundaries

EnvTrail is static analysis, not a secret scanner. It deliberately refuses to
open live `.env` variants, but it does read source and deployment files selected
by discovery. Reports retain environment key names and source locations. Treat
reports as repository metadata and review them before publishing.
