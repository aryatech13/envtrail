# Governance

EnvTrail uses a maintainer-led, contribution-driven model.

## Decisions

Routine bug fixes, adapters, and documentation changes are decided through pull
request review. Changes to privacy guarantees, the public result schema, rule
semantics, or project governance should begin as a public design issue.

Maintainers seek rough consensus and document the tradeoff when consensus is not
possible. Privacy and user safety override convenience.

## Becoming a maintainer

Consistent contributors may be invited as triagers, then maintainers. Signals
include sound technical judgment, respectful review, care for compatibility,
and sustained participation across several releases. There is no minimum number
of code contributions.

Maintainers can step down at any time. Inactive access may be removed after six
months without participation, after a private check-in.

## Releases

At least one maintainer must review a release. Package publication uses GitHub
Actions and npm trusted publishing so no long-lived registry token is required.
