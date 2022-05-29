/* eslint-disable no-unused-vars */
/* eslint-disable no-shadow */
import BigNumber from "bignumber.js";
import { ethers } from "ethers";
import { Socket } from "socket.io-client";
// @ts-ignores
// eslint-disable-next-line import/no-unresolved
import { DefaultEventsMap } from "socket.io-client/build/typed-events";

export type address = string;
export type TypedSignature = string;
export type Provider = ethers.providers.JsonRpcProvider;
export type BigNumberable = BigNumber | number | string;
export type MarketSymbol = string;
export type Interval =
  | "1m"
  | "3m"
  | "5m"
  | "15m"
  | "30m"
  | "1h"
  | "2h"
  | "4h"
  | "6h"
  | "8h"
  | "12h"
  | "1d"
  | "3d"
  | "1w"
  | "1M";

export type SocketInstance = Socket<DefaultEventsMap, DefaultEventsMap>;

export type MinifiedCandleStick = [
  number, // Open time
  string, // Open price
  string, // High price
  string, // Low price
  string, // Close price
  string, // Volume
  number, // Close time
  string, // Quote asset volume
  number, // Number of trades
  string, // Taker buy base asset volume
  string, // Taker buy quote asset volume
  string // Symbol
];

export type DAPIKlineResponse = Array<MinifiedCandleStick>;

/*
 * ==================
 *      ENUMS
 * ==================
 */

export enum SigningMethod {
  Compatibility = "Compatibility", // picks intelligently between UnsafeHash and Hash
  UnsafeHash = "UnsafeHash", // raw hash signed
  Hash = "Hash", // hash prepended according to EIP-191
  TypedData = "TypedData", // order hashed according to EIP-712
  MetaMask = "MetaMask", // order hashed according to EIP-712 (MetaMask-only)
  MetaMaskLatest = "MetaMaskLatest", // ... according to latest version of EIP-712 (MetaMask-only)
  CoinbaseWallet = "CoinbaseWallet", // ... according to latest version of EIP-712 (CoinbaseWallet)
  Personal = "Personal", // message signed with personal_sign
}

export enum SIGNATURE_TYPES {
  NO_PREPEND = 0,
  DECIMAL = 1,
  HEXADECIMAL = 2,
  PERSONAL = 3,
}

export enum MARKET_SYMBOLS {
  BTC = "BTC-PERP",
  ETH = "ETH-PERP",
  DOT = "DOT-PERP",
  GLMR = "GLMR-PERP",
  MOVR = "MOVR-PERP",
}

export enum ORDER_STATUS {
  PENDING = "PENDING",
  OPEN = "OPEN",
  PARTIAL_FILLED = "PARTIAL_FILLED",
  FILLED = "FILLED",
  CANCELLING = "CANCELLING",
  CANCELLED = "CANCELLED",
  REJECTED = "REJECTED",
  EXPIRED = "EXPIRED",
}

export enum ORDER_TYPE {
  LIMIT = "LIMIT",
  MARKET = "MARKET",
}

export enum ORDER_SIDE {
  BUY = "BUY",
  SELL = "SELL",
}

export enum TIME_IN_FORCE {
  GOOD_TILL_CANCEL = "GTC",
  FILL_OR_KILL = "FOK",
  IMMEDIATE_OR_CANCEL = "IOC",
}

export enum MARGIN_TYPE {
  ISOLATED = "ISOLATED",
  CROSS = "CROSS", // atm exchange only supports isolated margin
}

export enum CANCEL_REASON {
  UNDERCOLLATERALIZED = "UNDERCOLLATERALIZED",
  INSUFFICIENT_BALANCE = "INSUFFICIENT_BALANCE",
  USER_CANCELLED = "USER_CANCELLED",
  EXCEEDS_MARKET_BOUND = "EXCEEDS_MARKET_BOUND",
  COULD_NOT_FILL = "COULD_NOT_FILL",
  EXPIRED = "EXPIRED",
  USER_CANCELLED_ON_CHAIN = "USER_CANCELLED_ON_CHAIN",
  SYSTEM_CANCELLED = "SYSTEM_CANCELLED",
  SELF_TRADE = "SELF_TRADE",
  POST_ONLY_FAIL = "POST_ONLY_FAIL",
  FAILED = "FAILED",
  NETWORK_DOWN = "NETWORK_DOWN",
}

export enum MARKET_STATUS {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  TRADES_INACTIVE = "TRADES_INACTIVE",
}

export enum SOCKET_EVENTS {
  GET_LAST_KLINE_WITH_INTERVAL = "{symbol}@kline@{interval}",
  // Global
  GLOBAL_UPDATES_ROOM = "globalUpdates",

  // Global
  GlobalUpdatesRoom = "globalUpdates",
  MarketDataUpdateKey = "MarketDataUpdate",
  RecentTradesKey = "RecentTrades",
  OrderbookUpdateKey = "OrderbookUpdate",
  AdjustMarginKey = "AdjustMargin",
  MarketHealthKey = "MarketHealth",
  ExchangeHealthKey = "ExchangeHealth",

  // User
  UserUpdatesRoom = "userUpdates",
  OrderUpdateKey = "OrderUpdate",
  OrderCancelledKey = "OrderCancelled",
  PositionUpdateKey = "PositionUpdate",
  UserTradeKey = "UserTrade",
  UserTransaction = "UserTransaction",
  AccountDataUpdateKey = "AccountDataUpdate",
}
