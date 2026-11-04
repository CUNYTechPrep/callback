# A bad revision took traffic

**Use when:** a deploy passed its smoke test, took traffic, and broke
something (errors, sign-in failing, wrong data) that the previous revision
didn't.
**Last drilled:** ⚠ never

## Before you start

- `az login` works and you have Contributor on the resource group. Check
  now: `az containerapp show -n "$APP" -g "$RG" -o none`.
- Set the names: `APP=<container app>` and `RG=<resource group>` (the repo
  variables `AZURE_CONTAINERAPP` and `AZURE_RESOURCE_GROUP`).
- Blast radius: moving traffic is instant and affects every user. It moves
  code only. The database stays exactly as the bad deploy left it.

## Steps

1. List the revisions, newest last:
   `az containerapp revision list -n "$APP" -g "$RG" --query "sort_by(@, &properties.createdTime)[].{name:name, active:properties.active, traffic:properties.trafficWeight, health:properties.healthState}" -o table`
2. Write down the bad revision (the one at 100) and the last good one (the
   newest one before it that you know worked).
3. If the good revision shows `active` false, switch it back on:
   `az containerapp revision activate -n "$APP" -g "$RG" --revision <good>`
4. Move all traffic to it:
   `az containerapp ingress traffic set -n "$APP" -g "$RG" --revision-weight <good>=100`
5. Switch off the bad one (reversible with `activate`):
   `az containerapp revision deactivate -n "$APP" -g "$RG" --revision <bad>`
6. ⚠ Main still contains the bad commit, and the next merge to main deploys
   it again. Open a revert PR now (`git revert <sha>`) and merge it before
   anything else.
7. Post in the team channel: what broke, which revision is serving, the
   revert PR link.

## Verify it worked

- `curl -s https://<app-fqdn>/api/health` says `{"status":"ok","db":"ok"}`.
- `az containerapp ingress traffic show -n "$APP" -g "$RG" -o table` lists
  the good revision at 100.
- The thing that broke works again, checked by hand on the live URL.

## If this didn't work

- The good revision is also unhealthy: the deploy isn't the problem. Check
  the database (is Postgres running? did a secret change?) and read
  `az containerapp logs show -n "$APP" -g "$RG" --revision <good> --follow`.
- The bad deploy ran a migration, and the old revision errors against the
  new schema: stop and get help. Do not hand-edit the production database.
- Afterward, write a postmortem from `docs/postmortems/_template.md`.

## Related

- Spec of the system being operated on: `docs/specs/deploy.md`
- Why migrations don't roll back: `docs/adr/0013-migrate-on-container-start.md`
