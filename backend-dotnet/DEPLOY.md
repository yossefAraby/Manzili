# Deploying the Manzili .NET API to AWS

This mirrors the old Node backend's deployment exactly: same ECR repo (`manzili`),
same EC2 instance (`63.185.144.255`), same systemd service (`manzili`). The .NET
image **replaces** the Node one on the same box.

| Thing            | Value                                                              |
|------------------|-------------------------------------------------------------------|
| AWS account      | `055271832259`                                                    |
| Region           | `eu-central-1`                                                    |
| ECR repo         | `manzili`                                                         |
| EC2 (Elastic IP) | `63.185.144.255` (user `ec2-user`)                               |
| Service          | systemd unit `manzili`                                            |
| Container port   | **8080** (the Node app used 3000 — this is the one thing that changed) |
| Env on box       | `/etc/manzili.env` (fed to the container via `--env-file`)        |
| Health check     | `GET /api/v1/health`                                              |

## Prerequisites (on your machine)

- `aws` CLI authenticated to account `055271832259`
- `docker` running (builds `linux/amd64` for the t3.micro)
- SSH key at `~/.ssh/id_ed25519` (override with `SSH_KEY=...`)

## One-time migration on the EC2 box

Because the container port changed from 3000 → 8080, update the systemd unit once.
SSH in and edit `/etc/systemd/system/manzili.service` so the `docker run` line maps
`-p 80:8080` (was `-p 80:3000`) and sets `ASPNETCORE_ENVIRONMENT=Production`. The
[`manzili.service`](manzili.service) file in this folder is a ready-to-use reference —
copy it over, or just change the port:

```bash
ssh ec2-user@63.185.144.255
sudo nano /etc/systemd/system/manzili.service     # change 3000 -> 8080
sudo systemctl daemon-reload
```

> If you only edit the `-p` mapping and nothing else, that single change is enough.

## First deploy

```bash
cd Manzili/backend-dotnet

./update-env.sh    # 1. push .env -> /etc/manzili.env on the box
./deploy.sh        # 2. build, push to ECR, pull + restart on EC2
```

## Routine updates

- **Code change only:** `./deploy.sh`
- **Config change (.env):** `./update-env.sh`

## Verify

```bash
curl -fsS http://63.185.144.255/api/v1/health
ssh ec2-user@63.185.144.255 'sudo docker logs -f manzili'
```

## Notes / gotchas

- **Secrets stay out of the image.** `.dockerignore` excludes `.env` and
  `appsettings.Development.json`, so they are never baked into the pushed image.
  All runtime config comes from `/etc/manzili.env`.
- **Rotate credentials before any public launch.** The `.env` currently holds live
  test/sandbox keys (DB, Stripe, Kashier, Cloudinary).
- **Stripe/Kashier webhooks** need a public URL pointing at this API
  (`http://63.185.144.255/...`). Set `Manzili__Stripe__WebhookSecret` /
  `Manzili__Kashier__WebhookUrl` in `.env`, then `./update-env.sh`.
- Override any default inline, e.g. `IMAGE_TAG=v1 ./deploy.sh` or
  `EC2_HOST= ./deploy.sh` (push to ECR only, skip the EC2 restart).
