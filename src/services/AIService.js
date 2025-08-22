import DeFiServices from './DeFiServices';

class AIService {
  constructor() {
    this.apiKey = process.env.REACT_APP_OPENAI_API_KEY;
    this.baseUrl = 'https://api.openai.com/v1/chat/completions';
    this.intentPatterns = this.initializeIntentPatterns();
  }

  initializeIntentPatterns() {
    return {
      balance: [
        /balance/i, /how much/i, /funds/i, /money/i, /wallet/i
      ],
      send: [
        /send/i, /transfer/i, /pay/i, /give/i
      ],
      history: [
        /history/i, /transactions/i, /tx/i, /past/i, /previous/i, /recent/i
      ],
      gas: [
        /gas/i, /fee/i, /cost/i, /estimate/i
      ],
      network: [
        /network/i, /chain/i, /block/i, /status/i
      ],
      staking: [
        /stak/i, /validator/i, /delegate/i, /rewards/i
      ],
      liquidity: [
        /liquidity/i, /pool/i, /lp/i, /provide/i
      ],
      farming: [
        /farm/i, /yield/i, /harvest/i
      ],
      lending: [
        /lend/i, /borrow/i, /supply/i, /collateral/i
      ],
      governance: [
        /governance/i, /vote/i, /proposal/i, /dao/i
      ],
      faucet: [
        /faucet/i, /claim/i, /free/i, /testnet/i, /get.*clayer/i, /need.*clayer/i
      ],
      defi: [
        /defi/i, /protocol/i, /dapp/i
      ],
      address: [
        /address/i, /wallet/i, /account/i
      ],
      help: [
        /help/i, /what can you do/i, /commands/i, /how/i
      ]
    };
  }

  detectIntent(message) {
    const lowerMessage = message.toLowerCase();
    
    for (const [intent, patterns] of Object.entries(this.intentPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(lowerMessage)) {
          return intent;
        }
      }
    }
    
    return 'general';
  }

  extractEntities(message, intent) {
    const entities = {};
    
    // Extract addresses (0x followed by 40 hexadecimal characters)
    const addressMatch = message.match(/0x[a-fA-F0-9]{40}/);
    if (addressMatch) {
      entities.address = addressMatch[0];
    }
    
    // Extract amounts (number followed by optional currency)
    const amountMatch = message.match(/(\d+\.?\d*)\s*(clayer|eth|btc|usdc|usdt)?/i);
    if (amountMatch) {
      entities.amount = parseFloat(amountMatch[1]);
      entities.currency = amountMatch[2] || 'CLAYER';
    }
    
    // Extract cryptocurrency symbols
    const cryptoMatch = message.match(/\b(clayer|eth|ethereum|btc|bitcoin|usdc|usdt|bnb)\b/gi);
    if (cryptoMatch) {
      entities.symbols = [...new Set(cryptoMatch.map(s => s.toUpperCase()))];
    }
    
    return entities;
  }

  async processMessage(message, context = {}) {
    try {
      const intent = this.detectIntent(message);
      const entities = this.extractEntities(message, intent);
      
      console.log('Detected intent:', intent, 'Entities:', entities);
      
      // Handle specific intents
      switch (intent) {
        case 'balance':
          return await this.handleBalanceIntent(entities);
        case 'send':
          return await this.handleSendIntent(message, entities);
        case 'history':
          return await this.handleHistoryIntent(entities);
        case 'gas':
          return await this.handleGasIntent(entities);
        case 'network':
          return await this.handleNetworkIntent();
        case 'staking':
          return await this.handleStakingIntent();
        case 'liquidity':
          return await this.handleLiquidityIntent();
        case 'farming':
          return await this.handleFarmingIntent();
        case 'lending':
          return await this.handleLendingIntent();
        case 'governance':
          return await this.handleGovernanceIntent();
        case 'faucet':
          return await this.handleFaucetIntent(message, entities);
        case 'defi':
          return await this.handleDeFiIntent();
        case 'address':
          return await this.handleAddressIntent();
        case 'help':
          return this.handleHelpIntent();
        default:
          return await this.queryOpenAI(message, { intent, entities });
      }
    } catch (error) {
      console.error('Error processing message:', error);
      return {
        text: "I'm sorry, I encountered an error while processing your request. Please try again.",
        type: 'error'
      };
    }
  }

  async handleBalanceIntent(entities) {
    try {
      const balance = await DeFiServices.getBalance();
      
      return {
        text: `� **Wallet Overview**

**Balance:** ${parseFloat(balance.balance).toFixed(4)} CLAYER
**Address:** \`${DeFiServices.formatAddress(balance.address)}\`

📊 **Quick Actions:**
• 💸 Send tokens: "Send X CLAYER to 0x..."
• 🎯 Stake for rewards: "Show staking options"  
• 🌊 Add liquidity: "Show pools"
• 📈 View opportunities: "Show farming"

💡 *Ask "What can I do with my balance?" for suggestions*`,
        type: 'balance',
        data: balance
      };
    } catch (error) {
      return {
        text: `❌ **Unable to fetch balance**\n\nError: ${error.message}\n\n🔧 **Troubleshooting:**\n• Check wallet connection\n• Verify network connectivity\n• Try refreshing the page`,
        type: 'error'
      };
    }
  }

  async handleGasIntent(entities) {
    try {
      if (entities.address && entities.amount) {
        const gasEstimate = await DeFiServices.estimateGasFee(entities.address, entities.amount);
        return {
          text: `⛽ **Gas Fee Estimate**\n\n**For sending ${entities.amount} CLAYER:**\n• **Gas Limit:** ${gasEstimate.gasLimit}\n• **Gas Price:** ${parseFloat(gasEstimate.gasPrice).toFixed(2)} Gwei\n• **Total Gas Cost:** ${parseFloat(gasEstimate.totalGasCost).toFixed(6)} CLAYER\n\n**Transaction Total:** ${(entities.amount + parseFloat(gasEstimate.totalGasCost)).toFixed(6)} CLAYER`,
          type: 'gas',
          data: gasEstimate
        };
      } else {
        const networkInfo = await DeFiServices.getNetworkInfo();
        return {
          text: `⛽ **Current Gas Information**\n\n**Network Gas Price:** ${parseFloat(networkInfo.gasPrice).toFixed(2)} Gwei\n\n**Typical Transaction Costs:**\n• **Simple Transfer:** ~0.0001 CLAYER\n• **Token Swap:** ~0.0003 CLAYER\n• **LP Operation:** ~0.0005 CLAYER\n\n*To get exact estimate, specify: "estimate gas for sending X CLAYER to 0x..."*`,
          type: 'gas',
          data: networkInfo
        };
      }
    } catch (error) {
      return {
        text: `❌ Error fetching gas information: ${error.message}`,
        type: 'error'
      };
    }
  }

  async handleStakingIntent() {
    try {
      const stakingInfo = await DeFiServices.getStakingInfo();
      
      let stakingText = `🥩 **Staking Opportunities**\n\n`;
      
      if (parseFloat(stakingInfo.totalStaked) > 0) {
        stakingText += `**Your Staking:**\n• **Staked:** ${stakingInfo.totalStaked} CLAYER\n• **Rewards:** ${stakingInfo.rewards} CLAYER\n• **APY:** ${stakingInfo.apy}\n\n`;
      }
      
      stakingText += `**Available Staking Pools:**\n\n`;
      
      stakingInfo.stakingPools.forEach((pool, index) => {
        stakingText += `**${index + 1}. ${pool.name}**\n`;
        stakingText += `   • **APY:** ${pool.apy}\n`;
        stakingText += `   • **TVL:** ${pool.tvl}\n`;
        stakingText += `   • **Min Stake:** ${pool.minStake} CLAYER\n\n`;
      });

      return {
        text: stakingText,
        type: 'staking',
        data: stakingInfo
      };
    } catch (error) {
      return {
        text: `❌ Error fetching staking info: ${error.message}`,
        type: 'error'
      };
    }
  }

  async handleLiquidityIntent() {
    try {
      const pools = await DeFiServices.getLiquidityPools();
      
      let liquidityText = `💧 **Liquidity Pools**\n\n`;
      
      pools.forEach((pool, index) => {
        liquidityText += `**${index + 1}. ${pool.name} Pool**\n`;
        liquidityText += `   • **APY:** ${pool.apy}\n`;
        liquidityText += `   • **TVL:** $${pool.tvl}\n`;
        liquidityText += `   • **24h Volume:** $${pool.volume24h}\n`;
        liquidityText += `   • **Fees:** ${pool.fees}\n`;
        liquidityText += `   • **Your Share:** ${pool.poolShare}\n\n`;
      });

      liquidityText += `**Benefits of Providing Liquidity:**\n• Earn trading fees from swaps\n• Receive additional farming rewards\n• Support the ecosystem\n\n*Start with smaller amounts to understand impermanent loss*`;

      return {
        text: liquidityText,
        type: 'liquidity',
        data: pools
      };
    } catch (error) {
      return {
        text: `❌ Error fetching liquidity info: ${error.message}`,
        type: 'error'
      };
    }
  }

  async handleFarmingIntent() {
    try {
      const farms = await DeFiServices.getFarmingOpportunities();
      
      let farmingText = `🌾 **Yield Farming Opportunities**\n\n`;
      
      farms.forEach((farm, index) => {
        farmingText += `**${index + 1}. ${farm.name}**\n`;
        farmingText += `   • **Token:** ${farm.token}\n`;
        farmingText += `   • **APY:** ${farm.apy}\n`;
        farmingText += `   • **TVL:** $${farm.tvl}\n`;
        farmingText += `   • **Rewards:** ${farm.rewards}\n`;
        farmingText += `   • **Lock Period:** ${farm.lockPeriod}\n`;
        farmingText += `   • **Risk Level:** ${farm.risk}\n\n`;
      });

      farmingText += `**⚠️ Farming Risks:**\n• Impermanent loss for LP tokens\n• Smart contract risks\n• Token price volatility\n\n*Higher APY usually means higher risk*`;

      return {
        text: farmingText,
        type: 'farming',
        data: farms
      };
    } catch (error) {
      return {
        text: `❌ Error fetching farming info: ${error.message}`,
        type: 'error'
      };
    }
  }

  async handleLendingIntent() {
    try {
      const lendingInfo = await DeFiServices.getLendingInfo();
      
      let lendingText = `🏦 **Lending & Borrowing**\n\n`;
      
      if (parseFloat(lendingInfo.totalSupplied) > 0 || parseFloat(lendingInfo.totalBorrowed) > 0) {
        lendingText += `**Your Position:**\n`;
        lendingText += `• **Total Supplied:** ${lendingInfo.totalSupplied} CLAYER\n`;
        lendingText += `• **Total Borrowed:** ${lendingInfo.totalBorrowed} CLAYER\n`;
        lendingText += `• **Net APY:** ${lendingInfo.netApy}\n`;
        lendingText += `• **Health Factor:** ${lendingInfo.healthFactor}\n\n`;
      }
      
      lendingText += `**Available Markets:**\n\n`;
      
      lendingInfo.markets.forEach((market, index) => {
        lendingText += `**${index + 1}. ${market.asset}**\n`;
        lendingText += `   • **Supply APY:** ${market.supplyApy}\n`;
        lendingText += `   • **Borrow APY:** ${market.borrowApy}\n`;
        lendingText += `   • **Utilization:** ${market.utilization}\n`;
        lendingText += `   • **Collateral Factor:** ${market.collateralFactor}\n`;
        lendingText += `   • **Total Supplied:** ${market.totalSupplied}\n\n`;
      });

      return {
        text: lendingText,
        type: 'lending',
        data: lendingInfo
      };
    } catch (error) {
      return {
        text: `❌ Error fetching lending info: ${error.message}`,
        type: 'error'
      };
    }
  }

  async handleGovernanceIntent() {
    try {
      const govInfo = await DeFiServices.getGovernanceInfo();
      
      let govText = `🗳️ **Governance & Voting**\n\n`;
      
      govText += `**Your Voting Power:** ${govInfo.votingPower} CLAYER\n`;
      govText += `**Active Proposals:** ${govInfo.activeProposals}\n\n`;
      
      govText += `**Current Proposals:**\n\n`;
      
      govInfo.proposals.forEach((proposal, index) => {
        govText += `**${proposal.id}. ${proposal.title}**\n`;
        govText += `   • **Status:** ${proposal.status}\n`;
        govText += `   • **End Date:** ${proposal.endDate}\n`;
        govText += `   • **For:** ${proposal.forVotes} | **Against:** ${proposal.againstVotes}\n`;
        govText += `   • ${proposal.description}\n\n`;
      });

      govText += `**How to Participate:**\n• Stake CLAYER tokens to gain voting power\n• Review proposals carefully\n• Vote on important decisions\n• Shape the future of Circle Layer ecosystem`;

      return {
        text: govText,
        type: 'governance',
        data: govInfo
      };
    } catch (error) {
      return {
        text: `❌ Error fetching governance info: ${error.message}`,
        type: 'error'
      };
    }
  }

  async handleSendIntent(message, entities) {
    if (!entities.address || !entities.amount) {
      return {
        text: `📝 **To send tokens, I need:**\n\n• **Recipient address** (0x...)\n• **Amount** to send\n\n**Example:** "Send 1.5 CLAYER to 0x742d35cc6634c0532925a3b8d1e7e98a8a16d7c9"\n\n**Safety Tip:** Always double-check the recipient address before sending!`,
        type: 'help'
      };
    }

    if (!DeFiServices.validateAddress(entities.address)) {
      return {
        text: `❌ **Invalid Address Format**\n\nThe address \`${entities.address}\` is not a valid Ethereum address.\n\nPlease check and try again.`,
        type: 'error'
      };
    }

    try {
      // Check balance first
      const balance = await DeFiServices.getBalance();
      if (parseFloat(balance.balance) < entities.amount) {
        return {
          text: `❌ **Insufficient Balance**\n\nYou're trying to send **${entities.amount} CLAYER** but you only have **${parseFloat(balance.balance).toFixed(4)} CLAYER**\n\nPlease reduce the amount or add more funds to your wallet.`,
          type: 'error'
        };
      }

      const tx = await DeFiServices.sendTransaction(entities.address, entities.amount);
      return {
        text: `✅ **Transaction Sent Successfully!**\n\n**Hash:** \`${tx.hash}\`\n**To:** \`${DeFiServices.formatAddress(tx.to)}\`\n**Amount:** ${tx.value} CLAYER\n**Status:** ${tx.status}\n\n[View on Explorer](${process.env.REACT_APP_CIRCLELAYER_EXPLORER}/tx/${tx.hash})\n\n**Note:** Transaction may take a few minutes to confirm.`,
        type: 'transaction',
        data: tx
      };
    } catch (error) {
      return {
        text: `❌ **Transaction Failed**\n\n${error.message}\n\nPlease check your wallet balance and try again.`,
        type: 'error'
      };
    }
  }

  async handleHistoryIntent(entities) {
    try {
      const history = await DeFiServices.getTransactionHistory();
      const walletAddress = DeFiServices.getWalletAddress();
      
      if (history.length === 0) {
        return {
          text: `📋 **No Recent Transactions**\n\nNo transactions found for wallet: \`${DeFiServices.formatAddress(walletAddress)}\`\n\nOnce you make some transactions, they'll appear here!`,
          type: 'history',
          data: []
        };
      }

      let historyText = `📋 **Recent Transactions** (${history.length})\n\n`;
      
      for (let i = 0; i < Math.min(history.length, 5); i++) {
        const tx = history[i];
        const date = new Date(tx.timestamp * 1000);
        const timeAgo = this.getTimeAgo(date);
        
        historyText += `**${i + 1}.** ${tx.type === 'sent' ? '📤 SENT' : '📥 RECEIVED'}\n`;
        historyText += `   **Amount:** ${parseFloat(tx.value).toFixed(4)} CLAYER\n`;
        historyText += `   **${tx.type === 'sent' ? 'To' : 'From'}:** \`${DeFiServices.formatAddress(tx.type === 'sent' ? tx.to : tx.from)}\`\n`;
        historyText += `   **Time:** ${timeAgo}\n`;
        historyText += `   [View Details](${process.env.REACT_APP_CIRCLELAYER_EXPLORER}/tx/${tx.hash})\n\n`;
      }

      if (history.length > 5) {
        historyText += `*...and ${history.length - 5} more transactions*`;
      }

      return {
        text: historyText,
        type: 'history',
        data: history
      };
    } catch (error) {
      return {
        text: `❌ Error fetching transaction history: ${error.message}`,
        type: 'error'
      };
    }
  }

  async handleDeFiIntent() {
    const protocols = DeFiServices.getDeFiProtocols();
    let protocolText = `🏦 **DeFi Ecosystem on Circle Layer**\n\n`;
    
    protocols.forEach((protocol, index) => {
      protocolText += `**${index + 1}. ${protocol.name}** (${protocol.category})\n`;
      protocolText += `   💰 **TVL:** $${protocol.tvl}\n`;
      protocolText += `   📊 **APY:** ${protocol.apy}\n`;
      protocolText += `   📝 ${protocol.description}\n`;
      protocolText += `   🔧 **Features:** ${protocol.features.join(', ')}\n\n`;
    });

    const totalTvl = protocols.reduce((sum, p) => sum + parseFloat(p.tvl.replace('M', '')), 0).toFixed(1);
    protocolText += `**Total Ecosystem TVL:** $${totalTvl}M\n\n`;
    protocolText += `**Getting Started:**\n• Start with small amounts\n• Understand the risks\n• DYOR (Do Your Own Research)\n• Consider diversification`;

    return {
      text: protocolText,
      type: 'protocols',
      data: protocols
    };
  }

  async handleNetworkIntent() {
    try {
      const networkInfo = await DeFiServices.getNetworkInfo();
      return {
        text: `🌐 **Circle Layer Network Status**\n\n**Chain ID:** ${networkInfo.chainId}\n**Latest Block:** #${networkInfo.blockNumber}\n**Gas Price:** ${parseFloat(networkInfo.gasPrice).toFixed(2)} Gwei\n\n**Network Performance:**\n• **Block Time:** ~3 seconds\n• **TPS:** Up to 1000+\n• **Finality:** Instant\n\n**Useful Links:**\n• [Explorer](${process.env.REACT_APP_CIRCLELAYER_EXPLORER})\n• [RPC Endpoint](${process.env.REACT_APP_CIRCLELAYER_RPC_URL})\n• [Faucet](https://faucet.circlelayer.com)\n• [Documentation](https://docs.circlelayer.com)`,
        type: 'network',
        data: networkInfo
      };
    } catch (error) {
      return {
        text: `❌ Error fetching network info: ${error.message}`,
        type: 'error'
      };
    }
  }

  async handleAddressIntent() {
    const walletAddress = DeFiServices.getWalletAddress();
    return {
      text: `🏦 **Your Wallet Information**\n\n**Address:** \`${walletAddress}\`\n**Short:** \`${DeFiServices.formatAddress(walletAddress)}\`\n\n**Quick Actions:**\n• [View on Explorer](${process.env.REACT_APP_CIRCLELAYER_EXPLORER}/address/${walletAddress})\n• [Get Testnet Tokens](https://faucet.circlelayer.com)\n• [Claim Faucet](https://faucet.circlelayer.com)\n\n**🛡️ Security Reminder:** Never share your private key with anyone!`,
      type: 'wallet',
      data: { address: walletAddress }
    };
  }

  handleHelpIntent() {
    return {
      text: `🤖 **DeFi AI Assistant - Complete Guide**\n\n**💰 Wallet Operations**\n• "What's my balance?"\n• "Send 1.5 CLAYER to 0x..."\n• "Show my address"\n• "Transaction history"\n\n**🚰 Faucet Operations**\n• "Claim faucet"\n• "Get free CLAYER tokens"\n• "Faucet status"\n\n**⛽ Gas & Network**\n• "Current gas fees"\n• "Estimate gas for sending X CLAYER"\n• "Network status"\n\n**🏦 DeFi Protocols**\n• "Show DeFi protocols"\n• "Staking opportunities"\n• "Liquidity pools"\n• "Yield farming"\n• "Lending markets"\n• "Governance proposals"\n\n**❓ General Help**\n• "What is staking?"\n• "How does yield farming work?"\n• "Explain impermanent loss"\n• "DeFi security tips"\n\n**🎯 Just chat naturally - I understand context and can help with any DeFi question!**`,
      type: 'help'
    };
  }

  getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  }

  async queryOpenAI(message, context = {}) {
    try {
            const systemPrompt = `You are a helpful DeFi (Decentralized Finance) AI assistant built on the Circle Layer blockchain. You help users with:

1. Understanding DeFi concepts and terminology
2. Explaining blockchain and cryptocurrency basics
3. Providing information about the Circle Layer ecosystem
4. General crypto and DeFi education
5. Answering questions about wallet management, transactions, and security

Key information about Circle Layer:
- Circle Layer is a high-performance EVM-compatible blockchain
- Testnet RPC: https://testnet-rpc.circlelayer.com
- Explorer: https://explorer-testnet.circlelayer.com
- Chain ID: 28525
- Native token: CLAYER
- Faucet: https://faucet.circlelayer.com

The system handles specific DeFi operations automatically based on user intent. Your role is to provide educational content, explanations, and general assistance when the user asks general questions about DeFi, crypto, or blockchain technology.

Be helpful, informative, and always prioritize user security and best practices. Keep responses concise but comprehensive.

User context: ${JSON.stringify(context)}`;

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          max_tokens: 800,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content || 'I apologize, but I could not generate a response.';

      return {
        text: aiResponse,
        type: 'ai',
        data: null
      };
    } catch (error) {
      console.error('OpenAI query error:', error);
      return {
        text: "I'm having trouble connecting to my AI service right now. However, I can still help you with DeFi operations like checking your balance, sending transactions, viewing history, and getting price information. Try asking about those!",
        type: 'error'
      };
    }
  }
}

const aiService = new AIService();
export default aiService;
