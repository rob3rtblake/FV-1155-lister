# Project Memory

## Key Decisions
1. Using ethers v5.7.2 instead of v6 for compatibility with current SDK
2. Maintaining existing scripts (`run-thirdweb.sh` and `thirdweb-listing.js`) instead of creating new ones
3. Removed reference script to avoid confusion and maintain clean codebase
4. Implemented one-click installation for easier deployment
5. Using global environment variables from `$HOME/.x_globals/.env` for better security and management
6. Keeping logs in version control for server deployment and monitoring

## Important Information
- Contract Addresses:
  - NFT Contract: `0x7e5F161dd824d98AC3474eBf550716d0cb83E8C6`
  - Marketplace: `0xF87f5313E830d8E2670898e231D8701532b1eB09`

## Dependencies
- @thirdweb-dev/sdk: ^4.0.23
- ethers: ^5.7.2
- dotenv: ^16.0.0

## Environment Setup
- Global environment variables location: `$HOME/.x_globals/.env`
- Required environment variables:
  - PRIVATE_KEY
  - RPC_URL (https://rpc.soneium.org)
- Project creates symlink to global env in `x_variables/.env`

## Project Structure
- Main scripts in `script/` directory
- Installation script: `install.sh`
- Environment variables symlink in `x_variables/` directory
- Logs stored in `server-logs/` directory:
  - `bonding-curve-log.txt`: Main activity log
  - `time-check.txt`: Timing information

## Installation Process
1. Run `./install.sh`
2. Script checks dependencies
3. Creates necessary directories
4. Installs npm packages
5. Sets up executable permissions
6. Links to global environment variables
7. Initializes log files

## Logging System
- All logs are version controlled
- Logs stored in `server-logs/` directory
- Two main log files:
  1. `bonding-curve-log.txt`: Main activity log
     - Token listings
     - Balance changes
     - Transaction hashes
     - Errors and retries
  2. `time-check.txt`: Performance monitoring
     - Timing information
     - System metrics 