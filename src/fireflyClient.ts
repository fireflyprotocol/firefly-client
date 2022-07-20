import Web3 from "web3";

import { Contract, Wallet, providers } from "ethers";

import {
  toBigNumberStr,
  bnToString,
  bigNumber,
  toBigNumber,
  ORDER_SIDE,
  ORDER_TYPE,
  TIME_IN_FORCE,
  SigningMethod,
  MarketSymbol,
  address,
  DAPIKlineResponse,
  ORDER_STATUS,
  Price,
  Fee,
  Network,
  SignedOrder,
  Order,
  OrderSigner,
  contracts_exchange,
  USDT_ABI,
  bnStrToBaseNumber,
} from "@firefly-exchange/library";

import * as contractAddresses from "../deployedContracts.json";

import {
  GetOrderResponse,
  GetOrderRequest,
  OrderSignatureRequest,
  OrderSignatureResponse,
  PlaceOrderRequest,
  PlaceOrderResponse,
  GetPositionRequest,
  GetPositionResponse,
  OrderCancelSignatureRequest,
  OrderCancellationRequest,
  GetOrderbookRequest,
  GetOrderBookResponse,
  PostOrderRequest,
  GetUserTradesRequest,
  GetUserTradesResponse,
  GetAccountDataResponse,
  GetTransactionHistoryRequest,
  GetUserTransactionHistoryResponse,
  GetMarketRecentTradesRequest,
  GetMarketRecentTradesResponse,
  GetCandleStickRequest,
  MarketInfo,
  MiniTickerData,
  MarketMeta,
  StatusResponse,
} from "./interfaces/routes";

import { APIService } from "./exchange/apiService";
import { SERVICE_URLS } from "./exchange/apiUrls";
import { Sockets } from "./exchange/sockets";

export class FireflyClient {
  protected readonly network: Network;

  private web3: Web3;

  private wallet: Wallet;

  private orderSigners: Map<MarketSymbol, OrderSigner> = new Map();

  private apiService: APIService;

  public sockets: Sockets;

  /**
   * initializes the class instance
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
    this.apiService = new APIService(this.network.apiGateway);

    this.sockets = new Sockets(this.network.socketURL);
  }

  /**
   * Allows caller to add a market, internally creates order signer for the provided market
   * @param marksymbolet Symbol of MARKET in form of DOT-PERP, BTC-PERP etc.
   * @param ordersContractAddress (Optional) address of orders contract address for market
   * @returns boolean true if market is added else false
   */
  addMarket(symbol: MarketSymbol, ordersContract?: address): boolean {
    // if signer for market already exists return false
    if (this.orderSigners.get(symbol)) {
      return false;
    }

    const contract = this.getContract("Orders", ordersContract, symbol);

    this.orderSigners.set(
      symbol,
      new OrderSigner(this.web3, Number(this.network.chainId), contract.address)
    );
    return true;
  }

  /**
   * Removes the provided symbol market order signer and also unsubsribes socket from it
   * @param market symbol of the market to be removed
   * @returns boolean  true if market is removed false other wise
   */
  removeMarket(market: MarketSymbol): boolean {
    this.sockets.unsubscribeGlobalUpdatesBySymbol(market);
    return this.orderSigners.delete(market);
  }

  /**
   * Returns the USDT balance of user in USDT contract
   * @param contract (optional) address of USDT contract
   * @returns Number representing balance of user
   */
  async getUSDTBalance(contract?: address): Promise<string> {
    const tokenContract = this.getContract("USDTToken", contract);
    const balance = await (tokenContract as Contract)
      .connect(this.wallet)
      .balanceOf(this.wallet.address);

    return bnToString(+balance);
  }

  /**
   * Returns the usdt Balance(Free Collateral) of the account in Margin Bank contract
   * @param contract (optional) address of Margin Bank contract
   * @returns Number representing balance of user
   */
  async getMarginBankBalance(contract?: address): Promise<string> {
    const marginBankContract = this.getContract("MarginBank", contract);
    const balance = await (marginBankContract as contracts_exchange.MarginBank)
      .connect(this.wallet)
      .getAccountBankBalance(this.wallet.address);

    return balance.toString();
  }

  /**
   * Faucet function, mints 10K USDT to wallet - Only works on Testnet
   * Assumes that the user wallet has Boba/Moonbase Tokens on Testnet
   * @param contract (optional) address of USDT contract
   * @returns Boolean true if user is funded, false otherwise
   */
  async mintTestUSDT(contract?: address): Promise<boolean> {
    const tokenContract = this.getContract("USDTToken", contract);
    // mint 10K usdt token
    await (
      await (tokenContract as Contract)
        .connect(this.wallet)
        .mint(this.wallet.address, toBigNumberStr(10000))
    ).wait();

    return true;
  }

  /**
   * Transfers usdt to margin bank to be used for placing orders and opening
   * positions on Firefly Exchange
   * @param amount the number of usdt to be transferred
   * @param usdtContract (optional) address of usdt contract
   * @param mbContract (address) address of Margin Bank contract
   * @returns boolean true if funds are transferred, false otherwise
   */
  async depositToMarginBank(
    amount: number,
    usdtContract?: address,
    mbContract?: address
  ): Promise<boolean> {
    const tokenContract = this.getContract("USDTToken", usdtContract);
    const marginBankContract = this.getContract("MarginBank", mbContract);
    const amountString = toBigNumberStr(amount);

    // approve usdt contract to allow margin bank to take funds out for user's behalf
    await (
      await (tokenContract as Contract)
        .connect(this.wallet)
        .approve(
          (marginBankContract as contracts_exchange.MarginBank).address,
          amountString,
          {}
        )
    ).wait();

    // deposit `amount` usdt to margin bank
    await (
      await (marginBankContract as contracts_exchange.MarginBank)
        .connect(this.wallet)
        .depositToBank(this.wallet.address, amountString, {})
    ).wait();

    return true;
  }

  /**
   * Transfers usdt from MarginBank, back to usdt contract
   * @param amount (optional) if not provided, transfers all available usdt tokens
   * from Margin Bank to usdt contract
   * @param mbContract (address) address of Margin Bank contract
   * @returns boolean true if funds are withdrawn, false otherwise
   */
  async withdrawFromMarginBank(
    amount?: number,
    mbContract?: address
  ): Promise<boolean> {
    const marginBankContract = this.getContract("MarginBank", mbContract);

    const amountString = amount
      ? toBigNumberStr(amount)
      : await this.getMarginBankBalance(
        (marginBankContract as contracts_exchange.MarginBank).address
      );

    await (
      await (marginBankContract as contracts_exchange.MarginBank)
        .connect(this.wallet)
        .withdrawFromBank(
          this.wallet.address,
          this.wallet.address,
          amountString
        )
    ).wait();

    return true;
  }

  /**
   * Creates order signature and returns it. The signed order can be placed on exchange
   * @param params OrderSignatureRequest params needed to be signed
   * @returns OrderSignatureResponse with the payload signed on-chain along with order signature
   */
  async createSignedOrder(
    params: OrderSignatureRequest
  ): Promise<OrderSignatureResponse> {
    const order = this.createOrderToSign(params);

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
      reduceOnly: order.reduceOnly,
      salt: order.salt.toNumber(),
      expiration: order.expiration.toNumber(),
      orderSignature: signedOrder.typedSignature,
    };
  }

  /**
   * Places a signed order on firefly exchange
   * @param params PlaceOrderRequest containing the signed order created using createSignedOrder
   * @returns PlaceOrderResponse containing status and data. If status is not 201, order placement failed.
   */
  async placeSignedOrder(params: PlaceOrderRequest) {

    console.log(`exp = ${params.expiration}`);
    
    const response = await this.apiService.post<PlaceOrderResponse>(
      SERVICE_URLS.ORDERS.ORDERS,
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
        orderSignature: params.orderSignature,
        timeInForce: params.timeInForce || TIME_IN_FORCE.GOOD_TILL_TIME,
        postOnly: params.postOnly || false,
      }
    );

    return response;
  }

  /**
   * Given an order payload, signs it on chain and submits to exchange for placement
   * @param params PostOrderRequest
   * @returns PlaceOrderResponse
   */
  async postOrder(params: PostOrderRequest) {
    const signedOrder = await this.createSignedOrder(params);
    const response = await this.placeSignedOrder({
      ...signedOrder,
      timeInForce: params.timeInForce,
      postOnly: params.postOnly,
    });

    return response;
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
  async placeCancelOrder(params: OrderCancellationRequest) {
    const response = await this.apiService.delete<PlaceOrderResponse>(
      SERVICE_URLS.ORDERS.ORDERS_HASH,
      {
        symbol: params.symbol,
        userAddress: this.getPublicAddress(),
        orderHashes: params.hashes,
        cancelSignature: params.signature,
      }
    );
    return response;
  }

  async postCancelOrder(params: OrderCancelSignatureRequest) {
    const signature = await this.createOrderCancellationSignature(params);
    const response = await this.placeCancelOrder({
      ...params,
      signature,
    });
    return response;
  }

  /**
   * Cancels all open orders for a given market
   * @param symbol DOT-PERP, market symbol
   * @returns cancellation response
   */
  async cancelAllOpenOrders(symbol: MarketSymbol) {
    const openOrders = await this.getUserOrders({
      symbol,
      statuses: ORDER_STATUS.OPEN,
    });

    const hashes = (await openOrders.data?.map(
      (order) => order.hash
    )) as string[];

    const response = await this.postCancelOrder({ hashes, symbol });

    return response;
  }

  /**
   * Gets Orders placed by the user. Returns the first 50 orders by default.
   * @param symbol market symbol get information about
   * @returns user default leverage
   */
 async getUserDefaultLeverage(symbol: string) {
    const accData = await this.getUserAccountData()
    if (!accData.data) {
      throw Error(
        `Account data does not exist`
      );
    }
    const accDataByMarket = accData.data.accountDataByMarket.filter(data => {      
      return data.symbol == symbol
    })    
    ///found accountDataByMarket
    if (accDataByMarket && accDataByMarket.length > 0) {      
      return bnStrToBaseNumber(accDataByMarket[0].selectedLeverage)
    }
    ///user is new and symbol data is not present in accountDataByMarket
    else {
      const exchangeInfo = await this.getExchangeInfo(symbol)
      if (!exchangeInfo.data) {
        throw Error(
          `Provided Market Symbol(${symbol}) does not exist`
        );
      }
      return bnStrToBaseNumber(exchangeInfo.data.defaultLeverage)
    }
 }

  /**
   * Gets Orders placed by the user. Returns the first 50 orders by default.
   * @param params of type OrderRequest,
   * @returns OrderResponse array
   */
  async getUserOrders(params: GetOrderRequest) {
    const response = await this.apiService.get<GetOrderResponse[]>(
      SERVICE_URLS.USER.ORDERS,
      {
        ...params,
        userAddress: this.getPublicAddress(),
      }
    );
    return response;
  }

  /**
   * Gets user open position. If the market is not specified then will return first 50 open positions for 50 markets.
   * @param params GetPositionRequest
   * @returns GetPositionResponse
   */
  async getUserPosition(params: GetPositionRequest) {
    const response = await this.apiService.get<GetPositionResponse[]>(
      SERVICE_URLS.USER.USER_POSITIONS,
      { ...params, userAddress: this.getPublicAddress() }
    );
    return response;
  }

  /**
   * Gets state of orderbook for provided market. At max top 50 bids/asks are retrievable
   * @param params GetOrdebookRequest
   * @returns GetOrderbookResponse
   */
  async getOrderbook(params: GetOrderbookRequest) {
    const response = await this.apiService.get<GetOrderBookResponse>(
      SERVICE_URLS.MARKET.ORDER_BOOK,
      params
    );

    return response;
  }

  /**
   * Gets user trades
   * @param params PlaceOrderResponse
   * @returns GetUserTradesResponse
   */
  async getUserTrades(params: GetUserTradesRequest) {
    const response = await this.apiService.get<GetUserTradesResponse>(
      SERVICE_URLS.USER.USER_TRADES,
      { ...params, userAddress: this.getPublicAddress() }
    );

    return response;
  }

  /**
   * Gets user Account Data
   * @returns GetAccountDataResponse
   */
  async getUserAccountData() {
    const response = await this.apiService.get<GetAccountDataResponse>(
      SERVICE_URLS.USER.ACCOUNT,
      { userAddress: this.getPublicAddress() }
    );
    return response;
  }

  /**
   * Gets user transaction history
   * @param params GetTransactionHistoryRequest
   * @returns GetUserTransactionHistoryResponse
   */
  async getUserTransactionHistory(params: GetTransactionHistoryRequest) {
    const response = await this.apiService.get<
      GetUserTransactionHistoryResponse[]
    >(SERVICE_URLS.USER.USER_TRANSACTION_HISTORY, {
      ...params,
      userAddress: this.getPublicAddress(),
    });
    return response;
  }

  /**
   * Gets market recent trades
   * @param params GetMarketRecentTradesRequest
   * @returns GetMarketRecentTradesResponse
   */
  async getMarketRecentTrades(params: GetMarketRecentTradesRequest) {
    const response = await this.apiService.get<GetMarketRecentTradesResponse>(
      SERVICE_URLS.MARKET.RECENT_TRADE,
      params
    );
    return response;
  }

  /**
   * Gets market candle stick data
   * @param params GetMarketRecentTradesRequest
   * @returns DAPIKlineResponse
   */
  async getMarketCandleStickData(params: GetCandleStickRequest) {
    const response = await this.apiService.get<DAPIKlineResponse>(
      SERVICE_URLS.MARKET.CANDLE_STICK_DATA,
      params
    );
    return response;
  }

  /**
   * Gets publically available market info about market(s)
   * @param symbol (optional) market symbol get information about, by default fetches info on all available markets
   * @returns MarketInfo or MarketInfo[] in case no market was provided as input
   */
  async getExchangeInfo(symbol?: MarketSymbol) {
    const response = await this.apiService.get<MarketInfo>(
      SERVICE_URLS.MARKET.EXCHANGE_INFO,
      { symbol }
    );
    return response;
  }

  /**
   * Gets MiniTickerData data for market(s)
   * @param symbol (optional) market symbol get information about, by default fetches info on all available markets
   * @returns MiniTickerData or MiniTickerData[] in case no market was provided as input
   */
  async getMarketData(symbol?: MarketSymbol) {
    const response = await this.apiService.get<MiniTickerData>(
      SERVICE_URLS.MARKET.MARKET_DATA,
      { symbol }
    );
    return response;
  }

  /**
   * Gets Meta data of the market(s)
   * @param symbol (optional) market symbol get information about, by default fetches info on all available markets
   * @returns MarketMeta or MarketMeta[] in case no market was provided as input
   */
  async getMarketMetaInfo(symbol?: MarketSymbol) {
    const response = await this.apiService.get<MarketMeta>(
      SERVICE_URLS.MARKET.META,
      { symbol }
    );
    return response;
  }

  /**
   * Gets status of the exchange
   * @returns StatusResponse
   */
  async getExchangeStatus() {
    const response = await this.apiService.get<StatusResponse>(
      SERVICE_URLS.MARKET.STATUS
    );
    return response;
  }

  /**
   * Returns the public address of account connected with the client
   * @returns string | address
   */
  getPublicAddress(): address {
    return this.wallet.address;
  }

  //= ==============================================================//
  //                    PRIVATE HELPER FUNCTIONS
  //= ==============================================================//

  /**
   * Private function to return a global(Test usdt Token / Margin Bank) contract
   * @param contract address of contract
   * @returns Contract | MarginBank or throws error
   */
  private getContract(
    contractName: string,
    contract?: address,
    market?: MarketSymbol
  ): Contract | contracts_exchange.MarginBank | contracts_exchange.Orders {
    // if a market name is provided and contract address is not provided
    if (market && !contract) {
      try {
        contract = (contractAddresses as any)[this.network.chainId][market][
          contractName
        ].address;
      } catch (e) {
        contract = "";
      }
    }

    // if contract address is not provided and also market name is not provided
    if (!market && !contract) {
      try {
        contract = (contractAddresses as any)[this.network.chainId][
          contractName
        ].address;
      } catch (e) {
        contract = "";
      }
    }

    if (contract === "" || contract === undefined) {
      throw Error(
        `Contract "${contractName}" not found in deployedContracts.json for network id ${this.network.chainId}`
      );
    }

    switch (contractName) {
      case "USDTToken":
        return new Contract(contract, USDT_ABI.abi);
      case "MarginBank":
        const marginBankFactory = new contracts_exchange.MarginBank__factory();
        const marginBank = marginBankFactory.attach(contract);
        return marginBank as any as contracts_exchange.MarginBank;
      case "Orders":
        const ordersFactory = new contracts_exchange.Orders__factory();
        const orders = ordersFactory.attach(contract);
        return orders as any as contracts_exchange.Orders;
      default:
        throw Error(`Unknown contract name received: ${contractName}`);
    }
  }

  /**
   * Private function to create order payload that is to be signed on-chain
   * @param params OrderSignatureRequest
   * @returns Order
   */
  private createOrderToSign(params: OrderSignatureRequest): Order {
    const expiration = new Date();
    expiration.setMonth(expiration.getMonth() + 1);
        
    return {
      limitPrice: new Price(bigNumber(params.price)),
      isBuy: params.side === ORDER_SIDE.BUY,
      quantity: toBigNumber(params.quantity),
      leverage: toBigNumber(params.leverage || 1),
      maker: this.getPublicAddress().toLocaleLowerCase(),
      reduceOnly: params.reduceOnly || false,
      triggerPrice: new Price(0),
      limitFee: new Fee(0),
      taker: "0x0000000000000000000000000000000000000000",
      expiration: bigNumber(
        params.expiration || Math.floor(expiration.getTime()) //removed /1000 because taking time in ms now
      ),
      salt: bigNumber(params.salt || Math.floor(Math.random() * 1_000_000)),
    } as Order;
  }
}
