#!/bin/bash

# Load nvm (required since we installed Node.js using nvm)*./run-script.sh
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Run the thirdweb script
node thirdweb-listing.js 