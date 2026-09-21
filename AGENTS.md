# Match Data Operations

- User-supplied match data must be saved directly to production by default.
  This includes results, squads, events, schedules, deadlines, and explicitly
  requested related player additions or availability updates.
- This is the user's standing preference. Do not ask again whether to use
  production or development for an otherwise clear match-data request.
- Use development only when the user explicitly requests it. Do not assume
  that the deployment configured in `.env.local` is production; select the
  production target explicitly (for Convex CLI operations, use `--prod`).
- Data updates do not authorize code or schema deployments. Use existing
  deployed operations without `--push`, `convex deploy`, or `convex dev`.
- Before writing, verify the season, fixture, clubs, and players, and preserve
  the current target data in a backup. Keep updates scoped to the request.
- After writing, read back the production data and verify the result and any
  applicable scoring refresh. Clearly report any incomplete or blocked update.
