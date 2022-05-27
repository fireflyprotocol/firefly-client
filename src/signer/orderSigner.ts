import BigNumber from "bignumber.js";
import Web3 from "web3";

import {
  addressToBytes32,
  bnToBytes32,
  hashString,
  addressesAreEqual,
} from "../helpers/bytes";

import {
  createTypedSignature,
  ecRecoverTypedSignature,
  ethSignTypedDataInternal,
  hashHasValidSignature,
  getEIP712Hash,
} from "../helpers/signature";

import {
  SigningMethod,
  TypedSignature,
  address,
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
