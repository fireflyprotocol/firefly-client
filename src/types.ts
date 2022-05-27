/* eslint-disable no-unused-vars */
/* eslint-disable no-shadow */
// eslint-disable-next-line max-classes-per-file
import BigNumber from "bignumber.js";
import { ethers } from "ethers";

export type address = string;
export type TypedSignature = string;
export type Provider = ethers.providers.JsonRpcProvider;
export type BigNumberable = BigNumber | number | string;
export type MarketSymbol = string;

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
