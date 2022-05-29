import BigNumber from "bignumber.js";

export interface FreedCollateral {
  flags: number;
  collateral: BigNumber;
  pnl: BigNumber;
  fee: BigNumber;
  openInterest: BigNumber;
}

export interface ValidationError {
  error: string;
  object?: any;
}

export interface SignedIntStruct {
  value: string;
  isPositive: boolean;
}

export interface Network {
  url: string;
  chainId: number;
  apiGateway: string;
  socketURL: string;
}

export interface BalanceStruct {
  debtIsPositive: boolean;
  sizeIsPositive: boolean;
  debt: string;
  size: string;
}

export interface PosAndNegValues {
  positiveValue: BigNumber;
  negativeValue: BigNumber;
}
