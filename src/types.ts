import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';
import { BASE_DECIMALS } from "./constants"


export type address = string;
export type TypedSignature = string;
export type Provider = ethers.providers.JsonRpcProvider;
export type BigNumberable = BigNumber | number | string;
export type MarketSymbol = string;

/*
 * ==================
 *      CLASSES
 * ==================
 */

/**
 * A value that is represented on the smart contract by an integer shifted by `BASE` decimal places.
 */
export class BaseValue {
  readonly value: BigNumber;

  constructor(value: BigNumberable) {
    this.value = new BigNumber(value);
  }

  public toSolidity(): string {
    return this.value.abs().shiftedBy(BASE_DECIMALS).toFixed(0);
  }

  public toSoliditySignedInt(): SignedIntStruct {
    return {
      value: this.toSolidity(),
      isPositive: this.isPositive(),
    };
  }

  static fromSolidity(solidityValue: BigNumberable, isPositive: boolean = true): BaseValue {
    // Help to detect errors in the parsing and typing of Solidity data.
    if (typeof isPositive !== 'boolean') {
      throw new Error('Error in BaseValue.fromSolidity: isPositive was not a boolean');
    }

    let value = new BigNumber(solidityValue).shiftedBy(-BASE_DECIMALS);
    if (!isPositive) {
      value = value.negated();
    }
    return new BaseValue(value);
  }

  /**
   * Return the BaseValue, rounded down to the nearest Solidity-representable value.
   */
  public roundedDown(): BaseValue {
    return new BaseValue(this.value.decimalPlaces(BASE_DECIMALS, BigNumber.ROUND_DOWN));
  }

  public times(value: BigNumberable): BaseValue {
    return new BaseValue(this.value.times(value));
  }

  public div(value: BigNumberable): BaseValue {
    return new BaseValue(this.value.div(value));
  }

  public plus(value: BigNumberable): BaseValue {
    return new BaseValue(this.value.plus(value));
  }

  public minus(value: BigNumberable): BaseValue {
    return new BaseValue(this.value.minus(value));
  }

  public abs(): BaseValue {
    return new BaseValue(this.value.abs());
  }

  public negated(): BaseValue {
    return new BaseValue(this.value.negated());
  }

  public isPositive(): boolean {
    return this.value.isPositive();
  }

  public isNegative(): boolean {
    return this.value.isNegative();
  }
}

export class Price extends BaseValue {
}

export class Fee extends BaseValue {
    static fromBips(value: BigNumberable): Fee {
      return new Fee(new BigNumber('1e-4').times(value));
    }
}

export class FundingRate extends BaseValue {
    /**
     * Given a daily rate, returns funding rate represented as a per-second rate.
     *
     * Note: Funding interest does not compound, as the interest affects debt balances but
     * is calculated based on size balances.
     */
    static fromEightHourRate(rate: BigNumberable): FundingRate {
      return new FundingRate(new BigNumber(rate).div(8 * 60 * 60));
    }
}


export class Balance {
  public debt: BigNumber;
  public size: BigNumber;

  constructor(debt: BigNumberable, size: BigNumberable) {
    this.debt = new BigNumber(debt);
    this.size = new BigNumber(size);
  }

  static fromSolidity(struct: BalanceStruct): Balance {
    const debtBN = new BigNumber(struct.debt);
    const sizeBN = new BigNumber(struct.size);
    return new Balance(
      struct.debtIsPositive ? debtBN : debtBN.negated(),
      struct.sizeIsPositive ? sizeBN : sizeBN.negated(),
    );
  }

  public toSolidity(): BalanceStruct {
    return {
      debtIsPositive: this.debt.isPositive(),
      sizeIsPositive: this.size.isPositive(),
      debt: this.debt.abs().toFixed(0),
      size: this.size.abs().toFixed(0),
    };
  }

  public calculateAvgPrice(positionMargin: BigNumber): BigNumber {
    const openInterest = this.calculateOpenInterest(positionMargin);
    return openInterest.div(this.size.abs()).shiftedBy(18);
  }

  public calculateOpenInterest(positionMargin: BigNumber): BigNumber {
    let openInterest = this.debt.shiftedBy(18).abs();
    openInterest = this.size.gt(0)
      ? (this.debt.gt(0) ? positionMargin.minus(openInterest) : openInterest.plus(positionMargin))
      : openInterest.minus(positionMargin);
    return openInterest;
  }

  public copy(): Balance {
    return new Balance(this.debt, this.size);
  }

  /**
   * Get the positive and negative values (in terms of debt-token) of the balance,
   * given an oracle price.
   */
  public getPositiveAndNegativeValues(price: Price): PosAndNegValues {
    let positiveValue = new BigNumber(0);
    let negativeValue = new BigNumber(0);

    const debtValue = this.debt.abs();
    if (this.debt.isPositive()) {
      positiveValue = debtValue;
    } else {
      negativeValue = debtValue;
    }

    const sizeValue = this.size.times(price.value).abs();
    if (this.size.isPositive()) {
      positiveValue = positiveValue.plus(sizeValue);
    } else {
      negativeValue = negativeValue.plus(sizeValue);
    }

    return { positiveValue, negativeValue };
  }

  /**
   * Get the collateralization ratio of the balance, given an oracle price.
   *
   * Returns BigNumber(Infinity) if there are no negative balances.
   */
  public getCollateralization(price: Price): BigNumber {
    const values = this.getPositiveAndNegativeValues(price);

    if (values.negativeValue.isZero()) {
      return new BigNumber(Infinity);
    }

    return values.positiveValue.div(values.negativeValue);
  }

  public static parseBalance(balance: string): Balance {
    const debt = new BigNumber(balance.substr(4, 30), 16);
    const size = new BigNumber(balance.substr(36, 30), 16);
    const debtIsPositive = !new BigNumber(balance.substr(2, 2), 16).isZero();
    const sizeIsPositive = !new BigNumber(balance.substr(34, 2), 16).isZero();
    const result = new Balance(
      debtIsPositive ? debt : debt.negated(),
      sizeIsPositive ? size : size.negated(),
    );
    (result as any).rawValue = balance;
    return result;
  }

  public static parseDepositInfo(depositData: string): { makerDeposit: BigNumber, takerDeposit: BigNumber } {
    const makerDeposit = new BigNumber(depositData.substr(4, 30), 16);
    const takerDeposit = new BigNumber(depositData.substr(36, 30), 16);
    return { makerDeposit, takerDeposit }
  }
}

/*
 * ==================
 *      INTERFACES
 * ==================
 */


export interface FreedCollateral {
  flags: number
  collateral: BigNumber
  pnl: BigNumber
  fee: BigNumber
  openInterest: BigNumber
}


export interface ValidationError {
  error: string,
  object?: any
}
  

export interface SignedIntStruct {
    value: string;
    isPositive: boolean;
}

export interface Network{
  url:string,
  chainId: number,
  apiGateway: string
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


  
/*
 * ==================
 *      ENUMS
 * ==================
 */
export enum SigningMethod {
    Compatibility = 'Compatibility',   // picks intelligently between UnsafeHash and Hash
    UnsafeHash = 'UnsafeHash',         // raw hash signed
    Hash = 'Hash',                     // hash prepended according to EIP-191
    TypedData = 'TypedData',           // order hashed according to EIP-712
    MetaMask = 'MetaMask',             // order hashed according to EIP-712 (MetaMask-only)
    MetaMaskLatest = 'MetaMaskLatest', // ... according to latest version of EIP-712 (MetaMask-only)
    CoinbaseWallet = 'CoinbaseWallet', // ... according to latest version of EIP-712 (CoinbaseWallet)
    Personal = 'Personal',             // message signed with personal_sign
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
  MOVR = "MOVR-PERP"
}

export enum ORDER_STATUS{
  PENDING = "PENDING",
  OPEN = "OPEN",
  PARTIAL_FILLED = "PARTIAL_FILLED",
  FILLED = "FILLED",
  CANCELLING = "CANCELLING",
  CANCELLED = "CANCELLED",
  REJECTED = "REJECTED",
  EXPIRED = "EXPIRED"
}


export enum ORDER_TYPE{
  LIMIT = "LIMIT",
  MARKET = "MARKET",
}

export enum ORDER_SIDE{
  BUY = "BUY",
  SELL = "SELL",
}

export enum TIME_IN_FORCE{
  GOOD_TILL_CANCEL = "GTC",
  FILL_OR_KILL = "FOK",
  IMMEDIATE_OR_CANCEL = "IOC"
}