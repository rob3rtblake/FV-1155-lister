# Automated NFT Listing Script

This project automates the process of listing ERC-1155 NFTs on a marketplace using the thirdweb SDK. The script is designed to create listings at regular intervals with intelligent time-based strategies and balance monitoring.

## Features

- **Scheduled Listings**: Creates NFT listings at the top of each hour
- **Time-Based Strategy**: 
  - During regular hours: Creates both ETH and ASTR listings
  - During daytime hours (1pm-7pm): Creates only ASTR listings
- **Dynamic Response**: Automatically creates new listings when tokens are sold
- **Balance Monitoring**: Checks for balance changes every 10 minutes
- **Configurable Pricing**: Set different prices for ETH and ASTR currencies
- **Gas Optimization**: Includes retry mechanisms and gas settings to minimize costs
- **Detailed Logging**: Comprehensive logging of all operations and decisions

## Requirements

- Node.js (v14 or higher)
- npm or yarn
- A wallet with tokens to list
- Access to the Soenium network

## Installation

1. Clone this repository:
   ```
   git clone <repository-url>
   cd FV-1155-lister
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file with the following variables:
   ```
   PRIVATE_KEY=your_wallet_private_key
   RPC_URL=https://rpc.soenium.io
   ```

## Configuration

The script can be configured by modifying the variables at the top of `script/thirdweb-listing.js`:

- `NFT_CONTRACT_ADDRESS`: The address of your ERC-1155 token contract
- `MARKETPLACE_ADDRESS`: The address of the marketplace contract
- `TOKEN_ID`: The ID of the token to list
- `CURRENCY_OPTIONS`: Configure pricing for different currencies:
  ```javascript
  const CURRENCY_OPTIONS = {
    NATIVE_ETH: {
      address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
      price: "0.0008888", // ETH price
      label: "ETH"
    },
    ASTR: {
      address: "0x2cae934a1e84f693fbb78ca5ed3b0a6893259441",
      price: "62", // ASTR price
      label: "ASTR"
    }
  };
  ```
- `LISTING_DURATION_DAYS`: How long each listing should be active
- `GAS_SETTINGS`: Configure gas settings for transactions

## Usage

Run the script using the provided shell script:

```
cd script
./run-thirdweb.sh
```

The script will:
1. Connect to the network using the provided private key
2. Check your NFT balance
3. Set the necessary approvals (first-time only)
4. Begin creating listings according to the configured strategy

## How It Works

### Listing Strategy

- **Regular Hours**: Creates one ETH listing and one ASTR listing at the top of each hour
- **Daytime Hours (1pm-7pm)**: Creates only one ASTR listing at the top of each hour
- **Balance Monitoring**: 
  - Checks token balance every 10 minutes
  - If balance decreases (tokens sold), immediately creates new listings
  - For balance-triggered listings, uses a probability distribution (35% ETH, 65% ASTR)

### Logging

All operations are logged to:
- Console output
- `script/nft-listing-log.txt` file
- Time checks are logged to `script/time-check.txt` for debugging

## Common Issues

- **"Token balance did not decrease after listing"**: This warning may appear if the marketplace doesn't take custody of tokens immediately. This is normal for some marketplace contracts.
- **Missing API key warning**: You may see a message about providing a secretKey for thirdweb services. The script will still function, but for production use, you should consider adding an API key.

## Best Practices

- Run the script on a dedicated server or VM for continuous operation
- Monitor the log files periodically
- Ensure your wallet has enough funds for gas fees
- Backup your private key securely

## License

[Your License Information]

## Support

[Contact Information or Support Instructions]
