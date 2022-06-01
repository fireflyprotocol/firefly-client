import BigNumber from "bignumber.js";
import { BigNumberable } from "../types";
import { SignedIntStruct } from "../interfaces/on-chain";
import { BASE_DECIMALS } from "../constants";

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

  static fromSolidity(
    solidityValue: BigNumberable,
    isPositive: boolean = true
  ): BaseValue {
    // Help to detect errors in the parsing and typing of Solidity data.
    if (typeof isPositive !== "boolean") {
      throw new Error(
        "Error in BaseValue.fromSolidity: isPositive was not a boolean"
      );
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
    return new BaseValue(
      this.value.decimalPlaces(BASE_DECIMALS, BigNumber.ROUND_DOWN)
    );
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

export class Price extends BaseValue {}

export class Fee extends BaseValue {
  static fromBips(value: BigNumberable): Fee {
    return new Fee(new BigNumber("1e-4").times(value));
  }
}

// TODO: remove this class, not being used
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
