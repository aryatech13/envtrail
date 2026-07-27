# Maintainer launch checklist

This checklist turns the template into your public repository.

## One-time personalization

```bash
npm run personalize -- aryatech13
```

Review the resulting diff, especially `package.json`, `LICENSE`, `README.md`,
`action.yml`, and `CITATION.cff`.

## Before the first push

```bash
npm ci
npm run check
git init
git add .
git commit -m "feat: launch EnvTrail"
git branch -M main
git remote add origin git@github.com:aryatech13/envtrail.git
git push -u origin main
```

Do not run `npm publish` until the package name and repository links are yours.

## GitHub repository settings

1. Set the description to “Trace environment variables from source code to docs
   and deployment.”
2. Add topics: `environment-variables`, `dotenv`, `devtools`, `cli`,
   `github-actions`, `devsecops`, `sarif`, `typescript`.
3. Upload `assets/hero.png` as the social preview.
4. Enable Issues, Discussions, private vulnerability reporting, and branch
   protection for `main`.
5. Require the `Quality` and `CodeQL` checks before merging.
6. Add the npm package to GitHub's repository sidebar after publishing.

## First npm release

1. Create or sign in to your npm account and enable two-factor authentication.
2. Confirm availability with `npm view envtrail`.
3. Configure npm trusted publishing for this GitHub repository and
   `.github/workflows/release.yml`.
4. Run `npm run check`.
5. Commit the built `dist/` directory.
6. Create a GitHub release named `v0.1.0`. The release workflow will publish the
   matching package version.
7. Move the `v1` Action tag after verifying the release:

   ```bash
   git tag -f v1 v0.1.0
   git push -f origin v1
   ```

## Healthy growth

- Open three concrete `good first issue` tickets from `ROADMAP.md`.
- Respond to reports quickly and explain design decisions in public.
- Publish a short demo using the real screenshots in `assets/`.
- Ask early users for failure cases, not stars.
- Release small adapter improvements regularly and credit every contributor.

Adoption and external contribution are earned over time; never buy stars,
downloads, pull requests, or other activity.
