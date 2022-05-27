import Web3 from "web3";
import axios from "axios";
import { Contract, Wallet, providers } from "ethers";
import * as contracts from "../contracts/deployedContracts.json";
import * as TestToken from "../contracts/Test_Token.json";
import { MarginBank__factory, MarginBank } from "../contracts/orderbook";
import {
  toBigNumberStr,
  bnToString,
  bigNumber,
  toBigNumber,
} from "./helpers/utils";

import {
  ORDER_SIDE,
  ORDER_TYPE,
  TIME_IN_FORCE,
  SigningMethod,
  MarketSymbol,
  address,
} from "./types";
import { Price, Fee } from "./signer/baseValue";

import { Network } from "./interfaces/on-chain";

import { SignedOrder, Order } from "./interfaces/order";

import { OrderSigner } from "./signer/orderSigner";

import {
  GetOrderResponse,
  GetOrderRequest,
  OrderSignatureRequest,
  OrderSignatureResponse,
  PlaceOrderRequest,
  PlaceCancelOrderResponse,
  GetPositionRequest,
  GetPositionResponse,
  OrderCancelSignatureRequest,
  OrderCancellationRequest,
  GetOrderbookRequest,
} from "./interfaces/routes";

export class FireflyClient {
  protected readonly network: Network;

  private web3: Web3;

  private wallet: Wallet;

  private orderSigners: Map<MarketSymbol, OrderSigner> = new Map();

  /**
   *
   * @param _network containing network rpc url and chain id
   * @param _acctPvtKey private key for the account to be used for placing orders
   */
  constructor(_network: Network, _acctPvtKey: string) {
    this.network = _network;
    this.web3 = new Web3(_network.url);
    this.web3.eth.accounts.wallet.add(_acctPvtKey);
    this.wallet = new Wallet(
      _acctPvtKey,
      new providers.JsonRpcProvider(_network.url)
    );
  }

  /**
   *
   * @param market Symbol of MARKET BTC-USDT
   * @param ordersContractAddress (Optional) address of orders contract address for market
   * @returns boolean true if market is added else false
   */
  addMarket(market: MarketSymbol, ordersContract?: address): boolean {
    // if orders contract address is not provided read
    // from deployed contracts addresses if possible
    if (!ordersContract) {
      try {
        ordersContract = (contracts as any)[this.network.chainId][market].Orders
          .address;
      } catch (e) {
        // orders contract address for given network and market name was not found
      }
    }

    // if orders contract address is empty or undefined return false
    if (ordersContract === "" || ordersContract === undefined) {
      return false;
    }

    // if signer for market already exists return false
    if (this.orderSigners.get(market)) {
      return false;
    }
    // else create order signer for market
    this.orderSigners.set(
      market,
      new OrderSigner(this.web3, Number(this.network.chainId), ordersContract)
    );
    return true;
  }

  /**
   * Removes the provided symbol market order signer
   * @param market symbol of the market to be removed
   * @returns boolean  true if market is removed false other wise
   */
  removeMarket(market: MarketSymbol): boolean {
    return this.orderSigners.delete(market);
  }

  /**
   * Returns the USDC balance of user in USDC contract
   * @param contract (optional) address of USDC contract
   * @returns Number representing balance of user
   */
  async getUSDCBalance(contract?: address): Promise<string> {
    const tokenContract = this._getContract("Test_Token", contract);

    if (tokenContract === false) {
      return "-1";
    }

    const balance = await (tokenContract as Contract)
      .connect(this.wallet)
      .balanceOf(this.wallet.address);

    return bnToString(+balance);
  }

  /**
   * Returns the USDC Balance(Free Collateral) of the account in Margin Bank contract
   * @param contract (optional) address of Margin Bank contract
   * @returns Number representing balance of user
   */
  async getMarginBankBalance(contract?: address): Promise<string> {
    const marginBankContract = this._getContract("MarginBank", contract);

    if (marginBankContract === false) {
      return "-1";
    }

    const balance = await (marginBankContract as MarginBank)
      .connect(this.wallet)
      .getAccountBankBalance(this.wallet.address);

    return balance.toString();
  }

  /**
   * Faucet function, mints 10K USDC to wallet - Only works on Testnet
   * Assumes that the user wallet has Boba/Moonbase Tokens on Testnet
   * @param contract (optional) address of USDC contract
   * @returns Boolean true if user is funded, false otherwise
   */
  async getTestUSDC(contract?: address): Promise<boolean> {
    const tokenContract = this._getContract("Test_Token", contract);

    if (tokenContract === false) {
      return false;
    }

    try {
      // mint 10K USDC token
      await (
        await (tokenContract as Contract)
          .connect(this.wallet)
          .mint(this.wallet.address, toBigNumberStr(10000))
      ).wait();
    } catch (e) {
      return false;
    }

    return true;
  }

  /**
   * Transfers USDC to margin bank to be used for placing orders and opening
   * positions on Firefly Exchange
   * @param amount the number of USDC to be transferred
   * @param usdcContract (optional) address of USDC contract
   * @param mbContract (address) address of Margin Bank contract
   * @returns boolean true if funds are transferred, false otherwise
   */
  async depositToMarginBank(
    amount: number,
    usdcContract?: address,
    mbContract?: address
  ): Promise<boolean> {
    const tokenContract = this._getContract("Test_Token", usdcContract);
    const marginBankContract = this._getContract("MarginBank", mbContract);

    if (tokenContract === false || marginBankContract === false) {
      return false;
    }

    const amountString = toBigNumberStr(amount);

    try {
      // approve usdc contract to allow margin bank to take funds out for user's behalf
      await (
        await (tokenContract as Contract)
          .connect(this.wallet)
          .approve((marginBankContract as MarginBank).address, amountString, {})
      ).wait();

      // deposit `amount` usdc to margin bank
      await (
        await (marginBankContract as MarginBank)
          .connect(this.wallet)
          .depositToBank(this.wallet.address, amountString, {})
      ).wait();

      return true;
    } catch (e) {
      console.log(e);
      return false;
    }
  }

  /**
   * Transfers USDC from MarginBank, back to USDC contract
   * @param amount (optional) if not provided, transfers all available USDC tokens
   * from Margin Bank to USDC contract
   * @param usdcContract (optional) address of USDC contract
   * @param mbContract (address) address of Margin Bank contract
   * @returns boolean true if funds are transferred, false otherwise
   */
  async withdrawFromMarginBank(
    amount?: number,
    usdcContract?: address,
    mbContract?: address
  ): Promise<boolean> {
    const tokenContract = this._getContract("Test_Token", usdcContract);
    const marginBankContract = this._getContract("MarginBank", mbContract);

    if (tokenContract === false || marginBankContract === false) {
      return false;
    }

    const amountString = amount
      ? toBigNumberStr(amount)
      : await this.getMarginBankBalance(
          (marginBankContract as MarginBank).address
        );

    try {
      // transfer amount back to USDC contract
      await (
        await (marginBankContract as MarginBank)
          .connect(this.wallet)
          .withdrawFromBank(
            this.wallet.address,
            this.wallet.address,
            amountString
          )
      ).wait();

      return true;
    } catch (e) {
      console.log(e);
      return false;
    }
  }

  /**
   * Gets Orders placed by the user. Returns the first 50 orders by default.
   * @param params of type OrderRequest,
   * @returns OrderResponse array
   */
  async getOrders(params: GetOrderRequest): Promise<GetOrderResponse[]> {
    const url = this._createAPIURL("/orders", {
      ...params,
      userAddress: this.getPublicAddress(),
    });

    const response = await axios.get(url);

    // TODO: OrderResponse can be undefined if the status returned by DAPI is not 200
    return response.data;
  }

  /**
   * Creates order signature and returns it. The signed order can be placed on exchange
   * @param params OrderSignatureRequest params needed to be signed
   * @returns OrderSignatureResponse with the payload signed on-chain along with order signature
   */
  async createSignedOrder(
    params: OrderSignatureRequest
  ): Promise<OrderSignatureResponse> {
    const expiration = new Date();
    expiration.setMonth(expiration.getMonth() + 1);

    const order: Order = {
      limitPrice: new Price(bigNumber(params.price)),
      isBuy: params.side === ORDER_SIDE.BUY,
      amount: toBigNumber(params.quantity),
      leverage: toBigNumber(params.leverage || 1),
      maker: this.getPublicAddress().toLocaleLowerCase(),
      isDecreaseOnly: params.reduceOnly || false,
      triggerPrice: new Price(0),
      limitFee: new Fee(0),
      taker: "0x0000000000000000000000000000000000000000",
      expiration: bigNumber(
        params.expiration || Math.floor(expiration.getTime() / 1000)
      ),
      salt: bigNumber(params.salt || Math.floor(Math.random() * 1_000_000)),
    };

    const signer = this.orderSigners.get(params.symbol);
    if (!signer) {
      throw Error(
        `Provided Market Symbol(${params.symbol}) is not added to client library`
      );
    }

    const orderSignature = await (signer as OrderSigner).signOrder(
      order,
      SigningMethod.Hash
    );

    const signedOrder: SignedOrder = {
      ...order,
      typedSignature: orderSignature,
    };

    return {
      symbol: params.symbol,
      price: params.price,
      quantity: params.quantity,
      side: params.side,
      leverage: params.leverage || 1,
      reduceOnly: order.isDecreaseOnly,
      salt: order.salt.toNumber(),
      expiration: order.expiration.toNumber(),
      orderSignatrue: signedOrder.typedSignature,
    };
  }

  /**
   * Places a signed order on firefly exchange
   * @param params PlaceOrderRequest containing the signed order created using createSignedOrder
   * @returns PlaceCancelOrderResponse containing status and data. If status is not 201, order placement failed.
   */
  async placeOrder(
    params: PlaceOrderRequest
  ): Promise<PlaceCancelOrderResponse> {
    const response = await axios.post(
      `${this.network.apiGateway}/orders`,
      {
        symbol: params.symbol,
        userAddress: this.getPublicAddress().toLocaleLowerCase(),
        orderType: params.price === 0 ? ORDER_TYPE.MARKET : ORDER_TYPE.LIMIT,
        price: toBigNumberStr(params.price),
        quantity: toBigNumberStr(params.quantity),
        leverage: toBigNumberStr(params.leverage),
        side: params.side,
        reduceOnly: params.reduceOnly,
        salt: params.salt,
        expiration: params.expiration,
        orderSignature: params.orderSignatrue,
        timeInForce: params.timeInForce || TIME_IN_FORCE.GOOD_TILL_CANCEL,
        postOnly: params.postOnly || false,
      },
      {
        headers: { "Content-Type": "application/json" },
        validateStatus: () => true,
      }
    );

    return { status: response.status, data: response.data };
  }

  async getPosition(
    params: GetPositionRequest
  ): Promise<GetPositionResponse | GetPositionResponse[]> {
    const url = this._createAPIURL("/userPosition", {
      ...params,
      userAddress: this.getPublicAddress(),
    });

    const response = await axios.get(url);

    return response.data;
  }

  /**
   * Creates signature for cancelling orders
   * @param params OrderCancelSignatureRequest containing market symbol and order hashes to be cancelled
   * @returns generated signature string
   */
  async createOrderCancellationSignature(
    params: OrderCancelSignatureRequest
  ): Promise<string> {
    const signer = this.orderSigners.get(params.symbol);
    if (!signer) {
      throw Error(
        `Provided Market Symbol(${params.symbol}) is not added to client library`
      );
    }

    return signer.signCancelOrdersByHash(
      params.hashes,
      this.getPublicAddress().toLowerCase(),
      SigningMethod.Hash
    );
  }

  /**
   * Posts to exchange for cancellation of provided orders
   * @param params OrderCancellationRequest containing order hashes to be cancelled and cancellation signature
   * @returns response from exchange server
   */
  async cancelOrders(
    params: OrderCancellationRequest
  ): Promise<PlaceCancelOrderResponse> {
    try {
      const response = await axios.delete(
        `${this.network.apiGateway}/orders/hash`,
        {
          data: {
            symbol: params.symbol,
            userAddress: this.getPublicAddress(),
            orderHashes: params.hashes,
            cancelSignature: params.signature,
          },
        }
      );
      return { status: response.status, data: response.data };
    } catch (e) {
      console.log(e);
      // return { status: response.status, data: response.data };
    }

    return false as any as PlaceCancelOrderResponse;
  }

  async getOrderbook(params: GetOrderbookRequest): Promise<string> {
    const url = this._createAPIURL("/orderbook", params);
    return url;
  }

  /**
   * Returns the public address of account connected with the client
   * @returns string | address
   */
  getPublicAddress(): address {
    return this.wallet.address;
  }

  //= ==============================================================//
  // INTERNAL HELPER FUNCTIONS
  //= ==============================================================//

  /**
   * Internal function to return a global(Test USDC Token / Margin Bank) contract
   * @param contract address of contract
   * @returns contract or false
   */
  _getContract(
    contractName: string,
    contract?: address
  ): Contract | boolean | MarginBank {
    if (!contract) {
      contract = (contracts as any)[this.network.chainId][contractName].address;
    }

    if (contract === "" || contract === undefined) {
      return false;
    }

    switch (contractName) {
      case "Test_Token":
        return new Contract(contract, TestToken.abi);
      case "MarginBank":
        const marginBankFactory = new MarginBank__factory();
        const marginBank = marginBankFactory.attach(contract);
        return marginBank as any as MarginBank;
      default:
        return false;
    }
  }

  _createOrderToSign(params: OrderSignatureRequest): Order {
    const expiration = new Date();
    expiration.setMonth(expiration.getMonth() + 1);

    return {
      limitPrice: new Price(bigNumber(params.price)),
      isBuy: params.side === ORDER_SIDE.BUY,
      amount: toBigNumber(params.quantity),
      leverage: toBigNumber(params.leverage || 1),
      maker: this.getPublicAddress().toLocaleLowerCase(),
      isDecreaseOnly: params.reduceOnly || false,
      triggerPrice: new Price(0),
      limitFee: new Fee(0),
      taker: "0x0000000000000000000000000000000000000000",
      expiration: bigNumber(
        params.expiration || Math.floor(expiration.getTime() / 1000)
      ),
      salt: bigNumber(params.salt || Math.floor(Math.random() * 1_000_000)),
    } as Order;
  }

  _createAPIURL(route: string, params: any): string {
    let url = `${this.network.apiGateway}${route}?`;

    if (params.symbol) {
      url += `&symbol=${params.symbol}`;
    }

    if (params.pageSize) {
      url += `&pageSize=${params.pageSize}`;
    }

    if (params.pageNumber) {
      url += `&pageNumber=${params.pageNumber}`;
    }

    if (params.limit) {
      url += `&limit=${params.limit}`;
    }

    if (params.userAddress) {
      url += `&userAddress=${params.userAddress}`;
    }

    if (params.status) {
      url += `&statuses=${params.status}`;
    }

    return url;
  }
}
