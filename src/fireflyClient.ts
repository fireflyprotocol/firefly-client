/* eslint-disable prettier/prettier */
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
  Network,
  SignedOrder,
  Order,
  OrderSigner,
  contracts_exchange,
  bnStrToBaseNumber,
  MARGIN_TYPE,
  bnToString,
  Web3,
  ADJUST_MARGIN,
  OnboardingSigner,
} from "@firefly-exchange/library";
// @ts-ignore
import { Biconomy } from "@biconomy/mexa";
import HDWalletProvider from "@truffle/hdwallet-provider";
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
import { BICONOMY_API_KEY, Networks } from "./constants";
import {
  adjustLeverageContractCall,
  adjustMarginContractCall,
  depositToMarginBankContractCall,
  withdrawFromMarginBankContractCall,
} from "./exchange/contractService";
import { ResponseSchema } from "./exchange/contractErrorHandling.service";
// @ts-ignore
import {
  adjustLeverageBiconomyCall,
  adjustMarginBiconomyCall,
  depositToMarginBankBiconomyCall,
  withdrawFromMarginBankBiconomyCall,
} from "./exchange/biconomyService";
export class FireflyClient {
  protected readonly network: Network;

  private web3: Web3;

  private wallet: Wallet | undefined;

  private orderSigners: Map<MarketSymbol, OrderSigner> = new Map();

  private apiService: APIService;

  public sockets: Sockets;

  public marketSymbols: string[] = []; // to save array market symbols [DOT-PERP, SOL-PERP]

  private walletAddress = ""; // to save user's public address when connecting from UI

  private signer: Signer | undefined; // to save signer when connecting from UI

  private web3Provider: any | undefined; // to save raw web3 provider when connecting from UI

  private signingMethod: SigningMethod = SigningMethod.MetaMaskLatest; // to save signing method when integrating on UI

  private biconomy: Biconomy | undefined;

  private contractAddresses: any;

  private isTermAccepted = false;

  private useBiconomy = false;

  private maxBlockGasLimit = 0;

  // the number of decimals supported by USDC contract
  private MarginTokenPrecision = 6;

  // ◥◤◥◤◥◤◥◤◥◤ Private Contracts Names ◥◤◥◤◥◤◥◤◥◤
  private _usdcToken = "USDC";

  private _perpetual = "Perpetual";

  private _marginBank = "MarginBank";

  private _isolatedTrader = "IsolatedTrader";
  // ◢◣◢◣◢◣◢◣◢◣◢◣◢◣◢◣◢◣◢◣◢◣◢◣◢◣◢◣◢◣◢◣◢◣◢◣◢◣◢◣◢◣◢◣◢

  /**
   * initializes the class instance
   * @param _isTermAccepted boolean indicating if exchange terms and conditions are accepted
   * @param _network containing network rpc url and chain id
   * @param _acctPvtKey private key for the account to be used for placing orders
   * @param _useBiconomy boolean if true biconomy(Gasless transactions) will be used for contract interaction
   */
  constructor(
    _isTermAccepted: boolean,
    _network: Network,
    _acctPvtKey?: string,
    _useBiconomy: boolean = false
  ) {
    this.network = _network;

    this.web3 = new Web3(_network.url);

    this.apiService = new APIService(this.network.apiGateway);

    this.sockets = new Sockets(this.network.socketURL);

    this.isTermAccepted = _isTermAccepted;

    this.useBiconomy = _useBiconomy;

    if (_acctPvtKey) {
      this.initializeWithPrivateKey(_acctPvtKey);
    }
  }

  /**
   * initializes web3 with the given provider and creates a signer to sign transactions like placing order
   * @param _web3Provider provider HttpProvider | IpcProvider | WebsocketProvider | AbstractProvider | string
   * @param _signingMethod method to sign transactions with, by default its MetaMaskLatest
   */
  initializeWithProvider = async (
    _web3Provider: any,
    _signingMethod?: SigningMethod
  ) => {
    this.web3Provider = _web3Provider;
    this.web3 = new Web3(_web3Provider);
    const provider = new ethers.providers.Web3Provider(_web3Provider);

    this.signer = provider.getSigner();
    this.walletAddress = await this.signer.getAddress();

    if (_signingMethod) {
      this.signingMethod = _signingMethod;
    }
  };

  /**
   * initializes web3 and wallet with the given account private key
   * @param _acctPvtKey private key for the account to be used for placing orders
   */
  initializeWithPrivateKey = (_acctPvtKey: string) => {
    this.web3.eth.accounts.wallet.add(_acctPvtKey);
    this.wallet = new Wallet(
      _acctPvtKey,
      new providers.JsonRpcProvider(this.network.url)
    );
  };

  /**
   * initializes contract addresses
   */
  init = async (userOnboarding: boolean = true) => {
    // get contract addresses
    const addresses = await this.getContractAddresses();
    if (!addresses.ok) {
      throw Error("Failed to fetch contract addresses");
    }

    this.contractAddresses = addresses.data;

    // onboard user if not onboarded
    if (userOnboarding) {
      await this.userOnBoarding();
    }

    this.maxBlockGasLimit = (await this.web3.eth.getBlock("latest")).gasLimit;

    if (this.useBiconomy) {
      let provider: any;

      if (this.web3Provider) {
        provider = this.web3Provider;
      } else {
        provider = new HDWalletProvider({
          privateKeys: [(this.getWallet() as Wallet).privateKey],
          providerOrUrl: this.network.url,
        });
      }

      this.marketSymbols = (await this.getMarketSymbols()).response.data;

      this.marketSymbols = ['BTC-PERP']
      const biconomyAddresses = this.marketSymbols.map((symbol) => {
        return this.getContractAddressByName(
          this._perpetual,
          undefined,
          symbol
        );
      });

      biconomyAddresses.push(this.getContractAddressByName(this._marginBank));
      biconomyAddresses.push(this.getContractAddressByName(this._usdcToken));

      this.biconomy = await this.initBiconomy(
        provider,
        BICONOMY_API_KEY,
        biconomyAddresses
      );
    }
  };

  initBiconomy = async (provider: any, apiKey: string, contracts: string[]) => {
    const biconomy = new Biconomy(provider, {
      walletProvider: provider,
      apiKey,
      debug: true,
      contractAddresses: contracts,
    });

    return new Promise((resolve) => {
      biconomy.onEvent(biconomy.READY, async () => {
        resolve(biconomy);
      });

      biconomy.onEvent(biconomy.ERROR, async (data: any) => {
        console.log(JSON.stringify(data));
        throw Error(data?.message);
      });
    });
  };

  /**
   * Allows caller to add a market, internally creates order signer for the provided market
   * @param symbol Symbol of MARKET in form of DOT-PERP, BTC-PERP etc.
   * @param isolatedTraderContract (Optional) address of isolatedTrader contract address for market
   * @returns boolean true if market is added else false
   */
  addMarket = (
    symbol: MarketSymbol,
    isolatedTraderContract?: address
  ): boolean => {
    // if signer for market already exists return false
    if (this.orderSigners.get(symbol)) {
      return false;
    }

    const contract = this.getContract(
      this._isolatedTrader,
      isolatedTraderContract,
      symbol
    );

    this.orderSigners.set(
      symbol,
      new OrderSigner(this.web3, Number(this.network.chainId), contract.address)
    );
    return true;
  };

  /**
   * Removes the provided symbol market order signer and also unsubsribes socket from it
   * @param market symbol of the market to be removed
   * @returns boolean  true if market is removed false other wise
   */
  removeMarket = (market: MarketSymbol): boolean => {
    this.sockets.unsubscribeGlobalUpdatesBySymbol(market);
    return this.orderSigners.delete(market);
  };

  /**
   * Returns the USDC balance of user in USDC contract
   * @param contract (optional) address of USDC contract
   * @returns Number representing balance of user
   */
  getUSDCBalance = async (contract?: address): Promise<number> => {
    const tokenContract = this.getContract(this._usdcToken, contract);
    const balance = await (tokenContract as Contract)
      .connect(this.getWallet())
      .balanceOf(this.getPublicAddress());

    return bnStrToBaseNumber(
      bnToString(balance.toHexString()),
      this.MarginTokenPrecision
    );
  };

  /**
   * Returns the usdc Balance(Free Collateral) of the account in Margin Bank contract
   * @param contract (optional) address of Margin Bank contract
   * @returns Number representing balance of user
   */
  getMarginBankBalance = async (contract?: address): Promise<number> => {
    const marginBankContract = this.getContract(this._marginBank, contract);
    const balance = await (marginBankContract as contracts_exchange.MarginBank)
      .connect(this.getWallet())
      .getAccountBankBalance(this.getPublicAddress());

    return bnStrToBaseNumber(bnToString(balance.toHexString()));
  };

  /**
   * Faucet function, mints 10K USDC to wallet - Only works on Testnet
   * Assumes that the user wallet has Boba/Moonbase Tokens on Testnet
   * @param contract (optional) address of USDC contract
   * @returns Boolean true if user is funded, false otherwise
   */
  mintTestUSDC = async (contract?: address): Promise<boolean> => {
    if (this.network === Networks.PRODUCTION) {
      throw Error(`Function does not work on PRODUCTION`);
    }

    const tokenContract = this.getContract(this._usdcToken, contract);
    // mint 10K usdc token
    await (
      await (tokenContract as Contract)
        .connect(this.getWallet())
        .mint(
          this.getPublicAddress(),
          toBigNumberStr(10000, this.MarginTokenPrecision),
          {
            gasLimit: this.maxBlockGasLimit,
          }
        )
    ).wait();

    return true;
  };

  /**
   * Funds gas tokens to user's account
   * @returns Fund gas response
   */
  fundGas = async () => {
    const response = await this.apiService.post<FundGasResponse>(
      SERVICE_URLS.USER.FUND_GAS,
      {},
      { isAuthenticationRequired: true }
    );
    return response;
  };

  /**
   * Returns boba balance in user's account
   * @returns Number representing boba balance in account
   */
  getBobaBalance = async (): Promise<number> => {
    return bnStrToBaseNumber(
      bnToString((await this.getWallet().getBalance()).toHexString())
    );
  };

  /**
   * Transfers usdc to margin bank to be used for placing orders and opening
   * positions on Firefly Exchange
   * @param amount the number of usdc to be transferred
   * @param usdcContract (optional) address of usdc contract
   * @param mbContract (address) address of Margin Bank contract
   * @returns boolean true if funds are transferred, false otherwise
   */
  depositToMarginBank = async (
    amount: number,
    usdcContract?: address,
    mbContract?: address
  ): Promise<ResponseSchema> => {
    const tokenContract = this.getContract(this._usdcToken, usdcContract);
    const marginBankContract = this.getContract(this._marginBank, mbContract);
    const amountString = toBigNumberStr(amount, this.MarginTokenPrecision);

    // approve usdc contract to allow margin bank to take funds out for user's behalf
    let resp;
    if (this.useBiconomy) {
      resp = await depositToMarginBankBiconomyCall(
        tokenContract,
        marginBankContract,
        amountString,
        this.getWallet(),
        this.maxBlockGasLimit,
        this.biconomy,
        this.getPublicAddress
      );
    } else {
      resp = await depositToMarginBankContractCall(
        tokenContract,
        marginBankContract,
        amountString,
        this.getWallet(),
        this.maxBlockGasLimit,
        this.getPublicAddress
      );
    }

    return resp;
  };

  /**
   * Transfers usdc from MarginBank, back to usdc contract
   * @param amount (optional) if not provided, transfers all available usdc tokens
   * from Margin Bank to usdc contract
   * @param mbContract (address) address of Margin Bank contract
   * @returns boolean true if funds are withdrawn, false otherwise
   */
  withdrawFromMarginBank = async (
    amount?: number,
    mbContract?: address
  ): Promise<ResponseSchema> => {
    const marginBankContract = this.getContract(this._marginBank, mbContract);
    let resp;
    if (this.useBiconomy) {
      resp = await withdrawFromMarginBankBiconomyCall(
        marginBankContract,
        this.MarginTokenPrecision,
        this.biconomy,
        this.getMarginBankBalance,
        this.getPublicAddress,
        amount
      );
    } else {
      resp = await withdrawFromMarginBankContractCall(
        marginBankContract,
        this.MarginTokenPrecision,
        this.getWallet(),
        this.maxBlockGasLimit,
        this.getMarginBankBalance,
        this.getPublicAddress,
        amount
      );
    }

    return resp;
  };

  /**
   * Gets balance of position open
   * @param symbol market symbol get information about
   * @param perpContract (address) address of Perpetual address comes in metaInfo
   * @returns balance of positions of given symbol
   */
  getAccountPositionBalance = async (
    symbol: MarketSymbol,
    perpContract?: address
  ) => {
    const contract = this.getContract(this._perpetual, perpContract, symbol);
    return contract
      .connect(this.getWallet())
      .getAccountBalance(this.getPublicAddress());
  };

  /**
   * Creates order signature and returns it. The signed order can be placed on exchange
   * @param params OrderSignatureRequest params needed to be signed
   * @returns OrderSignatureResponse with the payload signed on-chain along with order signature
   */
  createSignedOrder = async (
    params: OrderSignatureRequest
  ): Promise<OrderSignatureResponse> => {
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
      orderType: params.orderType,
    };
  };

  /**
   * Places a signed order on firefly exchange
   * @param params PlaceOrderRequest containing the signed order created using createSignedOrder
   * @returns PlaceOrderResponse containing status and data. If status is not 201, order placement failed.
   */
  placeSignedOrder = async (params: PlaceOrderRequest) => {
    const response = await this.apiService.post<PlaceOrderResponse>(
      SERVICE_URLS.ORDERS.ORDERS,
      {
        symbol: params.symbol,
        userAddress: this.getPublicAddress().toLocaleLowerCase(),
        orderType: params.orderType,
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
        clientId: params.clientId
          ? `firefly-client: ${params.clientId}`
          : "firefly-client",
      },
      { isAuthenticationRequired: true }
    );

    return response;
  };

  /**
   * Given an order payload, signs it on chain and submits to exchange for placement
   * @param params PostOrderRequest
   * @returns PlaceOrderResponse
   */
  postOrder = async (params: PostOrderRequest) => {
    const signedOrder = await this.createSignedOrder(params);
    const response = await this.placeSignedOrder({
      ...signedOrder,
      timeInForce: params.timeInForce,
      postOnly: params.postOnly,
      clientId: params.clientId,
    });

    return response;
  };

  /**
   * Verifies if the order
   * @param params
   * @returns boolean indicating if order signature is valid
   */
  verifyOrderSignature = (params: OrderSignatureResponse): boolean => {
    const signedOrder: SignedOrder = {
      isBuy: params.side === ORDER_SIDE.BUY,
      reduceOnly: params.reduceOnly,
      quantity: toBigNumber(params.quantity),
      price: toBigNumber(params.price),
      triggerPrice: toBigNumber(0),
      leverage: toBigNumber(params.leverage),
      maker: this.getPublicAddress().toLocaleLowerCase(),
      expiration: bigNumber(params.expiration),
      salt: bigNumber(params.salt),
      typedSignature: params.orderSignature,
    };

    const signer = this.orderSigners.get(params.symbol);
    if (!signer) {
      throw Error(
        `Provided Market Symbol(${params.symbol}) is not added to client library`
      );
    }

    return signer.orderHasValidSignature(signedOrder);
  };

  /**
   * Creates signature for cancelling orders
   * @param params OrderCancelSignatureRequest containing market symbol and order hashes to be cancelled
   * @returns generated signature string
   */
  createOrderCancellationSignature = async (
    params: OrderCancelSignatureRequest
  ): Promise<string> => {
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
  };

  /**
   * Posts to exchange for cancellation of provided orders
   * @param params OrderCancellationRequest containing order hashes to be cancelled and cancellation signature
   * @returns response from exchange server
   */
  placeCancelOrder = async (params: OrderCancellationRequest) => {
    const response = await this.apiService.delete<CancelOrderResponse>(
      SERVICE_URLS.ORDERS.ORDERS_HASH,
      {
        symbol: params.symbol,
        orderHashes: params.hashes,
        cancelSignature: params.signature,
      },
      { isAuthenticationRequired: true }
    );
    return response;
  };

  postCancelOrder = async (params: OrderCancelSignatureRequest) => {
    if (params.hashes.length <= 0) {
      throw Error(`No orders to cancel`);
    }
    const signature = await this.createOrderCancellationSignature(params);
    const response = await this.placeCancelOrder({
      ...params,
      signature,
    });
    return response;
  };

  /**
   * Cancels all open orders for a given market
   * @param symbol DOT-PERP, market symbol
   * @returns cancellation response
   */
  cancelAllOpenOrders = async (symbol: MarketSymbol) => {
    const openOrders = await this.getUserOrders({
      symbol,
      status: ORDER_STATUS.OPEN,
    });

    const hashes = (await openOrders.data?.map(
      (order) => order.hash
    )) as string[];

    const response = await this.postCancelOrder({ hashes, symbol });

    return response;
  };

  /**
   * Updates user's leverage to given leverage
   * @param symbol market symbol get information about
   * @param leverage new leverage you want to change to
   * @param perpetualAddress (address) address of Perpetual contract
   * @returns boolean indicating if leverage updated successfully
   */

  async adjustLeverage(
    symbol: MarketSymbol,
    leverage: number,
    perpetualAddress?: address
  ): Promise<ResponseSchema> {
    const userPosition = await this.getUserPosition({ symbol });
    if (!userPosition.data) {
      throw Error(`User positions data doesn't exist`);
    }

    const position = userPosition.data as any as GetPositionResponse;

    // if user position exists, make contract call to add or remove margin
    if (Object.keys(position).length > 0) {
      // TODO [BFLY-603]: this should be returned as array from dapi, remove this typecasting when done
      const perpContract = this.getContract(
        this._perpetual,
        perpetualAddress,
        symbol
      );

      let resp;
      if (this.useBiconomy) {
        resp = await adjustLeverageBiconomyCall(
          perpContract,
          leverage,
          this.biconomy,
          this.getPublicAddress
        );
      } else {
        resp = await adjustLeverageContractCall(
          perpContract,
          this.getWallet(),
          leverage,
          this.maxBlockGasLimit,
          this.getPublicAddress
        );
      }

      return resp;
    }
    const {
      ok,
      data,
      response: { errorCode, message },
    } = await this.updateLeverage({
      symbol,
      leverage,
    });
    const response: ResponseSchema = { ok, data, code: errorCode, message };
    return response;
  }

  /**
   * Gets Users default leverage.
   * @param symbol market symbol get information about
   * @returns user default leverage
   */
  getUserDefaultLeverage = async (symbol: MarketSymbol) => {
    const accData = await this.getUserAccountData();
    if (!accData.data) {
      throw Error(`Account data does not exist`);
    }
    const accDataByMarket = accData.data.accountDataByMarket.filter((data) => {
      return data.symbol === symbol;
    });
    /// found accountDataByMarket
    if (accDataByMarket && accDataByMarket.length > 0) {
      return bnStrToBaseNumber(accDataByMarket[0].selectedLeverage);
    }
    /// user is new and symbol data is not present in accountDataByMarket

    const exchangeInfo = await this.getExchangeInfo(symbol);
    if (!exchangeInfo.data) {
      throw Error(`Provided Market Symbol(${symbol}) does not exist`);
    }
    return bnStrToBaseNumber(exchangeInfo.data.defaultLeverage);
  };

  /**
   * Add or remove margin from the open position
   * @param symbol market symbol of the open position
   * @param operationType operation you want to perform `Add` | `Remove` margin
   * @param amount (number) amount user wants to add or remove from the position
   * @param perpetualAddress (address) address of Perpetual contract
   * @returns boolean value indicating if margin adjusted successfully
   */
  adjustMargin = async (
    symbol: MarketSymbol,
    operationType: ADJUST_MARGIN,
    amount: number,
    perpetualAddress?: string
  ): Promise<ResponseSchema> => {
    const perpContract = this.getContract(
      this._perpetual,
      perpetualAddress,
      symbol
    );
    let resp;
    if (this.useBiconomy) {
      resp = await adjustMarginBiconomyCall(
        operationType,
        perpContract,
        amount,
        this.biconomy,
        this.getPublicAddress
      );
    } else {
      resp = await adjustMarginContractCall(
        operationType,
        perpContract,
        this.getWallet(),
        amount,
        this.maxBlockGasLimit,
        this.getPublicAddress
      );
    }
    return resp;
  };

  /**
   * Gets Orders placed by the user. Returns the first 50 orders by default.
   * @param params of type OrderRequest,
   * @returns OrderResponse array
   */
  getUserOrders = async (params: GetOrderRequest) => {
    const response = await this.apiService.get<GetOrderResponse[]>(
      SERVICE_URLS.USER.ORDERS,
      {
        ...params,
      },
      { isAuthenticationRequired: true }
    );
    return response;
  };

  /**
   * Gets user open position. If the market is not specified then will return first 50 open positions for 50 markets.
   * @param params GetPositionRequest
   * @returns GetPositionResponse
   */
  getUserPosition = async (params: GetPositionRequest) => {
    const response = await this.apiService.get<GetPositionResponse[]>(
      SERVICE_URLS.USER.USER_POSITIONS,
      { ...params },
      { isAuthenticationRequired: true }
    );
    return response;
  };

  /**
   * Gets state of orderbook for provided market. At max top 50 bids/asks are retrievable
   * @param params GetOrdebookRequest
   * @returns GetOrderbookResponse
   */
  getOrderbook = async (params: GetOrderbookRequest) => {
    const response = await this.apiService.get<GetOrderBookResponse>(
      SERVICE_URLS.MARKET.ORDER_BOOK,
      params
    );

    return response;
  };

  /**
   * Gets user trades
   * @param params PlaceOrderResponse
   * @returns GetUserTradesResponse
   */
  getUserTrades = async (params: GetUserTradesRequest) => {
    const response = await this.apiService.get<GetUserTradesResponse>(
      SERVICE_URLS.USER.USER_TRADES,
      { ...params },
      { isAuthenticationRequired: true }
    );

    return response;
  };

  /**
   * Gets user Account Data
   * @returns GetAccountDataResponse
   */
  getUserAccountData = async () => {
    const response = await this.apiService.get<GetAccountDataResponse>(
      SERVICE_URLS.USER.ACCOUNT,
      {},
      { isAuthenticationRequired: true }
    );
    return response;
  };

  /**
   * Gets user transaction history
   * @param params GetTransactionHistoryRequest
   * @returns GetUserTransactionHistoryResponse
   */
  getUserTransactionHistory = async (params: GetTransactionHistoryRequest) => {
    const response = await this.apiService.get<
      GetUserTransactionHistoryResponse[]
    >(
      SERVICE_URLS.USER.USER_TRANSACTION_HISTORY,
      {
        ...params,
      },
      { isAuthenticationRequired: true }
    );
    return response;
  };

  /**
   * Gets market recent trades
   * @param params GetMarketRecentTradesRequest
   * @returns GetMarketRecentTradesResponse
   */
  getMarketRecentTrades = async (params: GetMarketRecentTradesRequest) => {
    const response = await this.apiService.get<GetMarketRecentTradesResponse>(
      SERVICE_URLS.MARKET.RECENT_TRADE,
      params
    );
    return response;
  };

  /**
   * Gets market candle stick data
   * @param params GetMarketRecentTradesRequest
   * @returns DAPIKlineResponse
   */
  getMarketCandleStickData = async (params: GetCandleStickRequest) => {
    const response = await this.apiService.get<DAPIKlineResponse>(
      SERVICE_URLS.MARKET.CANDLE_STICK_DATA,
      params
    );
    return response;
  };

  /**
   * Gets publically available market info about market(s)
   * @param symbol (optional) market symbol get information about, by default fetches info on all available markets
   * @returns ExchangeInfo or ExchangeInfo[] in case no market was provided as input
   */
  getExchangeInfo = async (symbol?: MarketSymbol) => {
    const response = await this.apiService.get<ExchangeInfo>(
      SERVICE_URLS.MARKET.EXCHANGE_INFO,
      { symbol }
    );
    return response;
  };

  /**
   * Gets MarketData data for market(s)
   * @param symbol (optional) market symbol get information about, by default fetches info on all available markets
   * @returns MarketData or MarketData[] in case no market was provided as input
   */
  getMarketData = async (symbol?: MarketSymbol) => {
    const response = await this.apiService.get<MarketData>(
      SERVICE_URLS.MARKET.MARKET_DATA,
      { symbol }
    );
    return response;
  };

  /**
   * Gets Meta data of the market(s)
   * @param symbol (optional) market symbol get information about, by default fetches info on all available markets
   * @returns MarketMeta or MarketMeta[] in case no market was provided as input
   */
  getMarketMetaInfo = async (symbol?: MarketSymbol) => {
    const response = await this.apiService.get<MarketMeta>(
      SERVICE_URLS.MARKET.META,
      { symbol }
    );
    return response;
  };

  /**
   * Gets the list of market symbols available on exchange
   * @returns array of strings representing MARKET SYMBOLS
   */
  getMarketSymbols = async () => {
    const response = await this.apiService.get<string[]>(
      SERVICE_URLS.MARKET.SYMBOLS
    );
    return response;
  };

  /**
   * Gets contract addresses of market
   * @param symbol (optional) market symbol get information about, by default fetches info on all available markets
   * @returns deployed contract addresses
   */
  getContractAddresses = async (symbol?: MarketSymbol) => {
    const response = await this.apiService.get<Record<string, object>>(
      SERVICE_URLS.MARKET.CONTRACT_ADDRESSES,
      { symbol }
    );
    return response;
  };

  /**
   * Gets status of the exchange
   * @returns StatusResponse
   */
  getExchangeStatus = async () => {
    const response = await this.apiService.get<StatusResponse>(
      SERVICE_URLS.MARKET.STATUS
    );
    return response;
  };

  /**
   * Returns the public address of account connected with the client
   * @returns string | address
   */
  getPublicAddress = (): address => {
    const address = this.wallet ? this.wallet.address : this.walletAddress;
    if (address === "") {
      throw Error(`Invalid user address`);
    }
    return address;
  };

  getWallet = (): Wallet | Signer => {
    const walletOrSigner: Signer | Wallet = this.wallet
      ? (this.wallet as Wallet)
      : (this.signer as Signer);
    if (!walletOrSigner) {
      throw Error(`Invalid Signer`);
    }
    return walletOrSigner;
  };

  getSigningMethod = () => {
    return this.wallet ? SigningMethod.Hash : this.signingMethod;
  };

  getOnboardSigningMethod = () => {
    return this.wallet ? SigningMethod.TypedData : this.signingMethod;
  };

  /**
   * Creates message to be signed, creates signature and authorize it from dapi
   * @returns auth token
   */
  userOnBoarding = async (token?: string) => {
    let userAuthToken = token;
    if (!userAuthToken) {
      // sign onboarding message
      const signature = await OnboardingSigner.createOnboardSignature(
        this.network.onboardingUrl,
        this.wallet ? this.wallet.privateKey : undefined,
        this.web3Provider
      );

      // authorize signature created by dAPI
      const authTokenResponse = await this.authorizeSignedHash(signature);

      if (!authTokenResponse.ok || !authTokenResponse.data) {
        throw Error(
          `Authorization error: ${authTokenResponse.response.message}`
        );
      }
      userAuthToken = authTokenResponse.data.token;
    }
    this.apiService.setAuthToken(userAuthToken);
    // TODO: remove this when all endpoints on frontend are integrated from client library
    return userAuthToken;
  };

  //= ==============================================================//
  //                    PRIVATE HELPER FUNCTIONS
  //= ==============================================================//

  /**
   * Private function to return a global(Test usdc Token / Margin Bank) contract
   * @param contract address of contract
   * @returns Contract | MarginBank or throws error
   */
  public getContract = (
    contractName: string,
    contract?: address,
    market?: MarketSymbol
  ):
    | Contract
    | contracts_exchange.MarginBank
    | contracts_exchange.IsolatedTrader => {
    // if a market name is provided and contract address is not provided

    contract = this.getContractAddressByName(contractName, contract, market);

    switch (contractName) {
      case this._perpetual:
        const perpFactory = new contracts_exchange.Perpetual__factory();
        const perp = perpFactory.attach(contract);
        return perp as any as contracts_exchange.Perpetual;
      case this._usdcToken:
        const dummyFactory = new contracts_exchange.DummyUSDC__factory();
        const dummyUSDC = dummyFactory.attach(contract);
        return dummyUSDC as any as contracts_exchange.DummyUSDC;
      case this._marginBank:
        const marginBankFactory = new contracts_exchange.MarginBank__factory();
        const marginBank = marginBankFactory.attach(contract);
        return marginBank as any as contracts_exchange.MarginBank;
      case this._isolatedTrader:
        const ordersFactory = new contracts_exchange.IsolatedTrader__factory();
        const orders = ordersFactory.attach(contract);
        return orders as any as contracts_exchange.IsolatedTrader;
      default:
        throw Error(`Unknown contract name received: ${contractName}`);
    }
  };

  public getContractAddressByName = (
    contractName: string,
    contract?: address,
    market?: MarketSymbol
  ): string => {
    if (market && !contract) {
      try {
        contract = this.contractAddresses[market][contractName];
      } catch (e) {
        contract = "";
      }
    }

    // if contract address is not provided and also market name is not provided
    if (!market && !contract) {
      try {
        contract =
          this.contractAddresses.auxiliaryContractsAddresses[contractName];
      } catch (e) {
        contract = "";
      }
    }

    if (contract === "" || contract === undefined) {
      throw Error(
        `Contract "${contractName}" not found in contract addresses for network id ${this.network.chainId}`
      );
    }

    return contract;
  };

  /**
   * Private function to create order payload that is to be signed on-chain
   * @param params OrderSignatureRequest
   * @returns Order
   */
  private createOrderToSign = (params: OrderSignatureRequest): Order => {
    const expiration = new Date();
    // MARKET ORDER - set expiration of 1 minute
    if (params.orderType === ORDER_TYPE.MARKET) {
      expiration.setMinutes(expiration.getMinutes() + 1);
    }
    // LIMIT ORDER - set expiration of 1 month
    else {
      expiration.setMonth(expiration.getMonth() + 1);
    }

    const salt =
      params.salt && bigNumber(params.salt).lt(bigNumber(2 ** 60))
        ? bigNumber(params.salt)
        : bigNumber(this.randomNumber(1_000));

    return {
      isBuy: params.side === ORDER_SIDE.BUY,
      price: toBigNumber(params.price),
      quantity: toBigNumber(params.quantity),
      leverage: toBigNumber(params.leverage || 1),
      maker: this.getPublicAddress().toLocaleLowerCase(),
      reduceOnly: params.reduceOnly || false,
      triggerPrice: toBigNumber(0),
      expiration: bigNumber(
        params.expiration || Math.floor(expiration.getTime() / 1000) // /1000 to convert time in seconds
      ),
      salt,
    } as Order;
  };

  /**
   * Posts signed Auth Hash to dAPI and gets token in return if signature is valid
   * @returns GetAuthHashResponse which contains auth hash to be signed
   */
  private authorizeSignedHash = async (signedHash: string) => {
    const response = await this.apiService.post<AuthorizeHashResponse>(
      SERVICE_URLS.USER.AUTHORIZE,
      {
        signature: signedHash,
        userAddress: this.getPublicAddress(),
        isTermAccepted: this.isTermAccepted,
      }
    );
    return response;
  };

  /**
   * Posts signed Auth Hash to dAPI and gets token in return if signature is valid
   * @returns GetAuthHashResponse which contains auth hash to be signed
   */
  private updateLeverage = async (params: {
    symbol: MarketSymbol;
    leverage: number;
  }) => {
    const response = await this.apiService.post<AdjustLeverageResponse>(
      SERVICE_URLS.USER.ADJUST_LEVERGAE,
      {
        symbol: params.symbol,
        address: this.getPublicAddress(),
        leverage: toBigNumberStr(params.leverage),
        marginType: MARGIN_TYPE.ISOLATED,
      },
      { isAuthenticationRequired: true }
    );
    return response;
  };

  private randomNumber = (multiplier: number) => {
    return Math.floor(
      (Date.now() + Math.random() + Math.random()) * multiplier
    );
  };
}
