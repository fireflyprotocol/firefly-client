import Web3 from "web3";

import { Contract, Wallet, providers, Signer, ethers } from "ethers";

import {
  toBigNumberStr,
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
  OnboardingSigner,
  OnboardingMessageString,
  MARGIN_TYPE,
  bnToString,
} from "@firefly-exchange/library";

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
  ExchangeInfo,
  MarketData,
  MarketMeta,
  StatusResponse,
  AuthorizeHashResponse,
  AdjustLeverageResponse,
  CancelOrderResponse,
  FundGasResponse,
} from "./interfaces/routes";

import { APIService } from "./exchange/apiService";
import { SERVICE_URLS } from "./exchange/apiUrls";
import { Sockets } from "./exchange/sockets";
import { calcMargin } from "@firefly-exchange/firefly-math";
import { OnboardingMessage } from "@firefly-exchange/library/dist/src/interfaces/OnboardingMessage";
import { AxiosRequestConfig, AxiosRequestHeaders } from "axios";

export class FireflyClient {
  protected readonly network: Network;

  private web3: Web3;

  private wallet: Wallet | undefined;

  private orderSigners: Map<MarketSymbol, OrderSigner> = new Map();

  private onboardSigner: OnboardingSigner;

  private apiService: APIService;

  public sockets: Sockets;

  public marketSymbols: string[] = []; //to save array market symbols [DOT-PERP, SOL-PERP]

  private walletAddress = "" //to save user's public address when connecting from UI

  private signer: Signer | undefined //to save provider when connecting from UI

  private signingMethod: SigningMethod = SigningMethod.MetaMaskLatest //to save signing method when integrating on UI

  private contractAddresses: any

  private token = "" //auth token

  private isTermAccepted = false

  /**
   * initializes the class instance
   * @param _isTermAccepted boolean indicating if exchange terms and conditions are accepted
   * @param _network containing network rpc url and chain id
   * @param _acctPvtKey private key for the account to be used for placing orders
   */
  constructor(_isTermAccepted: boolean, _network: Network, _acctPvtKey?: string) {
    this.network = _network;

    this.web3 = new Web3(_network.url);

    this.apiService = new APIService(this.network.apiGateway);

    this.sockets = new Sockets(this.network.socketURL);

    this.onboardSigner = new OnboardingSigner(this.web3, this.network.chainId)

    this.isTermAccepted = _isTermAccepted

    if (_acctPvtKey) {
      this.initializeWithPrivateKey(_acctPvtKey)
    }
  }

  /**
   * initializes web3 with the given provider and creates a signer to sign transactions like placing order
   * @param _web3Provider provider HttpProvider | IpcProvider | WebsocketProvider | AbstractProvider | string
   * @param _signingMethod method to sign transactions with, by default its MetaMaskLatest
   */
  async initializeWithProvider(_web3Provider: any, _signingMethod?: SigningMethod) {
    this.web3 = new Web3(_web3Provider)
    
		let provider = new ethers.providers.Web3Provider(_web3Provider);
    this.signer = provider.getSigner()
    this.walletAddress = await this.signer.getAddress()

    if (_signingMethod) {
      this.signingMethod = _signingMethod
    }
  }

  /**
   * initializes web3 and wallet with the given account private key
   * @param _acctPvtKey private key for the account to be used for placing orders
   */
  initializeWithPrivateKey(_acctPvtKey: string) {
    this.web3.eth.accounts.wallet.add(_acctPvtKey);
    this.wallet = new Wallet(
      _acctPvtKey,
      new providers.JsonRpcProvider(this.network.url)
    );
  }

  /**
   * initializes contract addresses
   */
  async init() {
    //get contract addresses
    const addresses = await this.getContractAddresses()
    if (!addresses.ok) {
      throw Error(
        "Failed to fetch contract addresses"
      );
    }
    this.contractAddresses = addresses.data

    //get auth token
    await this.getToken()
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
   * Returns the USDC balance of user in USDC contract
   * @param contract (optional) address of USDC contract
   * @returns Number representing balance of user
   */
  async getUSDCBalance(contract?: address): Promise<string> {
    const tokenContract = this.getContract("USDTToken", contract);
    const balance = await (tokenContract as Contract)
      .connect(this.getWallet())
      .balanceOf(this.getPublicAddress());

    return bnToString(balance.toHexString()); 
  }

  /**
   * Returns the usdc Balance(Free Collateral) of the account in Margin Bank contract
   * @param contract (optional) address of Margin Bank contract
   * @returns Number representing balance of user
   */
  async getMarginBankBalance(contract?: address): Promise<string> {
    const marginBankContract = this.getContract("MarginBank", contract);
    const balance = await (marginBankContract as contracts_exchange.MarginBank)
      .connect(this.getWallet())
      .getAccountBankBalance(this.getPublicAddress());

    return balance.toString();
  }

  /**
   * Faucet function, mints 10K USDC to wallet - Only works on Testnet
   * Assumes that the user wallet has Boba/Moonbase Tokens on Testnet
   * @param contract (optional) address of USDC contract
   * @returns Boolean true if user is funded, false otherwise
   */
  async mintTestUSDC(contract?: address): Promise<boolean> {
    const tokenContract = this.getContract("USDTToken", contract);
    // mint 10K usdc token
    await (
      await (tokenContract as Contract)
        .connect(this.getWallet())
        .mint(this.getPublicAddress(), toBigNumberStr(10000))
    ).wait();

    return true;
  }

  /**
   * Funds gas tokens to user's account
   * @returns Fund gas reponse
   */
  async fundGas() {
    const token = await this.getToken()
    const headers: AxiosRequestHeaders = {
      "Authorization": `Bearer ${token}`
    }
    const configs: AxiosRequestConfig = {
      headers: headers
    }

    const response = await this.apiService.post<FundGasResponse>(
      SERVICE_URLS.USER.FUND_GAS,
      {},
      configs
    );
    return response;
  }

  /**
   * Returns boba balance in user's account
   * @returns Number representing boba balance in account
   */
  async getBobaBalance() {
    return bnToString((await this.getWallet().getBalance()).toHexString())
  }

  /**
   * Transfers usdc to margin bank to be used for placing orders and opening
   * positions on Firefly Exchange
   * @param amount the number of usdc to be transferred
   * @param usdtContract (optional) address of usdc contract
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

    // approve usdc contract to allow margin bank to take funds out for user's behalf
    await (
      await (tokenContract as Contract)
        .connect(this.getWallet())
        .approve(
          (marginBankContract as contracts_exchange.MarginBank).address,
          amountString,
          {}
        )
    ).wait();

    // deposit `amount` usdc to margin bank
    await (
      await (marginBankContract as contracts_exchange.MarginBank)
        .connect(this.getWallet())
        .depositToBank(this.getPublicAddress(), amountString, {})
    ).wait();

    return true;
  }

  /**
   * Transfers usdc from MarginBank, back to usdc contract
   * @param amount (optional) if not provided, transfers all available usdc tokens
   * from Margin Bank to usdc contract
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
        .connect(this.getWallet())
        .withdrawFromBank(
          this.getPublicAddress(),
          this.getPublicAddress(),
          amountString
        )
    ).wait();

    return true;
  }

  /**
   * Gets margin of position open
   * @param symbol market symbol get information about
   * @param perpContract (address) address of Perpetual address comes in metaInfo
   * @returns margin balance of positions of given symbol
   */
  async getAccountPositionBalance(symbol: MarketSymbol, perpContract?: address) {
    const perpV1Contract = this.getContract("PerpetualProxy", perpContract, symbol);
    const marginBalance = await perpV1Contract.connect(this.getWallet()).getAccountPositionBalance(this.getPublicAddress());
    return marginBalance
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
      this.getSigningMethod()
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
      this.getSigningMethod()
    );
  }

  /**
   * Posts to exchange for cancellation of provided orders
   * @param params OrderCancellationRequest containing order hashes to be cancelled and cancellation signature
   * @returns response from exchange server
   */
  async placeCancelOrder(params: OrderCancellationRequest) {
    const response = await this.apiService.delete<CancelOrderResponse>(
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
    if (params.hashes.length <= 0) {
      throw Error(
        `No orders to cancel`
      );
    }
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
      status: ORDER_STATUS.OPEN,
    });

    const hashes = (await openOrders.data?.map(
      (order) => order.hash
    )) as string[];

    const response = await this.postCancelOrder({ hashes, symbol });

    return response;
  }

  /**
   * Updates user's leverage to given leverage
   * @param symbol market symbol get information about
   * @param leverage new leverage you want to change to
   * @param perpetualAddress (address) address of Perpetual contract (comes in meta)
   * @param marginBankAddress (address) address of Margin Bank contract (comes in meta)
   * @returns boolean indicating if leverage updated successfully
   */

  async updateLeverage(
    symbol: MarketSymbol, 
    leverage: number, 
    perpetualAddress: address,
    marginBankAddress: address,
    ) {
    const userPosition = await this.getUserPosition({symbol: symbol})
    if (!userPosition.data) {
      throw Error(
        `User positions data doesn't exist`
      );
    }

    const position = userPosition.data as any as GetPositionResponse

    //if user position exists, make contract call to add or remove margin
    if (Object.keys(position).length > 0) { //TODO [BFLY-603]: this should be returned as array from dapi, remove this typecasting when done
      //calculate new margin that'd be required
      const bnNewMargin = bigNumber(calcMargin(
        position.quantity, 
        position.avgEntryPrice, 
        toBigNumberStr(leverage)
      ))
      const bnCurrMargin = bigNumber(position.margin)
      const marginToAdjust = bnCurrMargin.minus(bnNewMargin).abs().toFixed()
      const isAdd = bnNewMargin.gt(bnCurrMargin);
      
      if (bigNumber(marginToAdjust).gt(bigNumber(0))) {
        if (isAdd) {
          const marginBankContract = this.getContract("MarginBank", marginBankAddress, symbol);

          await (
            await (marginBankContract as contracts_exchange.MarginBank)
              .connect(this.getWallet())
              .transferToPerpetual(
                perpetualAddress,
                this.getPublicAddress(),
                marginToAdjust,
                new Web3().eth.abi.encodeParameter(
                  "bytes32",
                  Web3.utils.asciiToHex("UpdateSLeverage")
                )
              )
          ).wait();
          return true
        }
        else {
          const perpV1Contract = this.getContract("PerpetualProxy", perpetualAddress, symbol);

          await (
            await (perpV1Contract as contracts_exchange.PerpetualV1)
              .connect(this.getWallet())
              .withdrawFromPosition(
                this.getPublicAddress(),
                this.getPublicAddress(),
                marginToAdjust,
                new Web3().eth.abi.encodeParameter(
                  "bytes32",
                  Web3.utils.asciiToHex("UpdateSLeverage")
                ),
              )
          ).wait();
          return true
        }
      }
      return false
    }
    //make api call
    else {
      const token = await this.getToken()

      //make update leverage api call
      const adjustLeverageResponse = await this.adjustLeverage({
        symbol: symbol,
        leverage: leverage,
        authToken: token
      })
      
      if (!adjustLeverageResponse.ok || !adjustLeverageResponse.data) {
        throw Error(
          `Adjust leverage error: ${adjustLeverageResponse.response.message}`
        );
      }
      return adjustLeverageResponse.ok
    }
  }

  /**
   * Gets Users default leverage.
   * @param symbol market symbol get information about
   * @returns user default leverage
   */
 async getUserDefaultLeverage(symbol: MarketSymbol) {
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
   * @returns ExchangeInfo or ExchangeInfo[] in case no market was provided as input
   */
  async getExchangeInfo(symbol?: MarketSymbol) {
    const response = await this.apiService.get<ExchangeInfo>(
      SERVICE_URLS.MARKET.EXCHANGE_INFO,
      { symbol }
    );
    return response;
  }

  /**
   * Gets MarketData data for market(s)
   * @param symbol (optional) market symbol get information about, by default fetches info on all available markets
   * @returns MarketData or MarketData[] in case no market was provided as input
   */
  async getMarketData(symbol?: MarketSymbol) {
    const response = await this.apiService.get<MarketData>(
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
   * Gets the list of market symbols available on exchange
   * @returns array of strings representing MARKET SYMBOLS
   */
 async getMarketSymbols() {
    const response = await this.apiService.get<string[]>(
      SERVICE_URLS.MARKET.SYMBOLS
    );
    return response
 }

 /**
  * Gets contract addresses of market 
  * @param symbol (optional) market symbol get information about, by default fetches info on all available markets
  * @returns deployed contract addresses
  */
 async getContractAddresses(symbol?: MarketSymbol) {
  const response = await this.apiService.get<Record<string,object>>(
    SERVICE_URLS.MARKET.CONTRACT_ADDRESSES,
    { symbol }
  );
  return response
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
    const address = this.wallet ? this.wallet.address : this.walletAddress
    if (address == ""){
      throw Error(
        `Invalid user address`
      );
    }
    return address
  }

  getWallet() {  
    const walletOrSigner = this.wallet ? this.wallet : this.signer
    if (!walletOrSigner){
      throw Error(
        `Invalid Signer`
      );
    } 
    return walletOrSigner
  }

  getSigningMethod() {
    return this.wallet ? SigningMethod.Hash : this.signingMethod
  }

  //= ==============================================================//
  //                    PRIVATE HELPER FUNCTIONS
  //= ==============================================================//

  /**
   * Private function to return a global(Test usdc Token / Margin Bank) contract
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
        contract = this.contractAddresses[market][
          contractName
        ].address;
      } catch (e) {
        contract = "";
      }
    }

    // if contract address is not provided and also market name is not provided
    if (!market && !contract) {
      try {
        contract = this.contractAddresses[
          contractName
        ].address;
      } catch (e) {
        contract = "";
      }
    }

    if (contract === "" || contract === undefined) {
      throw Error(
        `Contract "${contractName}" not found in contract addresses for network id ${this.network.chainId}`
      );
    }

    switch (contractName) {
      case "PerpetualV1":
      case "PerpetualProxy":
        const perpV1Factory = new contracts_exchange.PerpetualV1__factory();
        const perpV1 = perpV1Factory.attach(contract);
        return perpV1 as any as contracts_exchange.PerpetualV1
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
    //MARKET ORDER - set expiration of 1 minute
    if (params.price === 0){
      expiration.setMinutes(expiration.getMinutes() + 1);
    }
    //LIMIT ORDER - set expiration of 1 month
    else {
      expiration.setMonth(expiration.getMonth() + 1);
    }

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
        params.expiration || Math.floor(expiration.getTime() / 1000) // /1000 to convert time in seconds
      ),
      salt: bigNumber(params.salt || Math.floor(Math.random() * 1_000_000)),
    } as Order;
  }

  /**
   * Creates message to be signed, creates signature and authorize it from dapi
   * @returns auth token
   */
   private async getToken() {
    if (this.token !== "") {
      return this.token
    }

    const message: OnboardingMessage = {
      action: OnboardingMessageString.ONBOARDING,
      onlySignOn: this.network.onboardingUrl
    }
    //sign onboarding message
    const signature = await this.onboardSigner.sign(this.getPublicAddress(), SigningMethod.TypedData, message)      
    //authorize signature created by dAPI
    const authTokenResponse = await this.authorizeSignedHash(signature)

    if (!authTokenResponse.ok || !authTokenResponse.data) {
      throw Error(
        `Authorization error: ${authTokenResponse.response.message}`
      );
    }

    this.token = authTokenResponse.data.token
    return this.token
  }

  /**
   * Posts signed Auth Hash to dAPI and gets token in return if signature is valid
   * @returns GetAuthHashResponse which contains auth hash to be signed
   */
  private async authorizeSignedHash(signedHash: string) {
    const response = await this.apiService.post<AuthorizeHashResponse>(
      SERVICE_URLS.USER.AUTHORIZE,
      {
        signature: signedHash,
        userAddress: this.getPublicAddress(),
        isTermAccepted: this.isTermAccepted
      }
    );
    return response;
  }

  /**
   * Posts signed Auth Hash to dAPI and gets token in return if signature is valid
   * @returns GetAuthHashResponse which contains auth hash to be signed
   */
   private async adjustLeverage(params: {symbol: MarketSymbol, leverage: number, authToken: string}) {

    const headers: AxiosRequestHeaders = {
      "Authorization": `Bearer ${params.authToken}`
    }
    const configs: AxiosRequestConfig = {
      headers: headers
    }
    const response = await this.apiService.post<AdjustLeverageResponse>(
      SERVICE_URLS.USER.ADJUST_LEVERGAE,
      {
        symbol: params.symbol,
        address: this.getPublicAddress(),
        leverage: toBigNumberStr(params.leverage),
        marginType: MARGIN_TYPE.ISOLATED,
      },
      configs
    );
    return response;
  }
}