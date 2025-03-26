#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting NFT Bonding Curve Lister Installation...${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js v14 or higher first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "npm is not installed. Please install npm first."
    exit 1
fi

# Create necessary directories
echo -e "${BLUE}Creating project directories...${NC}"
mkdir -p script x_variables server-logs

# Install dependencies
echo -e "${BLUE}Installing dependencies...${NC}"
npm install

# Make run script executable
echo -e "${BLUE}Setting up scripts...${NC}"
chmod +x script/run-thirdweb.sh

# Check for global environment variables
echo -e "${BLUE}Checking for global environment variables...${NC}"
if [ -f "$HOME/.x_globals/.env" ]; then
    echo "Found global environment variables at $HOME/.x_globals/.env"
    # Create symlink to global env
    ln -sf "$HOME/.x_globals/.env" x_variables/.env
else
    echo "Warning: Global environment variables not found at $HOME/.x_globals/.env"
    echo "Please ensure your global environment variables are set up correctly."
fi

# Create initial log files if they don't exist
echo -e "${BLUE}Setting up log files...${NC}"
touch server-logs/bonding-curve-log.txt
touch server-logs/time-check.txt

# Update log file with initial state
echo -e "${BLUE}Initializing log with current state...${NC}"
echo "[$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")] Starting NFT Bonding Curve Lister" >> server-logs/bonding-curve-log.txt
echo "[$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")] Current state: 3 tokens already purchased" >> server-logs/bonding-curve-log.txt
echo "[$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")] Will continue listing remaining tokens with prices from 0.00001 ETH to 0.69 ETH" >> server-logs/bonding-curve-log.txt

echo -e "${GREEN}Installation complete!${NC}"
echo -e "You can now run the bot using:"
echo -e "  npm run start"
echo -e "  or"
echo -e "  ./script/run-thirdweb.sh"
echo -e "\nLogs will be stored in the server-logs directory" 