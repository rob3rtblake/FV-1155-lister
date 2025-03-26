// Soenium NFT Batch Listing Script using thirdweb SDK
require('dotenv').config({ path: '../x_variables/.env' });
const fs = require('fs');
const { ThirdwebSDK } = require("@thirdweb-dev/sdk");
const { ethers } = require("ethers");

// Configuration
const NFT_CONTRACT_ADDRESS = "0x7e5F161dd824d98AC3474eBf550716d0cb83E8C6";
const MARKETPLACE_ADDRESS = "0xF87f5313E830d8E2670898e231D8701532b1eB09";
const TOKEN_ID = 0; // The ERC1155 token ID to list

// Currency options
const CURRENCY_OPTIONS = {
  NATIVE_ETH: {
    address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // Native ETH
    price: "0.0005", // ETH price updated to 0.0005
    label: "ETH"
  },
  ASTR: {
    address: "0x2cae934a1e84f693fbb78ca5ed3b0a6893259441", // ASTR token contract
    price: "30", // 30 ASTR
    label: "ASTR"
  }
};

// Set which currency to use for listings (NATIVE_ETH or ASTR)
// This will now be determined randomly for each listing
// const CURRENCY_TO_USE = "ASTR"; // Change to "NATIVE_ETH" to list for ETH instead

const LISTING_DURATION_DAYS = 90;

// Gas optimization settings
const GAS_SETTINGS = {
  maxPriorityFeePerGas: "1000000000", // 1 gwei - adjust for the network
  maxFeePerGas: "5000000000",        // 5 gwei - adjust for the network
  retryCount: 3,                     // Number of retries on failure
  retryDelayMs: 3000,                // Initial delay between retries (3 seconds)
};

// Setup logging to file
const logFile = fs.createWriteStream('../server-logs/bonding-curve-log.txt', { flags: 'a' });
const logLine = (msg) => {
  const timestamp = new Date().toISOString();
  const logMsg = `[${timestamp}] ${msg}`;
  console.log(logMsg);
  logFile.write(logMsg + '\n');
};

// DEBUG: Time check verification
const debug_now = new Date();
const debug_hour = debug_now.getHours();
const debug_isDaytime = debug_hour >= 13 && debug_hour < 19;
console.log(`IMMEDIATE TIME CHECK: Current time is ${debug_now.toLocaleTimeString()}, hour is ${debug_hour}`);
console.log(`IMMEDIATE TIME CHECK: isDaytimeHours (1pm-7pm) = ${debug_isDaytime}`);
// Write to a specific time check file for easier debugging
fs.writeFileSync('./time-check.txt', 
  `Time check at startup: ${new Date().toLocaleString()}\n` +
  `Current hour: ${debug_hour}\n` +
  `Is daytime hours (1pm-7pm): ${debug_isDaytime}\n` +
  `Expected behavior: ${debug_isDaytime ? 'ONE ASTR listing only at top of hour' : 'Both ETH and ASTR listings at top of hour'}\n`
);

async function setupSDK() {
  try {
    // Load private key from .env file
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error("Private key not found. Please add PRIVATE_KEY to your .env file");
    }

    // Connect to the network (using RPC URL from .env)
    const rpcUrl = process.env.RPC_URL || 'https://rpc.soenium.io';
    
    // Create SDK instance with custom gas settings to minimize costs
    const sdkOptions = {
      gasSettings: {
        maxPriorityFeePerGas: GAS_SETTINGS.maxPriorityFeePerGas,
        maxFeePerGas: GAS_SETTINGS.maxFeePerGas,
      }
    };
    
    const sdk = ThirdwebSDK.fromPrivateKey(privateKey, rpcUrl, sdkOptions);
    
    // Get the connected wallet address
    const address = await sdk.wallet.getAddress();
    logLine(`Connected to network with wallet: ${address}`);
    logLine(`Gas settings: Max Priority Fee=${GAS_SETTINGS.maxPriorityFeePerGas}, Max Fee=${GAS_SETTINGS.maxFeePerGas}`);
    
    // Initialize marketplace and NFT contracts
    const marketplace = await sdk.getContract(MARKETPLACE_ADDRESS, "marketplace-v3");
    const nftCollection = await sdk.getContract(NFT_CONTRACT_ADDRESS, "edition");
    
    // Initialize the ASTR token contract (we'll be using ASTR randomly)
    const astrContract = await sdk.getContract(CURRENCY_OPTIONS.ASTR.address);
    logLine(`ASTR token contract initialized`);
    
    return { sdk, marketplace, nftCollection, currencyContract: astrContract, address };
  } catch (error) {
    logLine(`Error setting up SDK: ${error.message}`);
    throw error;
  }
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

async function checkAndSetApproval(nftCollection, marketplace, currencyContract, address) {
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
    
    // Always approve ASTR tokens since we might randomly use it
    if (currencyContract) {
      try {
        // Approve marketplace to spend ASTR tokens - Skip allowance check and just set approval
        logLine("Setting approval for ASTR tokens...");
        
        // Use ERC20 approve method directly to authorize the marketplace to spend tokens
        const tokenApprovalTx = await currencyContract.call(
          "approve", 
          [
            MARKETPLACE_ADDRESS, 
            ethers.utils.parseUnits("100000", 18).toString() // Approve a large amount
          ]
        );
        
        logLine(`ASTR token approval transaction successful: ${tokenApprovalTx.receipt.transactionHash}`);
      } catch (tokenError) {
        logLine(`Error approving ASTR tokens: ${tokenError.message}`);
        throw tokenError;
      }
    }
    
    return true;
  } catch (error) {
    logLine(`Error in approval process: ${error.message}`);
    throw error;
  }
}

// Function to retry failed transactions with exponential backoff
async function withRetry(operationName, operation, retryCount = GAS_SETTINGS.retryCount) {
  let lastError;
  let backoffTime = GAS_SETTINGS.retryDelayMs;
  
  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      if (attempt > 0) {
        logLine(`${operationName}: Retry attempt ${attempt}/${retryCount}...`);
      }
      
      return await operation();
    } catch (error) {
      lastError = error;
      
      // If this was the last attempt, rethrow
      if (attempt === retryCount) {
        throw error;
      }
      
      // Log error and wait before retry
      logLine(`${operationName} failed: ${error.message}`);
      logLine(`Waiting ${Math.round(backoffTime / 1000)} seconds before retry...`);
      await new Promise(resolve => setTimeout(resolve, backoffTime));
      
      // Exponential backoff: double the wait time for next attempt
      backoffTime *= 2;
    }
  }
}

async function createDirectListing(marketplace, address, listingNumber, forceCurrency = null) {
  return withRetry(`Listing #${listingNumber}`, async () => {
    // Calculate timestamps for listing duration
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(now.getDate() + LISTING_DURATION_DAYS);
    
    // Use forceCurrency if provided, otherwise use probability distribution (65% ASTR, 35% ETH)
    let selectedCurrency;
    if (forceCurrency) {
      selectedCurrency = forceCurrency;
      logLine(`Using forced currency ${forceCurrency} for listing #${listingNumber}`);
    } else {
      // Favor ASTR (65%) over ETH (35%)
      const random = Math.random();
      selectedCurrency = random < 0.65 ? "ASTR" : "NATIVE_ETH";
      logLine(`Using probability-based currency ${selectedCurrency} (65% ASTR) for listing #${listingNumber}`);
    }
    
    // Get the currency configuration to use
    const currencyConfig = CURRENCY_OPTIONS[selectedCurrency];
    
    const startTime = performance.now();
    logLine(`Creating listing #${listingNumber} at price ${currencyConfig.price} ${currencyConfig.label}...`);
    
    // Create direct listing using thirdweb SDK - listing ONE copy at a time
    const createListingTx = await marketplace.directListings.createListing({
      assetContractAddress: NFT_CONTRACT_ADDRESS,
      tokenId: TOKEN_ID,
      quantity: "1", // Important: List exactly 1 copy of the token
      currencyContractAddress: currencyConfig.address,
      pricePerToken: currencyConfig.price,
      startTimestamp: now,
      endTimestamp: endDate,
      isReservedListing: false
    });
    
    const endTime = performance.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    logLine(`Listing created successfully in ${duration}s! Gas used: ${createListingTx.receipt.gasUsed}, TX Hash: ${createListingTx.receipt.transactionHash}`);
    logLine(`Listed 1 copy of token ID ${TOKEN_ID} at ${currencyConfig.price} ${currencyConfig.label}`);
    
    // Immediately return without waiting - maximum speed
    return createListingTx;
  });
}

async function runListingProcess() {
  try {
    logLine("Starting NFT listing process with thirdweb SDK - customized hourly listing pattern...");
    logLine(`Will create one ETH and one ASTR listing at the top of each hour normally`);
    logLine(`During daytime hours (1pm-7pm), will only create one ASTR listing`);
    logLine(`For balance decreases, favoring ASTR (65%) over ETH (35%)`);
    logLine(`Checking for balance decreases every 10 minutes`);
    logLine(`When balance decreases, will mint exactly the same number of tokens that were lost`);
    logLine(`ETH price: ${CURRENCY_OPTIONS.NATIVE_ETH.price} ETH, ASTR price: ${CURRENCY_OPTIONS.ASTR.price} ASTR`);
    
    // Initialize SDK and contracts
    const { sdk, marketplace, nftCollection, currencyContract, address } = await setupSDK();
    
    // Check NFT balance
    let balance = await checkNFTBalance(nftCollection, address);
    
    // Check and set approval if needed - this is only done once to save gas
    await checkAndSetApproval(nftCollection, marketplace, currencyContract, address);
    
    // Get balance again after approval
    balance = await checkNFTBalance(nftCollection, address);
    let listingCount = 0;
    let startTime = Date.now();
    
    // Number of listings to create on each iteration
    let listingsToCreate = 1;
    
    if (balance <= 0) {
      logLine(`No copies of token ID ${TOKEN_ID} available to list. Exiting.`);
      return;
    }
    
    logLine(`Found ${balance} copies of token ID ${TOKEN_ID} to list`);
    
    // Track previous balance to detect external changes
    let previousBalance = balance;
    let balanceDecreaseDetected = false;
    
    // Loop indefinitely until no tokens left or script is stopped
    while (balance > 0) {
      try {
        // If a balance decrease was detected or this is the first listing
        if (balanceDecreaseDetected || listingCount === 0) {
          // Create multiple listings if tokens were lost
          const listingsThisRound = listingCount === 0 ? 1 : listingsToCreate;
          logLine(`Creating ${listingsThisRound} listing(s) this round...`);
          
          for (let i = 0; i < listingsThisRound; i++) {
            // Create listing for ONE copy with retry mechanism
            await createDirectListing(marketplace, address, listingCount + 1);
            listingCount++;
            
            // Calculate and show rate statistics
            const elapsedMinutes = (Date.now() - startTime) / 60000;
            
            logLine(`Listing ${listingCount} complete. Total elapsed time: ${elapsedMinutes.toFixed(2)} minutes. Remaining: ${balance}`);
          }
          
          // Update balance after all listings
          const newBalance = await checkNFTBalance(nftCollection, address);
          
          // Check if balance actually decreased
          if (newBalance >= balance) {
            logLine("Warning: Token balance did not decrease after listing. The marketplace might not be taking custody of the token.");
          }
          
          // Update for next iteration
          previousBalance = balance;
          balance = newBalance;
          
          // Reset for next round
          balanceDecreaseDetected = false;
          listingsToCreate = 1; // Default to 1 for scheduled listings
        }
        
        // Calculate wait time until the top of the next hour
        const now = new Date();
        const nextHour = new Date(now);
        nextHour.setHours(now.getHours() + 1);
        nextHour.setMinutes(0);
        nextHour.setSeconds(0);
        nextHour.setMilliseconds(0);
        
        const waitTimeMs = nextHour.getTime() - now.getTime();
        const waitTimeSeconds = waitTimeMs / 1000;
        
        const nextScheduledListingTime = new Date(Date.now() + waitTimeMs);
        logLine(`Scheduled next listings for top of next hour: ${nextScheduledListingTime.toLocaleTimeString()}, waiting ${(waitTimeSeconds/60).toFixed(1)} minutes`);
        logLine(`Will check for balance changes every 10 minutes while waiting...`);
        
        // Start wait timer but check for token balance changes every 10 minutes
        let waitedMs = 0;
        let breakEarly = false;
        
        while (waitedMs < waitTimeMs && !breakEarly) {
          // Check every 10 minutes (600 seconds)
          const checkIntervalMs = 10 * 60 * 1000; // 10 minutes in ms
          
          // Wait for the check interval or remainder, whichever is smaller
          const waitThisRound = Math.min(checkIntervalMs, waitTimeMs - waitedMs);
          await new Promise(resolve => setTimeout(resolve, waitThisRound));
          waitedMs += waitThisRound;
          
          // Check if token balance changed during wait
          const currentBalance = await checkNFTBalance(nftCollection, address);
          
          if (currentBalance < balance) {
            // Balance DECREASED - mint the exact number of tokens lost
            const tokensLost = balance - currentBalance;
            logLine(`Token balance DECREASED during wait (from ${balance} to ${currentBalance}). ${tokensLost} tokens lost.`);
            logLine(`Creating ${tokensLost} new listings to match the number of tokens lost...`);
            
            // Update the balance immediately
            balance = currentBalance;
            
            // We'll create the listings in the main loop
            balanceDecreaseDetected = true;
            breakEarly = true;
            
            // Store the number of tokens to mint
            listingsToCreate = tokensLost;
          } else if (currentBalance > balance) {
            // Balance increased
            logLine(`Token balance INCREASED during wait (from ${balance} to ${currentBalance}). Continuing to wait.`);
            balance = currentBalance;
          } else {
            // Balance unchanged
            const remainingSeconds = (waitTimeMs - waitedMs) / 1000;
            logLine(`Balance check: still ${currentBalance} tokens. Next check in 10 minutes. Remaining wait: ${(remainingSeconds / 60).toFixed(1)} minutes`);
          }
        }
        
        if (!breakEarly) {
          // Get current hour to determine listing strategy
          const now = new Date();
          const currentHour = now.getHours();
          const isDaytimeHours = currentHour >= 13 && currentHour < 19; // 1pm to 7pm
          
          logLine(`TIME CHECK: Current time is ${now.toLocaleString()}, hour is ${currentHour}`);
          logLine(`TIME CHECK: isDaytimeHours (1pm-7pm) = ${isDaytimeHours}`);
          
          // Append to the time check file each time we reach this point
          fs.appendFileSync('./time-check.txt', 
            `\n\nTime check at listing decision: ${now.toLocaleString()}\n` +
            `Current hour: ${currentHour}\n` +
            `Is daytime hours (1pm-7pm): ${isDaytimeHours}\n` +
            `Will execute: ${isDaytimeHours ? 'ONE ASTR listing only' : 'Both ETH and ASTR listings'}\n`
          );
          
          if (isDaytimeHours) {
            logLine("Current time is between 1pm-7pm. Creating only one ASTR listing at top of the hour...");
            
            // Create only ASTR listing during daytime hours
            await createDirectListing(marketplace, address, listingCount + 1, "ASTR");
            listingCount++;
            const elapsedMinutes = (Date.now() - startTime) / 60000;
            logLine(`ASTR Listing ${listingCount} complete. Total elapsed time: ${elapsedMinutes.toFixed(2)} minutes. Remaining: ${balance}`);
            
            // Check balance after ASTR listing
            let newBalance = await checkNFTBalance(nftCollection, address);
            if (newBalance >= balance) {
              logLine("Warning: Token balance did not decrease after ASTR listing. The marketplace might not be taking custody of the token.");
            }
            balance = newBalance;
          } else {
            logLine("Current time is outside 1pm-7pm. Creating ETH and ASTR listings at top of the hour...");
            
            // Create one ETH listing
            await createDirectListing(marketplace, address, listingCount + 1, "NATIVE_ETH");
            listingCount++;
            const elapsedMinutes1 = (Date.now() - startTime) / 60000;
            logLine(`ETH Listing ${listingCount} complete. Total elapsed time: ${elapsedMinutes1.toFixed(2)} minutes. Remaining: ${balance}`);
            
            // Check balance after ETH listing
            let newBalance = await checkNFTBalance(nftCollection, address);
            if (newBalance >= balance) {
              logLine("Warning: Token balance did not decrease after ETH listing. The marketplace might not be taking custody of the token.");
            }
            balance = newBalance;
            
            // If we still have tokens, create ASTR listing
            if (balance > 0) {
              await createDirectListing(marketplace, address, listingCount + 1, "ASTR");
              listingCount++;
              const elapsedMinutes2 = (Date.now() - startTime) / 60000;
              logLine(`ASTR Listing ${listingCount} complete. Total elapsed time: ${elapsedMinutes2.toFixed(2)} minutes. Remaining: ${balance}`);
              
              // Check balance after ASTR listing
              newBalance = await checkNFTBalance(nftCollection, address);
              if (newBalance >= balance) {
                logLine("Warning: Token balance did not decrease after ASTR listing. The marketplace might not be taking custody of the token.");
              }
              balance = newBalance;
            }
          }
          
          // Reset the balance decrease detection for next round
          balanceDecreaseDetected = false;
          listingsToCreate = 1;
        }
      } catch (error) {
        logLine(`Error during listing process: ${error.message}`);
        // Wait only 3 seconds on error before retrying
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    const totalTimeMinutes = (Date.now() - startTime) / 60000;
    
    logLine(`All tokens listed! Total: ${listingCount} listings in ${totalTimeMinutes.toFixed(2)} minutes`);
    
  } catch (error) {
    logLine(`Critical error: ${error.message}`);
    logLine("Process terminated due to critical error.");
  }
}

// Run the script
runListingProcess().catch(console.error); 