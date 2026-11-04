# Production doesn't exist yet

**Use when:** standing up production from nothing: the first deploy, or a
rebuild after the resource group is gone.
**Last drilled:** ⚠ never

## Before you start

- Azure CLI signed in (`az login`) on the subscription that pays, with
  permission to create app registrations (Entra ID) and assign roles.
- Admin on the GitHub repo (repo variables, package visibility) and `gh`
  signed in.
- A `DATABASE_URL` for a Postgres server that admits Azure services (on the
  server's *Networking* page, "Allow public access from any Azure service"
  is checked), ending in `?sslmode=require`.
- Blast radius: creates new resources only. Nothing existing changes.

## Steps

1. Install the CLI pieces and register the providers:
   `az extension add --name containerapp --upgrade`
   `az provider register --namespace Microsoft.App`
   `az provider register --namespace Microsoft.OperationalInsights`
2. Pick the names (lowercase; these are examples):
   `RG=rg-callback; LOC=eastus; ENV=cae-callback; APP=callback`
3. Create the resource group and the Container Apps environment:
   `az group create -n "$RG" -l "$LOC"`
   `az containerapp env create -n "$ENV" -g "$RG" -l "$LOC"`
4. Create the identity GitHub Actions signs in as, allowed to manage this
   resource group only:
   ```bash
   CLIENT_ID=$(az ad app create --display-name gh-callback-deploy --query appId -o tsv)
   az ad sp create --id "$CLIENT_ID"
   az role assignment create --assignee "$CLIENT_ID" --role Contributor \
     --scope "$(az group show -n "$RG" --query id -o tsv)"
   az ad app federated-credential create --id "$CLIENT_ID" --parameters '{
     "name": "deploy-from-main",
     "issuer": "https://token.actions.githubusercontent.com",
     "subject": "repo:CUNYTechPrep/callback:ref:refs/heads/main",
     "audiences": ["api://AzureADTokenExchange"]}'
   ```
5. Give the workflow the names it reads (none of these are secrets):
   ```bash
   gh variable set AZURE_CLIENT_ID --body "$CLIENT_ID"
   gh variable set AZURE_TENANT_ID --body "$(az account show --query tenantId -o tsv)"
   gh variable set AZURE_SUBSCRIPTION_ID --body "$(az account show --query id -o tsv)"
   gh variable set AZURE_RESOURCE_GROUP --body "$RG"
   gh variable set AZURE_CONTAINERAPP --body "$APP"
   ```
6. Run the deploy once to build and push the first image:
   `gh workflow run deploy.yml --ref main`. Expect it to push the image and
   then fail at "Refuse to deploy…", because the app doesn't exist yet.
7. Make the image public: the org's *Packages* → `callback/web` → *Package
   settings* → *Change visibility* → Public.
8. Note the image that run pushed:
   `IMAGE=ghcr.io/cunytechprep/callback/web:$(gh run list --workflow deploy.yml -L 1 --json headSha -q '.[0].headSha')`
9. Read the secrets into the shell without echoing them:
   `read -s DATABASE_URL; AUTH_SECRET=$(openssl rand -base64 33)`
10. Create the app from that image. It migrates the database on start.
    ```bash
    az containerapp create -n "$APP" -g "$RG" --environment "$ENV" \
      --image "$IMAGE" --revision-suffix first \
      --ingress external --target-port 3000 \
      --min-replicas 0 --max-replicas 1 --revisions-mode multiple \
      --secrets database-url="$DATABASE_URL" auth-secret="$AUTH_SECRET" \
        auth-github-id=unset auth-github-secret=unset \
      --env-vars DATABASE_URL=secretref:database-url AUTH_SECRET=secretref:auth-secret \
        AUTH_GITHUB_ID=secretref:auth-github-id AUTH_GITHUB_SECRET=secretref:auth-github-secret \
        AUTH_TRUST_HOST=true PG_POOL_MAX=1 LOG_LEVEL=info
    ```
11. Pin traffic to that named revision, so every later revision starts at 0%:
    `az containerapp ingress traffic set -n "$APP" -g "$RG" --revision-weight "$APP--first=100"`
12. Get the public address and check it:
    `FQDN=$(az containerapp show -n "$APP" -g "$RG" --query properties.configuration.ingress.fqdn -o tsv)`
    `curl -s "https://$FQDN/api/health"` → `{"status":"ok","db":"ok"}`
13. On GitHub, create a **production** OAuth app (Settings → Developer
    settings → OAuth Apps): homepage `https://$FQDN`, callback
    `https://$FQDN/api/auth/callback/github`. Generate a client secret.
14. Store its id and secret (`read -s GH_ID; read -s GH_SECRET` first), then
    restart so the revision reads them:
    `az containerapp secret set -n "$APP" -g "$RG" --secrets auth-github-id="$GH_ID" auth-github-secret="$GH_SECRET"`
    `az containerapp revision restart -n "$APP" -g "$RG" --revision "$APP--first"`
15. Set a budget alert: Cost Management → Budgets → $5, email alert.

## Verify it worked

- `curl -s "https://$FQDN/api/health"` says `{"status":"ok","db":"ok"}`.
- Signing in with GitHub on `https://$FQDN` works, and the session cookie is
  `__Secure-authjs.session-token`.
- A one-line PR, merged, reaches the live URL in under 10 minutes.

## If this didn't work

- `az ad app create` is refused: your tenant doesn't let you register apps
  (common on school-managed accounts). Ask the tenant admin, or use a
  subscription in a tenant you control.
- `/api/health` doesn't say `db: "ok"` at step 12: read the revision's logs with
  `az containerapp logs show -n "$APP" -g "$RG" --revision "$APP--first" --follow`.
  `Could not reach` means the Postgres firewall or `DATABASE_URL`.
- Anything else: stop and get help — don't widen the Postgres firewall to
  "everyone" to make it work.

## Related

- Spec of the system being operated on: `docs/specs/deploy.md`
- What to do when a deploy goes wrong later: `docs/runbooks/rollback-bad-deploy.md`
