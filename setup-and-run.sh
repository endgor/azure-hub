#!/bin/bash
# setup-and-run.sh - Setup and run the Azure IP Lookup application

# Set script to exit on error
set -e

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Azure IP Lookup App Setup ===${NC}"

# Step 1: Install dependencies
echo -e "\n${YELLOW}Installing dependencies...${NC}"
npm install

# Step 2: Create data directory if it doesn't exist
mkdir -p data

# Step 3: Download Azure IP data
echo -e "\n${YELLOW}Downloading Azure IP data...${NC}"
npm run update-ip-data

# Check if data files exist
if [ ! -f "data/AzureCloud.json" ]; then
  echo -e "${RED}Error: Azure IP data files not found${NC}"
  exit 1
fi

# Step 4: Start the development server
echo -e "\n${GREEN}Starting the Next.js development server...${NC}"
echo -e "${YELLOW}The application will be available at http://localhost:3000${NC}\n"
npm run dev
