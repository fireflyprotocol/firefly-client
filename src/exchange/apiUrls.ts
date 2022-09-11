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
  },
  USER: {
    USER_POSITIONS: "/userPosition",
    USER_TRADES: "/userTrades",
    ORDERS: "/orders",
    ACCOUNT: "/account",
    USER_TRANSACTION_HISTORY: "/userTransactionHistory",
    AUTHORIZE: "/authorize",
    ADJUST_LEVERGAE: "/account/adjustLeverage",
    FUND_GAS: "/account/fundGas",
  },
  ORDERS: {
    ORDERS: "/orders",
    ORDERS_HASH: "/orders/hash",
  },
};
