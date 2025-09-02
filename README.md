# Azure IP Lookup

A modern web application that helps you determine if an IP address belongs to Microsoft Azure infrastructure and identify which Azure Service Tags contain specific IP addresses.

## Features

- Check if an IP address belongs to Azure
- Lookup which Azure Service Tags contain a specific IP address
- View Azure region, service tag, and network feature information 
- IP data automatically updated daily from Microsoft's official sources via GitHub Actions

## DEMO

Visit [https://azurehub.org](https://azurehub.org)

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Download Azure IP data:
   ```bash
   npm run update-ip-data
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Data Sources

The IP data comes directly from Microsoft's official download pages:

- [Azure Public Cloud IP Ranges](https://www.microsoft.com/en-us/download/details.aspx?id=56519)
- [Azure China Cloud IP Ranges](https://www.microsoft.com/en-us/download/details.aspx?id=57062)
- [Azure US Government Cloud IP Ranges](https://www.microsoft.com/en-us/download/details.aspx?id=57063)

## Automated Updates

IP range data is updated daily through GitHub Actions. The workflow:

1. Runs every day at midnight UTC
2. Downloads the latest IP ranges from Microsoft
3. Commits the updated data to the repository
4. Triggers a new deployment on Vercel automatically

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

This tool is not affiliated with Microsoft or Azure. It is an independent project that uses publicly available data. The IP ranges and service tags are provided by Microsoft and are subject to change.
