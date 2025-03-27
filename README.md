# NFT Bonding Curve Lister

A Node.js-based bot for managing NFT listings with a bonding curve pricing model on Thirdweb's marketplace.

## Current State

- Contract Address: `0x7e5F161dd824d98AC3474eBf550716d0cb83E8C6`
- Marketplace Address: `0xF87f5313E830d8E2670898e231D8701532b1eB09`
- Token ID: 2 (ERC1155)
- Current Status: Token 4 is currently listed (3 tokens sold, waiting for sale of token 4)
- Price Range: 0.00001 ETH to 0.69 ETH
- Total Tokens: 666

## Prerequisites

- Node.js v14 or higher
- npm (Node Package Manager)
- Global environment variables set up in `$HOME/.x_globals/.env`:
  - `PRIVATE_KEY`: Your wallet's private key
  - `RPC_URL`: Your Ethereum RPC URL

## Installation

1. Clone the repository
2. Run the installation script:
   ```bash
   ./install.sh
   ```

The installation script will:
- Create necessary directories
- Install dependencies
- Set up logging
- Configure environment variables
- Initialize the current state

## Usage

You can start the bot using either:

```bash
npm run start
```

or

```bash
./script/run-thirdweb.sh
```

## Features

- Automatic bonding curve price calculation
- Balance monitoring for token sales
- Automatic listing creation when tokens are sold
- Gas optimization with retry mechanism
- Comprehensive logging system
- Error handling and recovery

## Logging

Logs are stored in the `server-logs` directory:
- `bonding-curve-log.txt`: Main activity log
- `time-check.txt`: Timing information

## Dependencies

- @thirdweb-dev/sdk: ^4.0.23
- dotenv: ^16.0.0
- ethers: ^5.7.2

## Security Notes

- Never commit your `.env` file
- Keep your private key secure
- Use environment variables for sensitive data
- The bot uses gas optimization settings to minimize transaction costs

## License

MIT
