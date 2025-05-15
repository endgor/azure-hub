# Scheduled Data Updates

To ensure the Azure IP address data is kept up-to-date, you should set up a scheduled task (cron job) to run the update script daily.

## Running the Update Script Manually

You can run the update script manually with:

```bash
node scripts/cron-update.js
```

Alternatively, you can directly use the TypeScript update script:

```bash
npm run update-ip-data
```

This will:
1. Backup existing data files
2. Download the latest Azure IP data files
3. Validate the downloaded files
4. Log all activities to the `logs` directory

## Setting Up a Scheduled Task

### On Linux/Mac (Using Cron)

1. Open your crontab configuration:
```bash
crontab -e
```

2. Add a line to run the script daily (e.g., at 1:00 AM):
```
0 1 * * * cd /path/to/azure-ip-lookup-nextjs && /usr/bin/node scripts/cron-update.js
```

Or to use the TypeScript update script directly:
```
0 1 * * * cd /path/to/azure-ip-lookup-nextjs && npm run update-ip-data
```

### On Windows (Using Task Scheduler)

1. Open Task Scheduler
2. Create a new task
3. Set the trigger to run daily at your preferred time
4. Set the action to:
   - Program/script: `node`
   - Arguments: `scripts\cron-update.js`
   - Start in: `C:\path\to\azure-ip-lookup-nextjs`

### Using Docker

If running in Docker, add a cron service in your docker-compose.yml:

```yaml
services:
  app:
    # ... your app configuration

  cron:
    image: node:18
    volumes:
      - .:/app
    working_dir: /app
    command: >
      /bin/bash -c "
        apt-get update && apt-get install -y cron
        echo '0 1 * * * cd /app && node scripts/cron-update.js >> /app/logs/cron.log 2>&1' > /etc/cron.d/ip-updates
        chmod 0644 /etc/cron.d/ip-updates
        crontab /etc/cron.d/ip-updates
        cron -f
      "
```

## Logs

The update script logs all activities to the `logs` directory with timestamped filenames. You can monitor these logs to ensure updates are running correctly.
