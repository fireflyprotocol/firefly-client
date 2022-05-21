import BigNumber from "bignumber.js";
import { Price, Fee, address } from "../types";

export interface Order {
  isBuy: boolean;
  isDecreaseOnly: boolean;
  amount: BigNumber;
  limitPrice: Price;
  triggerPrice: Price;
  limitFee: Fee;
  leverage: BigNumber;
  maker: address;
  taker: address;
  expiration: BigNumber;
  salt: BigNumber;
}

export interface SignedOrder extends Order {
  typedSignature: string;
}

export interface SolidityOrder {
  isBuy: boolean;
  isDecreaseOnly: boolean;
  amount: BigNumber;
  limitPrice: BigNumber;
  triggerPrice: BigNumber;
  limitFee: BigNumber;
  leverage: BigNumber;
  maker: address;
  taker: address;
  expiration: BigNumber;
  salt: BigNumber;
}

export interface SignedSolidityOrder extends SolidityOrder {
  typedSignature: string;
}

export interface RawOrder {
  isBuy: boolean;
  isDecreaseOnly: boolean;
  amount: string;
  limitPrice: string;
  triggerPrice: string;
  limitFee: string;
  leverage: string;
  maker: string;
  taker: string;
  expiration: number;
  salt: string;
  typedSignature: string;
}
