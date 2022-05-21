import BigNumber from "bignumber.js";
import Web3 from "web3";

import {
  addressToBytes32,
  bnToBytes32,
  hashString,
  addressesAreEqual,
  combineHexStrings,
} from "../helpers/bytes";

import {
  createTypedSignature,
  ecRecoverTypedSignature,
  ethSignTypedDataInternal,
  hashHasValidSignature,
  getEIP712Hash,
} from "../helpers/signature";

import {
  Balance,
  BigNumberable,
  Fee,
  Price,
  SigningMethod,
  TypedSignature,
  address,
  FreedCollateral,
  ValidationError,
  SIGNATURE_TYPES,
} from "../types";

import {
  Order,
  SignedSolidityOrder,
  SolidityOrder,
  RawOrder,
  SignedOrder,
} from "../interfaces/order";

import {
  ORDER_FLAGS,
  ZERO_REPEAT_60,
  BIGNUMBER_BASE,
  EIP712_DOMAIN_VERSION,
  EIP712_ORDER_STRUCT,
  EIP712_CANCEL_ORDER_STRUCT,
  DEFAULT_EIP712_DOMAIN_NAME,
  EIP712_CANCEL_ORDER_STRUCT_STRING,
  EIP712_ORDER_STRUCT_STRING,
  EIP712_ORDER_SIGNATURE_TYPE_ARR,
  EIP712_DOMAIN_STRING,
  EIP712_DOMAIN_STRUCT,
} from "../constants";

export class OrderSigner {
  private web3: Web3;

  private eip712DomainName: string;

  private networkId: number;

  public address: string;
  // ============ Constructor ============

  constructor(
    _web3: Web3,
    _networkId: number,
    _address: string,
    _eip712DomainName: string = DEFAULT_EIP712_DOMAIN_NAME
  ) {
    this.web3 = _web3;
    this.networkId = _networkId;
    this.address = _address;
    this.eip712DomainName = _eip712DomainName;
  }

  // ============ Off-Chain Helper Functions ============

  /**
   * Estimate the maker's collateralization after executing a sequence of orders.
   *
   * The `maker` of every order must be the same. This function does not make any on-chain calls,
   * so all information must be passed in, including the oracle price and remaining amounts
   * on the orders. Orders are assumed to be filled at the limit price and limit fee.
   *
   * Returns the ending collateralization ratio for the account, or BigNumber(Infinity) if the
   * account does not end with any negative balances.
   *
   * @param  initialBalance  The initial debt and size balances of the maker account.
   * @param  oraclePrice     The price at which to calculate collateralization.
   * @param  orders          A sequence of orders, with the same maker,
   *                         to be hypothetically filled.
   * @param  fillAmounts     The corresponding fill amount for each order,
   *                         denominated in the token spent by the maker--quote
   *                         currency when buying, and base when selling.
   */
  public static getAccountCollateralizationAfterMakingOrders(
    initialBalance: Balance,
    oraclePrice: Price,
    orders: Order[],
    makerTokenFillAmounts: BigNumber[]
  ): BigNumber {
    const runningBalance: Balance = initialBalance.copy();

    // For each order, determine the effect on the balance by following the smart contract math.
    for (let i = 0; i < orders.length; i += 1) {
      const order = orders[i];

      const fillAmount = order.isBuy
        ? makerTokenFillAmounts[i].dividedBy(order.limitPrice.value)
        : makerTokenFillAmounts[i];

      // Assume orders are filled at the limit price and limit fee.
      const { debtDelta, sizeDelta } =
        OrderSigner.getBalanceUpdatesAfterFillingOrder(
          fillAmount,
          order.limitPrice,
          order.limitFee,
          order.isBuy
        );

      runningBalance.debt = runningBalance.debt.plus(debtDelta);
      runningBalance.size = runningBalance.size.plus(sizeDelta);
    }

    return runningBalance.getCollateralization(oraclePrice);
  }

  /**
   * Estimate the maker's balance, positionMargin and wallet balance after executing a sequence of orders.
   *
   * The `maker` of every order must be the same. This function does not make any on-chain calls
   * on the orders. Orders are assumed to be filled at the limit price and limit fee.
   *
   * Returns the expected user Balance and PositionMargin.
   *
   * @param  initialBalance  The initial debt and size balances of the maker account.
   * @param  initialPositionMargin  The initial positionMargin of the maker account.
   * @param  initialWalletBalance  The initial wallet balance of the maker account.
   * @param  orders          A sequence of orders, with the same maker, to be hypothetically filled.
   * @param  fillAmounts     The corresponding fill amount for each order, denominated in the token
   *                         spent by the maker--quote currency when buying, and base when selling.
   */
  public static getAccountStateAfterMakingOrders(
    initialBalance: Balance,
    initialPositionMargin: BigNumber,
    initialWalletBalance: BigNumber,
    orders: RawOrder[],
    fillAmount: BigNumber[],
    validate?: {
      oraclePrice: Price;
      maintenanceMargin: BigNumber;
    }
  ): [
    balance: Balance,
    positionMargin: BigNumber,
    walletBalance: BigNumber,
    error?: ValidationError
  ] {
    let runningBalance: Balance = initialBalance.copy();
    let runningPositionMargin: BigNumber = initialPositionMargin;
    let runningWalletBalance: BigNumber = initialWalletBalance;

    // For each order, determine the effect on the balance by following the smart contract math.
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];

      const [collateralToUse, freedCollateral] =
        OrderSigner.reduceMarginFromBank(
          OrderSigner.calculateFreedCollateralByTrade(
            runningBalance,
            runningPositionMargin,
            new BigNumber(order.amount),
            new BigNumber(order.limitPrice).shiftedBy(18),
            new BigNumber(order.leverage),
            order.isBuy
          )
        );
      // wallet balance validation here
      if (collateralToUse.gt(runningWalletBalance)) {
        return [
          runningBalance,
          runningPositionMargin,
          runningWalletBalance,
          {
            error: "Insufficient wallet balance",
            object: order,
          },
        ];
      }
      runningWalletBalance = runningWalletBalance.minus(collateralToUse);

      [runningBalance, runningPositionMargin, runningWalletBalance] =
        OrderSigner.getUpdatedBalanceAndPositionMargin(
          runningBalance,
          runningPositionMargin,
          runningWalletBalance,
          freedCollateral
        );

      // Assume orders are filled at the limit price and limit fee.
      const { debtDelta, sizeDelta } =
        OrderSigner.getBalanceUpdatesAfterFillingOrder(
          fillAmount[i],
          new Price(new BigNumber(order.limitPrice).shiftedBy(-18)),
          new Fee(new BigNumber(order.limitFee).shiftedBy(-18)),
          order.isBuy
        );

      runningBalance.debt = runningBalance.debt.plus(debtDelta);
      runningBalance.size = runningBalance.size.plus(sizeDelta);
      if (validate) {
        const isUnderCollat = runningBalance
          .getCollateralization(validate.oraclePrice)
          .lt(validate.maintenanceMargin);
        if (isUnderCollat) {
          return [
            runningBalance,
            runningPositionMargin,
            runningWalletBalance,
            {
              error: "Account undercollateralized",
              object: order,
            },
          ];
        }
      }
    }
    return [runningBalance, runningPositionMargin, runningWalletBalance];
  }

  public static calculateFreedCollateralByTrade(
    accountBalance: Balance,
    positionMargin: BigNumber,
    tradeSize: BigNumber,
    entryPrice: BigNumber,
    leverage: BigNumber,
    isBuy: Boolean
  ): FreedCollateral {
    if (
      accountBalance.size.eq(0) ||
      accountBalance.size.isPositive() === isBuy
    ) {
      return {
        flags: 1,
        collateral: entryPrice.times(tradeSize).div(leverage),
        pnl: new BigNumber(0),
        fee: new BigNumber(0),
        openInterest: new BigNumber(0),
      } as FreedCollateral;
    }
    let openInterest = new BigNumber(0);
    let avgEntryPrice = entryPrice;
    if (!accountBalance.size.eq(0)) {
      /* eslint-disable no-nested-ternary */
      openInterest = accountBalance.size.isPositive()
        ? accountBalance.debt.isPositive()
          ? positionMargin.minus(
              accountBalance.debt.abs().times(BIGNUMBER_BASE)
            )
          : positionMargin
              .abs()
              .plus(accountBalance.debt.abs().times(BIGNUMBER_BASE))
        : accountBalance.debt.abs().times(BIGNUMBER_BASE).minus(positionMargin);

      avgEntryPrice = openInterest
        .times(BIGNUMBER_BASE)
        .div(accountBalance.size.abs());
    }
    if (leverage.eq(0)) {
      leverage = accountBalance.size.times(avgEntryPrice).div(positionMargin);
    }
    openInterest = openInterest.div(BIGNUMBER_BASE);

    let collateralFreed = new BigNumber(0);
    if (
      !(accountBalance.size.eq(0) || accountBalance.size.isPositive() === isBuy)
    ) {
      if (tradeSize.lte(accountBalance.size.abs())) {
        collateralFreed = positionMargin
          .times(tradeSize)
          .div(accountBalance.size.abs())
          .abs()
          .negated();
      } else {
        collateralFreed = tradeSize
          .minus(accountBalance.size.abs())
          .times(entryPrice)
          .div(leverage)
          .minus(positionMargin);
      }

      const bookedPNL = avgEntryPrice.minus(entryPrice);
      const pnl = bookedPNL
        .abs()
        .times(
          tradeSize.lte(accountBalance.size.abs())
            ? tradeSize
            : accountBalance.size.abs()
        )
        .div(BIGNUMBER_BASE);

      const pnlIsPositive =
        bookedPNL.isPositive() !== accountBalance.size.isPositive();
      if (!pnlIsPositive) {
        collateralFreed = collateralFreed.plus(pnl);
      }
      let flags = 0;
      flags |= collateralFreed.isPositive() ? 1 : 0;
      flags |= pnlIsPositive ? 2 : 0;
      return {
        flags,
        collateral: collateralFreed.abs(),
        pnl: pnl.abs(),
        fee: new BigNumber(0),
        openInterest,
      } as FreedCollateral;
    }
    return {
      flags: 0,
      collateral: new BigNumber(0),
      pnl: new BigNumber(0),
      fee: new BigNumber(0),
      openInterest,
    } as FreedCollateral;
  }

  public static reduceMarginFromBank(
    freedCollateral: FreedCollateral
  ): [collateralToUse: BigNumber, freedCollateral: FreedCollateral] {
    const freedCollat = { ...freedCollateral };
    const { flags, collateral, pnl } = freedCollat;
    let collateralToUse = new BigNumber(0);
    if (flags & 1) {
      collateralToUse = collateral.div(BIGNUMBER_BASE);
      if (flags & 2) {
        if (collateral.gte(pnl)) {
          collateralToUse = collateral.minus(pnl).div(BIGNUMBER_BASE);
        } else {
          freedCollat.pnl = pnl.minus(collateral);
          freedCollat.flags |= 8;
          collateralToUse = new BigNumber(0);
        }
      }
    }
    return [collateralToUse, freedCollat];
  }

  public static getUpdatedBalanceAndPositionMargin(
    accountBalance: Balance,
    positionMargin: BigNumber,
    walletBalance: BigNumber,
    freedCollateral: FreedCollateral
  ): [Balance, BigNumber, BigNumber] {
    let { collateral, fee } = freedCollateral;
    const { flags, pnl } = freedCollateral;

    const newBalance = accountBalance.copy();
    const freedCollateralValue = collateral.div(BIGNUMBER_BASE);

    // PNL calculation
    if (flags & 2) {
      newBalance.debt = newBalance.debt.minus(pnl.div(BIGNUMBER_BASE));
      if (collateral.eq(0) || (flags & 1) === 0 || flags & 8) {
        if (pnl.gte(fee)) {
          walletBalance = walletBalance.plus(
            pnl.minus(fee).div(BIGNUMBER_BASE)
          );
          fee = new BigNumber(0);
        } else {
          fee = fee.minus(pnl);
        }
      }
    } else {
      positionMargin = positionMargin.minus(pnl);
    }

    // Collateral calculation
    if (flags & 1) {
      if (collateral.gte(fee)) {
        collateral = collateral.minus(fee);
        if ((flags & 8) === 0) {
          newBalance.debt = newBalance.debt.plus(freedCollateralValue);
        }
        positionMargin = positionMargin.plus(collateral);
        fee = new BigNumber(0);
      } else {
        fee = fee.minus(collateral);
        positionMargin = positionMargin.minus(fee);
        newBalance.debt = newBalance.debt.minus(fee.div(BIGNUMBER_BASE));
      }
    } else if (collateral.gte(fee)) {
      positionMargin = positionMargin.minus(collateral);
      newBalance.debt = newBalance.debt.minus(freedCollateralValue);
      walletBalance = walletBalance.plus(
        collateral.minus(fee).div(BIGNUMBER_BASE)
      );
      fee = new BigNumber(0);
    } else {
      positionMargin = positionMargin.minus(fee);
      fee = fee.minus(collateral);
      newBalance.debt = newBalance.debt.minus(
        collateral.plus(fee).div(BIGNUMBER_BASE)
      );
    }
    return [newBalance, positionMargin, walletBalance];
  }

  /**
   * Calculate the effect of filling an order on the maker's balances.
   */
  public static getBalanceUpdatesAfterFillingOrder(
    fillAmount: BigNumberable,
    fillPrice: Price,
    fillFee: Fee,
    isBuy: boolean
  ): {
    debtDelta: BigNumber;
    sizeDelta: BigNumber;
  } {
    const sizeAmount = new BigNumber(fillAmount).dp(0, BigNumber.ROUND_DOWN);
    const fee = fillFee
      .times(fillPrice.value)
      .value.dp(18, BigNumber.ROUND_DOWN);
    const debtPerPosition = isBuy ? fillPrice.plus(fee) : fillPrice.minus(fee);
    const debtAmount = sizeAmount
      .times(debtPerPosition.value)
      .dp(0, BigNumber.ROUND_DOWN);
    return {
      debtDelta: isBuy ? debtAmount.negated() : debtAmount,
      sizeDelta: isBuy ? sizeAmount : sizeAmount.negated(),
    };
  }

  public static getFeeForOrder(
    amount: BigNumber,
    isTaker: boolean = true
  ): Fee {
    if (!isTaker) {
      return Fee.fromBips("-2.5");
    }

    // PBTC-USDC: Small order size is 0.5 BTC.
    //
    // TODO: Address fees more generally on a per-market basis.
    const isSmall = amount.lt("0.5e8");
    return isSmall ? Fee.fromBips("50.0") : Fee.fromBips("15");
  }

  // ============ Signing Methods ============

  public async getSignedOrder(
    order: Order,
    signingMethod: SigningMethod
  ): Promise<SignedOrder> {
    const typedSignature = await this.signOrder(order, signingMethod);
    return {
      ...order,
      typedSignature,
    };
  }

  /**
   * Sends order to current provider for signing. Can sign locally if the signing account is
   * loaded into web3 and SigningMethod.Hash is used.
   */
  public async signOrder(
    order: Order,
    signingMethod: SigningMethod
  ): Promise<string> {
    switch (signingMethod) {
      case SigningMethod.Hash:
      case SigningMethod.UnsafeHash:
      case SigningMethod.Compatibility:
        const orderHash = this.getOrderHash(order);
        const rawSignature = await this.web3.eth.sign(orderHash, order.maker);
        const hashSig = createTypedSignature(
          rawSignature,
          SIGNATURE_TYPES.DECIMAL
        );
        if (signingMethod === SigningMethod.Hash) {
          return hashSig;
        }
        const unsafeHashSig = createTypedSignature(
          rawSignature,
          SIGNATURE_TYPES.NO_PREPEND
        );
        if (signingMethod === SigningMethod.UnsafeHash) {
          return unsafeHashSig;
        }
        if (hashHasValidSignature(orderHash, unsafeHashSig, order.maker)) {
          return unsafeHashSig;
        }
        return hashSig;

      case SigningMethod.TypedData:
      case SigningMethod.MetaMask:
      case SigningMethod.MetaMaskLatest:
      case SigningMethod.CoinbaseWallet:
        return this.ethSignTypedOrderInternal(order, signingMethod);

      default:
        throw new Error(`Invalid signing method ${signingMethod}`);
    }
  }

  /**
   * Sends order to current provider for signing of a cancel message. Can sign locally if the
   * signing account is loaded into web3 and SigningMethod.Hash is used.
   */
  public async signCancelOrder(
    order: Order,
    signingMethod: SigningMethod
  ): Promise<string> {
    return this.signCancelOrderByHash(
      this.getOrderHash(order),
      order.maker,
      signingMethod
    );
  }

  /**
   * Sends order to current provider for signing of a cancel message. Can sign locally if the
   * signing account is loaded into web3 and SigningMethod.Hash is used.
   */
  public async signCancelOrders(
    orders: Order[],
    signingMethod: SigningMethod
  ): Promise<string> {
    return this.signCancelOrdersByHash(
      orders.map((order) => this.getOrderHash(order)),
      orders[0].maker,
      signingMethod
    );
  }

  /**
   * Sends orderHash to current provider for signing of a cancel message. Can sign locally if
   * the signing account is loaded into web3 and SigningMethod.Hash is used.
   */
  public async signCancelOrderByHash(
    orderHash: string,
    signer: string,
    signingMethod: SigningMethod
  ): Promise<string> {
    switch (signingMethod) {
      case SigningMethod.Hash:
      case SigningMethod.UnsafeHash:
      case SigningMethod.Compatibility:
        const cancelHash = this.orderHashToCancelOrderHash(orderHash);
        const rawSignature = await this.web3.eth.sign(cancelHash, signer);
        const hashSig = createTypedSignature(
          rawSignature,
          SIGNATURE_TYPES.DECIMAL
        );
        if (signingMethod === SigningMethod.Hash) {
          return hashSig;
        }
        const unsafeHashSig = createTypedSignature(
          rawSignature,
          SIGNATURE_TYPES.NO_PREPEND
        );
        if (signingMethod === SigningMethod.UnsafeHash) {
          return unsafeHashSig;
        }
        if (hashHasValidSignature(cancelHash, unsafeHashSig, signer)) {
          return unsafeHashSig;
        }
        return hashSig;

      case SigningMethod.TypedData:
      case SigningMethod.MetaMask:
      case SigningMethod.MetaMaskLatest:
      case SigningMethod.CoinbaseWallet:
        return this.ethSignTypedCancelOrderInternal(
          orderHash,
          signer,
          signingMethod
        );

      default:
        throw new Error(`Invalid signing method ${signingMethod}`);
    }
  }

  /**
   * Sends orderHashes to current provider for signing of a cancel message. Can sign locally if
   * the signing accou nt is loaded into web3 and SigningMethod.Hash is used.
   */
  public async signCancelOrdersByHash(
    orderHashes: string[],
    signer: string,
    signingMethod: SigningMethod
  ): Promise<string> {
    switch (signingMethod) {
      case SigningMethod.Hash:
      case SigningMethod.UnsafeHash:
      case SigningMethod.Compatibility:
        const cancelHash = this.orderHashToCancelOrdersHash(orderHashes);
        const rawSignature = await this.web3.eth.sign(cancelHash, signer);
        const hashSig = createTypedSignature(
          rawSignature,
          SIGNATURE_TYPES.DECIMAL
        );
        if (signingMethod === SigningMethod.Hash) {
          return hashSig;
        }
        const unsafeHashSig = createTypedSignature(
          rawSignature,
          SIGNATURE_TYPES.NO_PREPEND
        );
        if (signingMethod === SigningMethod.UnsafeHash) {
          return unsafeHashSig;
        }
        if (hashHasValidSignature(cancelHash, unsafeHashSig, signer)) {
          return unsafeHashSig;
        }
        return hashSig;

      case SigningMethod.TypedData:
      case SigningMethod.MetaMask:
      case SigningMethod.MetaMaskLatest:
      case SigningMethod.CoinbaseWallet:
        return this.ethSignTypedCancelOrdersInternal(
          orderHashes,
          signer,
          signingMethod
        );

      default:
        throw new Error(`Invalid signing method ${signingMethod}`);
    }
  }

  // ============ Signature Verification ============

  /**
   * Returns true if the order object has a non-null valid signature from the maker of the order.
   */
  public orderHasValidSignature(order: SignedOrder): boolean {
    return hashHasValidSignature(
      this.getOrderHash(order),
      order.typedSignature,
      order.maker
    );
  }

  /**
   * Returns true if the solidity order object has a non-null valid signature from the maker of the order.
   */
  public solidityOrderHasValidSignature(order: SignedSolidityOrder): boolean {
    return hashHasValidSignature(
      this.getSolidityOrderHash(order),
      order.typedSignature,
      order.maker
    );
  }

  /**
   * Returns true if the raw order object has a non-null valid signature from the maker of the order.
   */
  public static rawOrderHasValidSignature(
    order: RawOrder,
    domainHash: string
  ): boolean {
    return hashHasValidSignature(
      OrderSigner.getRawOrderHash(order, domainHash),
      order.typedSignature,
      order.maker
    );
  }

  /**
   * Returns true if the order hash has a non-null valid signature from a particular signer.
   */
  public static orderByHashHasValidSignature(
    orderHash: string,
    typedSignature: string,
    expectedSigner: address
  ): boolean {
    const signer = ecRecoverTypedSignature(orderHash, typedSignature);
    return addressesAreEqual(signer, expectedSigner);
  }

  /**
   * Returns true if the cancel order message has a valid signature.
   */
  public cancelOrderHasValidSignature(
    order: Order,
    typedSignature: string
  ): boolean {
    return this.cancelOrderByHashHasValidSignature(
      this.getOrderHash(order),
      typedSignature,
      order.maker
    );
  }

  /**
   * Returns true if the cancel orders message has a valid signature.
   */
  public cancelOrdersHasValidSignature(
    orders: Order[],
    typedSignature: string
  ): boolean {
    return this.cancelOrdersByHashHasValidSignature(
      orders.map((order) => this.getOrderHash(order)),
      typedSignature,
      orders[0].maker
    );
  }

  /**
   * Returns true if the cancel order message has a valid signature.
   */
  public cancelOrderByHashHasValidSignature(
    orderHash: string,
    typedSignature: string,
    expectedSigner: address
  ): boolean {
    const cancelHash = this.orderHashToCancelOrderHash(orderHash);
    const signer = ecRecoverTypedSignature(cancelHash, typedSignature);
    return addressesAreEqual(signer, expectedSigner);
  }

  /**
   * Returns true if the cancel orders message has a valid signature.
   */
  public cancelOrdersByHashHasValidSignature(
    orderHashes: string[],
    typedSignature: string,
    expectedSigner: address
  ): boolean {
    const cancelHash = this.orderHashToCancelOrdersHash(orderHashes);
    const signer = ecRecoverTypedSignature(cancelHash, typedSignature);
    return addressesAreEqual(signer, expectedSigner);
  }

  // ============ Hashing Functions ============

  /**
   * Returns the final signable EIP712 hash for approving an order.
   */
  public getOrderHash(order: Order): string {
    const structHash = Web3.utils.soliditySha3(
      { t: "bytes32", v: hashString(EIP712_ORDER_STRUCT_STRING) || "" },
      { t: "bytes32", v: OrderSigner.getOrderFlags(order) },
      { t: "uint256", v: order.amount.toFixed(0) },
      { t: "uint256", v: order.limitPrice.toSolidity() },
      { t: "uint256", v: order.triggerPrice.toSolidity() },
      { t: "uint256", v: order.limitFee.toSolidity() },
      { t: "uint256", v: order.leverage.toFixed(0) },
      { t: "bytes32", v: addressToBytes32(order.maker) },
      { t: "bytes32", v: addressToBytes32(order.taker) },
      { t: "uint256", v: order.expiration.toFixed(0) }
    );
    return structHash ? getEIP712Hash(this.getDomainHash(), structHash) : "";
  }

  /**
   * Returns the final signable EIP712 hash for approving an order.
   */
  public getSolidityOrderHash(order: SolidityOrder): string {
    const structHash = Web3.utils.soliditySha3(
      { t: "bytes32", v: hashString(EIP712_ORDER_STRUCT_STRING) || "" },
      { t: "bytes32", v: OrderSigner.getOrderFlags(order) },
      { t: "uint256", v: order.amount.toFixed(0) },
      { t: "uint256", v: order.limitPrice.toFixed(0) },
      { t: "uint256", v: order.triggerPrice.toFixed(0) },
      { t: "uint256", v: order.limitFee.toFixed(0) },
      { t: "uint256", v: order.leverage.toFixed(0) },
      { t: "bytes32", v: addressToBytes32(order.maker) },
      { t: "bytes32", v: addressToBytes32(order.taker) },
      { t: "uint256", v: order.expiration.toFixed(0) }
    );
    return structHash ? getEIP712Hash(this.getDomainHash(), structHash) : "";
  }

  /**
   * Returns the final signable EIP712 hash for approving an order.
   */
  public static getRawOrderHash(order: RawOrder, domainHash: string): string {
    const structHash = Web3.utils.soliditySha3(
      { t: "bytes32", v: hashString(EIP712_ORDER_STRUCT_STRING) || "" },
      { t: "bytes32", v: OrderSigner.getOrderFlags(order) },
      { t: "uint256", v: order.amount },
      { t: "uint256", v: order.limitPrice },
      { t: "uint256", v: order.triggerPrice },
      { t: "uint256", v: order.limitFee },
      { t: "uint256", v: order.leverage },
      { t: "bytes32", v: addressToBytes32(order.maker) },
      { t: "bytes32", v: addressToBytes32(order.taker) },
      { t: "uint256", v: order.expiration }
    );
    return structHash ? getEIP712Hash(domainHash, structHash) : "";
  }

  /**
   * Given some order hash, returns the hash of a cancel-order message.
   */
  public orderHashToCancelOrderHash(orderHash: string): string {
    const structHash = Web3.utils.soliditySha3(
      { t: "bytes32", v: hashString(EIP712_CANCEL_ORDER_STRUCT_STRING) || "" },
      { t: "bytes32", v: hashString("Cancel Orders") || "" },
      {
        t: "bytes32",
        v: Web3.utils.soliditySha3({ t: "bytes32", v: orderHash }) || "",
      }
    );
    return structHash ? getEIP712Hash(this.getDomainHash(), structHash) : "";
  }

  /**
   * Given order hash array, returns the hash of a cancel-orders message.
   */
  public orderHashToCancelOrdersHash(orderHash: string[]): string {
    Web3.utils.soliditySha3();

    const structHash = Web3.utils.soliditySha3(
      { t: "bytes32", v: hashString(EIP712_CANCEL_ORDER_STRUCT_STRING) || "" },
      { t: "bytes32", v: hashString("Cancel Orders") || "" },
      {
        t: "bytes32",
        v:
          Web3.utils.soliditySha3(
            ...orderHash.map((hash) => ({ t: "bytes32", v: hash }))
          ) || "",
      }
    );
    return structHash ? getEIP712Hash(this.getDomainHash(), structHash) : "";
  }

  /**
   * Returns the EIP712 domain separator hash.
   */
  public getDomainHash(): string {
    return (
      Web3.utils.soliditySha3(
        { t: "bytes32", v: hashString(EIP712_DOMAIN_STRING) || "" },
        { t: "bytes32", v: hashString(this.eip712DomainName) || "" },
        { t: "bytes32", v: hashString(EIP712_DOMAIN_VERSION) || "" },
        { t: "uint256", v: `${this.networkId}` },
        { t: "bytes32", v: addressToBytes32(this.address) }
      ) || ""
    );
  }

  // ============ To-Bytes Functions ============

  public orderToBytes(order: Order): string {
    const solidityOrder = OrderSigner.orderToSolidity(order);
    return this.web3.eth.abi.encodeParameters(
      EIP712_ORDER_STRUCT.map((arg) => arg.type),
      EIP712_ORDER_STRUCT.map((arg) => solidityOrder[arg.name])
    );
  }

  public fillToTradeData(
    orderA: SignedOrder,
    orderB: SignedOrder,
    amount: BigNumber,
    price: Price,
    fee: Fee
  ): string {
    const orderAData = this.orderToBytes(orderA);
    const orderBData = this.orderToBytes(orderB);
    const signatureDataA = orderA.typedSignature + "0".repeat(60);
    const signatureDataB = orderB.typedSignature + "0".repeat(60);
    const fillData = this.web3.eth.abi.encodeParameters(
      ["uint256", "uint256", "uint256", "bool"],
      [
        amount.toFixed(0),
        price.toSolidity(),
        fee.toSolidity(),
        fee.isNegative(),
      ]
    );
    return combineHexStrings(
      orderAData,
      orderBData,
      fillData,
      signatureDataA,
      signatureDataB
    );
  }

  public fillSolidityOrderToTradeData(
    orderA: SignedSolidityOrder,
    orderB: SignedSolidityOrder,
    amount: BigNumber,
    price: BigNumber,
    fee: BigNumber
  ): string {
    const orderAData = this.toSolidityByteOrder(orderA);
    const orderBData = this.toSolidityByteOrder(orderB);
    const signatureDataA = orderA.typedSignature + "0".repeat(60);
    const signatureDataB = orderB.typedSignature + "0".repeat(60);
    const fillData = this.web3.eth.abi.encodeParameters(
      ["uint256", "uint256", "uint256", "bool"],
      [amount.toFixed(0), price, fee.abs().toFixed(0), fee.isNegative()]
    );
    return combineHexStrings(
      orderAData,
      orderBData,
      fillData,
      signatureDataA,
      signatureDataB
    );
  }

  public fillSolidityByteOrderToTradeData(
    orderA: string,
    orderB: string,
    orderASignature: string,
    orderBSignature: string,
    amount: BigNumber,
    price: BigNumber,
    fee: BigNumber
  ): string {
    const signatureDataA = `${orderASignature}${ZERO_REPEAT_60}`;
    const signatureDataB = `${orderBSignature}${ZERO_REPEAT_60}`;
    const fillData = this.web3.eth.abi.encodeParameters(
      ["uint256", "uint256", "uint256", "bool"],
      [amount.toFixed(0), price, fee.abs().toFixed(0), fee.isNegative()]
    );
    return combineHexStrings(
      orderA,
      orderB,
      fillData,
      signatureDataA,
      signatureDataB
    );
  }

  public tradeDataReverse(data: string): {
    orderA: SignedOrder;
    orderB: SignedOrder;
    amount: BigNumber;
    price: Price;
    fee: Fee;
  } {
    const orderParams = EIP712_ORDER_STRUCT.map((arg) => arg.type);
    const res = this.web3.eth.abi.decodeParameters(
      [
        ...orderParams,
        ...orderParams,
        "uint256",
        "uint256",
        "uint256",
        "bool",
        "bytes32",
        "bytes32",
      ],
      data
    );
    const orderAFlags = OrderSigner.parseFlags(res[0]);
    const orderBFlags = OrderSigner.parseFlags(res[9]);
    const orderAsalt = res[0].slice(0, -1);
    const orderBsalt = res[9].slice(0, -1);
    return {
      orderA: {
        isBuy: orderAFlags.isBuy,
        isDecreaseOnly: orderAFlags.isDecreaseOnly,
        amount: new BigNumber(res[1]),
        limitPrice: new Price(new BigNumber(res[2]).times(1e-18)),
        triggerPrice: new Price(new BigNumber(res[3]).times(1e-18)),
        limitFee: new Fee(
          new BigNumber(res[4])
            .times(1e-18)
            .times(orderAFlags.isNegativeLimitFee ? -1 : 1)
        ),
        leverage: new BigNumber(res[5]),

        maker: res[6],
        taker: res[7],
        expiration: new BigNumber(res[8]),
        salt: new BigNumber(orderAsalt),
        typedSignature: res[22],
      },
      orderB: {
        isBuy: orderBFlags.isBuy,
        isDecreaseOnly: orderBFlags.isDecreaseOnly,
        amount: new BigNumber(res[10]),
        limitPrice: new Price(new BigNumber(res[11]).times(1e-18)),
        triggerPrice: new Price(new BigNumber(res[12]).times(1e-18)),
        limitFee: new Fee(
          new BigNumber(res[13])
            .times(1e-18)
            .times(orderAFlags.isNegativeLimitFee ? -1 : 1)
        ),
        leverage: new BigNumber(res[14]),
        maker: res[15],
        taker: res[16],
        expiration: new BigNumber(res[17]),
        salt: new BigNumber(orderBsalt),
        typedSignature: res[23],
      },
      amount: new BigNumber(res[18]),
      price: new Price(new BigNumber(res[19]).times(1e-18)),
      fee: new Fee(new BigNumber(res[20]).times(1e-18).times(res[21] ? -1 : 1)),
    };
  }

  public static parseFlags(flagsBytes: string) {
    const orderAFlags = new BigNumber(flagsBytes, 16).mod(8).toNumber();
    return {
      isBuy: (orderAFlags & 1) !== 0,
      isDecreaseOnly: (orderAFlags & 2) !== 0,
      isNegativeLimitFee: (orderAFlags & 4) !== 0,
    };
  }

  public toSolidityByteOrder(order: SignedSolidityOrder): any {
    return this.web3.eth.abi.encodeParameters(EIP712_ORDER_SIGNATURE_TYPE_ARR, [
      OrderSigner.getOrderFlags(order),
      order.amount.toFixed(0),
      order.limitPrice.toFixed(0),
      order.triggerPrice.toFixed(0),
      order.limitFee.toFixed(0),
      order.leverage.toFixed(0),
      order.maker,
      order.taker,
      order.expiration.toFixed(0),
    ]);
  }

  public rawOrdertoSolidityByteOrder(order: RawOrder): any {
    return this.web3.eth.abi.encodeParameters(EIP712_ORDER_SIGNATURE_TYPE_ARR, [
      OrderSigner.getOrderFlags(order),
      order.amount,
      order.limitPrice,
      order.triggerPrice,
      order.limitFee,
      order.leverage,
      order.maker,
      order.taker,
      order.expiration,
    ]);
  }

  // ============ Private Helper Functions ============

  public static orderToSolidity(order: Order): any {
    return {
      flags: OrderSigner.getOrderFlags(order),
      amount: order.amount.toFixed(0),
      limitPrice: order.limitPrice.toSolidity(),
      triggerPrice: order.triggerPrice.toSolidity(),
      limitFee: order.limitFee.toSolidity(),
      leverage: order.leverage.toFixed(0),
      maker: order.maker,
      taker: order.taker,
      expiration: order.expiration.toFixed(0),
    };
  }

  private getDomainData() {
    return {
      name: this.eip712DomainName,
      version: EIP712_DOMAIN_VERSION,
      chainId: this.networkId,
      verifyingContract: this.address,
    };
  }

  private async ethSignTypedOrderInternal(
    order: Order,
    signingMethod: SigningMethod
  ): Promise<TypedSignature> {
    const orderData = OrderSigner.orderToSolidity(order);
    const data = {
      types: {
        EIP712Domain: EIP712_DOMAIN_STRUCT,
        Order: EIP712_ORDER_STRUCT,
      },
      domain: this.getDomainData(),
      primaryType: "Order",
      message: orderData,
    };
    return ethSignTypedDataInternal(
      this.web3.currentProvider,
      order.maker,
      data,
      signingMethod
    );
  }

  private async ethSignTypedCancelOrderInternal(
    orderHash: string,
    signer: string,
    signingMethod: SigningMethod
  ): Promise<TypedSignature> {
    const data = {
      types: {
        EIP712Domain: EIP712_DOMAIN_STRUCT,
        CancelLimitOrder: EIP712_CANCEL_ORDER_STRUCT,
      },
      domain: this.getDomainData(),
      primaryType: "CancelLimitOrder",
      message: {
        action: "Cancel Orders",
        orderHashes: [orderHash],
      },
    };
    return ethSignTypedDataInternal(
      this.web3.currentProvider,
      signer,
      data,
      signingMethod
    );
  }

  private async ethSignTypedCancelOrdersInternal(
    orderHashes: string[],
    signer: string,
    signingMethod: SigningMethod
  ): Promise<TypedSignature> {
    const data = {
      types: {
        EIP712Domain: EIP712_DOMAIN_STRUCT,
        CancelLimitOrder: EIP712_CANCEL_ORDER_STRUCT,
      },
      domain: this.getDomainData(),
      primaryType: "CancelLimitOrder",
      message: {
        action: "Cancel Orders",
        orderHashes,
      },
    };
    return ethSignTypedDataInternal(
      this.web3.currentProvider,
      signer,
      data,
      signingMethod
    );
  }

  public static getOrderFlags(order: Order | SolidityOrder | RawOrder): string {
    const booleanFlag =
      0 +
      (new BigNumber(order.limitFee.toString()).isNegative()
        ? ORDER_FLAGS.IS_NEGATIVE_LIMIT_FEE
        : 0) +
      (order.isDecreaseOnly ? ORDER_FLAGS.IS_DECREASE_ONLY : 0) +
      (order.isBuy ? ORDER_FLAGS.IS_BUY : 0);
    const saltBytes = bnToBytes32(order.salt);
    return `0x${saltBytes.slice(-63)}${booleanFlag}`;
  }
}
