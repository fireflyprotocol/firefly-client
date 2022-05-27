import BigNumber from "bignumber.js";
import { BigNumberable } from "../types";
import { BalanceStruct, PosAndNegValues } from "../interfaces/on-chain";
import { Price } from "./baseValue";

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
      struct.sizeIsPositive ? sizeBN : sizeBN.negated()
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
      ? this.debt.gt(0)
        ? positionMargin.minus(openInterest)
        : openInterest.plus(positionMargin)
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
      sizeIsPositive ? size : size.negated()
    );
    (result as any).rawValue = balance;
    return result;
  }

  public static parseDepositInfo(depositData: string): {
    makerDeposit: BigNumber;
    takerDeposit: BigNumber;
  } {
    const makerDeposit = new BigNumber(depositData.substr(4, 30), 16);
    const takerDeposit = new BigNumber(depositData.substr(36, 30), 16);
    return { makerDeposit, takerDeposit };
  }
}
