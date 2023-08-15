export const SERVICE_URLS = {
  MARKET: {
    ORDER_BOOK: "/orderbook",
    RECENT_TRADE: "/recentTrades",
    CANDLE_STICK_DATA: "/candlestickData",
    EXCHANGE_INFO: "/exchangeInfo",
    MARKET_DATA: "/marketData",
    META: "/meta",
    STATUS: "/status",
    SYMBOLS: "/marketData/symbols",
    CONTRACT_ADDRESSES: "/marketData/contractAddresses",
    TICKER: "/ticker",
    MASTER_INFO: "/masterInfo",
    FUNDING_RATE: "/fundingRate"
  },
  USER: {
    USER_POSITIONS: "/userPosition",
    USER_TRADES: "/userTrades",
    ORDERS: "/orders",
    ACCOUNT: "/account",
    GENERATE_READONLY_TOKEN: "/generateReadOnlyToken",
    VERIFY_DEPOSIT: "/account/verifyDeposit",
    USER_TRANSACTION_HISTORY: "/userTransactionHistory",
    AUTHORIZE: "/authorize",
    ADJUST_LEVERGAE: "/account/adjustLeverage",
    FUND_GAS: "/account/fundGas",
    TRANSFER_HISTORY: "/userTransferHistory",
    FUNDING_HISTORY: "/userFundingHistory",
    CANCEL_ON_DISCONNECT: "/dms-countdown"
  },
  GROWTH: {
    REFERRER_INFO: "/growth/getReferrerInfo",
    CAMPAIGN_DETAILS: "/growth/campaignDetails",
    CAMPAIGN_REWARDS: "/growth/campaignRewards",
    AFFILIATE_PAYOUTS: "/growth/affiliate/payouts",
    AFFILIATE_REFEREE_DETAILS: "/growth/affiliate/refereeDetails",
    AFFILIATE_REFEREES_COUNT: "/growth/affiliate/refereesCount",
    USER_REWARDS_HISTORY: "/growth/userRewards/history",
    USER_REWARDS_SUMMARY: "/growth/userRewards/summary",
    REWARDS_OVERVIEW: "/growth/tradeAndEarn/rewardsOverview",
    REWARDS_DETAILS: "/growth/tradeAndEarn/rewardsDetail",
    TOTAL_HISTORICAL_TRADING_REWARDS: "/growth/tradeAndEarn/totalHistoricalTradingRewards",
    MAKER_REWARDS_SUMMARY: "/growth/marketMaker/maker-rewards-summary",
    MAKER_REWARDS_DETAILS: "/growth/marketMaker/maker-rewards-detail",
    MAKER_WHITELIST_STATUS: "/growth/marketMaker/whitelist-status",
    GENERATE_CODE: "/growth/generateCode",
    LINK_REFERRED_USER: "/growth/linkReferredUser"
  },
  ORDERS: {
    ORDERS: "/orders",
    ORDERS_HASH: "/orders/hash",
  }
};
