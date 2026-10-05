# CLAUDE.md

## Merge policy (set by the owner)
- Work on a branch and open a pull request into main. Never commit directly to main.
- Merge the pull request yourself once the checks pass (Cloudflare preview deployed, GitHub checks green, and your own browser/test checks done on the preview URL). Then tell the owner what you merged, in simple terms.
- Do NOT merge, and ask the owner first, when the change is BIG, meaning any of these: a redesign of a page or a large part of the UI; more than ~400 changed lines or more than ~15 files (except mechanical changes like translations or version bumps, which you may merge); changes to the search logic or ranking in the Worker (kitfinder-search/src/index.ts); changes to the D1 schema or any bulk delete/rewrite of data beyond the exact task requested; changes to authentication, payments, affiliate links or legal/privacy text; changes to GitHub Actions workflows or secrets; anything hard to undo.
- If any check fails, do not merge: fix it or tell the owner.
- After merging, verify the live site or the scraper still works (open the site or run a quick check) and report the result. If something broke, revert the merge immediately with `git revert` through a new pull request and tell the owner.
- Keep CLAUDE.md's other rules (no JSON/gzip feeds, eBay is never a store, D1 has no manual transactions, 50 products per SQL file, etc.).
