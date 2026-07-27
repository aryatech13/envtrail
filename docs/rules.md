# Rule reference

All rules accept `error`, `warning`, `info`, or `off`.

## EVT001 · undocumented

Code consumes a literal environment variable, but no safe environment template
documents it.

**Default:** error  
**Fix:** add the key, a safe placeholder, and a short comment to `.env.example`.

## EVT002 · staleDocumentation

A safe environment template contains a key with no static consumer.

**Default:** warning  
**Fix:** remove the obsolete key or confirm that it is accessed dynamically.

## EVT003 · providerOnly

Deployment or CI supplies a key that is neither consumed nor documented.

**Default:** warning  
**Fix:** remove stale wiring or add the missing code and documentation trail.

## EVT004 · trackedEnvFile

Git tracks a file named `.env`, `.env.local`, `.env.production`, or another
live environment variant.

**Default:** error  
**Fix:** first assess and rotate exposed secrets, then remove the file from Git
history and add it to `.gitignore`.

EnvTrail asks Git for tracked paths but never opens these files.

## EVT005 · dynamicAccess

Code computes an environment-variable name at runtime, so static analysis cannot
resolve the key.

**Default:** warning  
**Fix:** prefer a literal key or document and explicitly ignore the lookup.

## EVT006 · duplicateDocumentation

The same template contains a key more than once.

**Default:** warning  
**Fix:** keep a single declaration per key per template.

## Health score

The score starts at 100. Errors subtract 12, warnings subtract 4, and informational
findings subtract 1, capped at 70 points. Undocumented consumer coverage can
subtract up to 30 additional points. The score is a prioritization signal, not a
security certification.
