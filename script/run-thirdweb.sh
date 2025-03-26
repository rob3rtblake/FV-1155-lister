#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create logs directory if it doesn't exist
mkdir -p ../server-logs

# Get current timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

# Log start of execution
echo "[$TIMESTAMP] Starting NFT Bonding Curve Lister" >> ../server-logs/bonding-curve-log.txt

# Run the bonding curve minting script
echo -e "${BLUE}Starting NFT Bonding Curve Lister...${NC}"
node bonding-curve-minting.js >> ../server-logs/bonding-curve-log.txt 2>&1

# Check if the script executed successfully
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Script completed successfully${NC}"
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")] Script completed successfully" >> ../server-logs/bonding-curve-log.txt
else
    echo -e "${RED}Script failed. Check server-logs/bonding-curve-log.txt for details${NC}"
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")] Script failed" >> ../server-logs/bonding-curve-log.txt
fi 