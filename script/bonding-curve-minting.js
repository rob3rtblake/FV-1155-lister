// Bonding Curve Listing Script using thirdweb SDK
require('dotenv').config({ path: '../x_variables/.env' });
const fs = require('fs');
const { ThirdwebSDK } = require("@thirdweb-dev/sdk");
const { ethers } = require("ethers");

// Configuration
const NFT_CONTRACT_ADDRESS = "0x7e5F161dd824d98AC3474eBf550716d0cb83E8C6";
const MARKETPLACE_ADDRESS = "0xF87f5313E830d8E2670898e231D8701532b1eB09";
const TOKEN_ID = 2; // The ERC1155 token ID for bonding curve tokens

// Bonding curve configuration
const BONDING_CURVE_CONFIG = {
  startPrice: "0.00001",
  maxPrice: "0.69",
  totalTokens: 666,
  currentListed: 3, // 3 tokens already purchased
  lastTokenNumber: 3 // Last token number that was listed
};

// Currency options (ETH only)
const CURRENCY_OPTIONS = {
  address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
  label: "ETH"
};

const LISTING_DURATION_DAYS = 90;

// Gas optimization settings
const GAS_SETTINGS = {
  maxPriorityFeePerGas: "1000000000", // 1 gwei - adjust for the network
  maxFeePerGas: "5000000000",        // 5 gwei - adjust for the network
  retryCount: 3,                     // Number of retries on failure
  retryDelayMs: 3000,                // Initial delay between retries (3 seconds)
};

// Setup logging
const logFile = fs.createWriteStream('./bonding-curve-log.txt', { flags: 'a' });
const logLine = (msg) => {
  const timestamp = new Date().toISOString();
  const logMsg = `[${timestamp}] ${msg}`;
  console.log(logMsg);
  logFile.write(logMsg + '\n');
};

// Calculate current price based on bonding curve
function calculateCurrentPrice(currentListed) {
  const startPrice = parseFloat(BONDING_CURVE_CONFIG.startPrice);
  const maxPrice = parseFloat(BONDING_CURVE_CONFIG.maxPrice);
  const totalTokens = BONDING_CURVE_CONFIG.totalTokens;
  
  // Linear interpolation between start and max price
  const priceRange = maxPrice - startPrice;
  const currentProgress = currentListed / totalTokens;
  const currentPrice = startPrice + (priceRange * currentProgress);
  
  return ethers.utils.parseEther(currentPrice.toFixed(8));
}

async function checkNFTBalance(nftCollection, address) {
  try {
    // Check the balance of the specific token ID
    const balance = await nftCollection.erc1155.balanceOf(address, TOKEN_ID);
    logLine(`Current balance for token ID ${TOKEN_ID}: ${balance.toNumber()}`);
    return balance.toNumber();
  } catch (error) {
    logLine(`Error checking NFT balance: ${error.message}`);
    throw error;
  }
}

async function checkAndSetApproval(nftCollection, marketplace, address) {
  try {
    // Check if marketplace is approved for NFTs
    const isNftApproved = await nftCollection.erc1155.isApproved(
      address,
      MARKETPLACE_ADDRESS
    );
    
    if (!isNftApproved) {
      logLine("Approving marketplace to transfer NFTs...");
      
      // Set approval for all tokens - this is a one-time operation that saves gas
      const approvalTx = await nftCollection.erc1155.setApprovalForAll(
        MARKETPLACE_ADDRESS,
        true
      );
      
      logLine(`NFT approval transaction successful: ${approvalTx.receipt.transactionHash}`);
    } else {
      logLine("Marketplace already approved to transfer NFTs");
    }
    
    return true;
  } catch (error) {
    logLine(`Error in approval process: ${error.message}`);
    throw error;
  }
}

async function withRetry(operationName, operation, retryCount = GAS_SETTINGS.retryCount) {
  let lastError;
  for (let i = 0; i < retryCount; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      logLine(`Attempt ${i + 1} failed for ${operationName}: ${error.message}`);
      if (i < retryCount - 1) {
        const delay = GAS_SETTINGS.retryDelayMs * Math.pow(2, i);
        logLine(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

async function createDirectListing(marketplace, address, tokenNumber) {
  try {
    const currentPrice = calculateCurrentPrice(BONDING_CURVE_CONFIG.currentListed);
    const priceString = ethers.utils.formatEther(currentPrice);
    logLine(`Listing token ${tokenNumber} at price ${priceString} ETH`);

    const startTime = performance.now();
    
    // Create direct listing using thirdweb SDK - listing ONE copy at a time
    const createListingTx = await marketplace.directListings.createListing({
      assetContractAddress: NFT_CONTRACT_ADDRESS,
      tokenId: TOKEN_ID,
      quantity: "1", // Important: List exactly 1 copy of the token
      currencyContractAddress: CURRENCY_OPTIONS.address,
      pricePerToken: priceString,
      startTimestamp: new Date(),
      endTimestamp: new Date(Date.now() + LISTING_DURATION_DAYS * 24 * 60 * 60 * 1000),
      isReservedListing: false
    });
    
    const endTime = performance.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    logLine(`Listing created successfully in ${duration}s! Gas used: ${createListingTx.receipt.gasUsed}, TX Hash: ${createListingTx.receipt.transactionHash}`);
    logLine(`Listed 1 copy of token ID ${TOKEN_ID} at ${priceString} ETH`);
    
    return createListingTx;
  } catch (error) {
    logLine(`Error creating listing: ${error.message}`);
    throw error;
  }
}

async function setupSDK() {
  try {
    const privateKey = process.env.PRIVATE_KEY;
    const rpcUrl = process.env.RPC_URL;
    
    if (!privateKey) {
      throw new Error("Private key not found. Please add PRIVATE_KEY to your .env file");
    }

    if (!rpcUrl) {
      throw new Error("RPC URL not found. Please add RPC_URL to your .env file");
    }

    logLine(`Using RPC URL: ${rpcUrl}`);
    
    const sdk = ThirdwebSDK.fromPrivateKey(privateKey, rpcUrl, {
      gasSettings: {
        maxPriorityFeePerGas: GAS_SETTINGS.maxPriorityFeePerGas,
        maxFeePerGas: GAS_SETTINGS.maxFeePerGas,
      }
    });
    
    const address = await sdk.wallet.getAddress();
    logLine(`Connected to network with wallet: ${address}`);
    
    const marketplace = await sdk.getContract(MARKETPLACE_ADDRESS, "marketplace-v3");
    const nftCollection = await sdk.getContract(NFT_CONTRACT_ADDRESS, "edition");
    
    return { sdk, marketplace, nftCollection, address };
  } catch (error) {
    logLine(`Error setting up SDK: ${error.message}`);
    throw error;
  }
}

async function listAllTokens() {
  try {
    const { marketplace, nftCollection, address } = await setupSDK();

    logLine('Starting bonding curve listing sequence');
    logLine(`Current state: ${BONDING_CURVE_CONFIG.currentListed} tokens already purchased`);
    logLine(`Will continue listing remaining tokens with prices from ${BONDING_CURVE_CONFIG.startPrice} ETH to ${BONDING_CURVE_CONFIG.maxPrice} ETH`);

    // Check NFT balance and set approval
    let balance = await checkNFTBalance(nftCollection, address);
    logLine(`Found ${balance} copies of token ID ${TOKEN_ID}`);
    
    await checkAndSetApproval(nftCollection, marketplace, address);

    // Track previous balance to detect external changes
    let previousBalance = balance;
    let listingsToCreate = 0;  // Start with 0 since we only create on balance decrease

    while (BONDING_CURVE_CONFIG.currentListed < BONDING_CURVE_CONFIG.totalTokens) {
      try {
        // Check current balance
        const newBalance = await checkNFTBalance(nftCollection, address);
        
        // Only create listings if balance has decreased (tokens were sold)
        if (newBalance < previousBalance) {
          const tokensSold = previousBalance - newBalance;
          logLine(`Balance decreased by ${tokensSold} tokens. Creating new listings...`);
          
          // Create exactly as many listings as tokens sold
          for (let i = 0; i < tokensSold; i++) {
            const tokenNumber = BONDING_CURVE_CONFIG.lastTokenNumber + 1;
            
            await withRetry(
              `Listing token ${tokenNumber}`,
              () => createDirectListing(marketplace, address, tokenNumber)
            );

            BONDING_CURVE_CONFIG.currentListed++;
            BONDING_CURVE_CONFIG.lastTokenNumber = tokenNumber;
            
            // Small delay between listings to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
          previousBalance = newBalance;
        } else if (newBalance > previousBalance) {
          logLine(`Balance increased from ${previousBalance} to ${newBalance}. Updating tracking.`);
          previousBalance = newBalance;
        } else {
          logLine(`Balance unchanged at ${newBalance}. No new listings needed.`);
        }
        
        balance = newBalance;

        // Wait 10 minutes before next balance check
        const waitTimeMs = 10 * 60 * 1000;
        logLine(`Waiting ${waitTimeMs/1000/60} minutes before next balance check...`);
        await new Promise(resolve => setTimeout(resolve, waitTimeMs));
        
      } catch (error) {
        logLine(`Error in listing loop: ${error.message}`);
        // Wait 5 minutes before retrying after error
        await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));
      }
    }
  } catch (error) {
    logLine(`Critical error: ${error.message}`);
    logLine('Process terminated due to critical error.');
    throw error;
  }
}

// Start the script
listAllTokens().catch(error => {
  logLine(`Fatal error: ${error.message}`);
  process.exit(1);
}); 