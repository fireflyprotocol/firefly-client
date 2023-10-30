/* eslint-disable prettier/prettier */

import { AwsKmsSigner } from "ethers-aws-kms-signer";

import { Contract, ethers, providers, Signer, Wallet } from "ethers";

import {
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
  SignedOrder,
  Order,
  OrderSigner,
  contracts_exchange_boba,
  contracts_exchange_arbitrum,
  bnStrToBaseNumber,
  MARGIN_TYPE,
  bnToString,
  Web3,
  ADJUST_MARGIN,
  OnboardingSigner,
  NETWORK_NAME,
  mapContract,
  FactoryName,
  getFactory,
  toBigNumberStr,
  isStopOrder,
} from "@firefly-exchange/library";
import {
  adjustLeverageRequest,
  AdjustLeverageResponse,
  AuthorizeHashResponse,
  CancelOrderResponse,
  ExchangeInfo,
  GenerateReferralCodeRequest,
  GenerateReferralCodeResponse,
  GetAccountDataResponse,
  GetAffiliatePayoutsResponse,
  GetAffiliateRefereeCountResponse,
  GetAffiliateRefereeDetailsRequest,
  GetAffiliateRefereeDetailsResponse,
  GetCampaignDetailsResponse,
  GetCampaignRewardsResponse,
  GetCandleStickRequest,
  GetCountDownsResponse,
  GetFundingHistoryRequest,
  GetFundingRateResponse,
  GetMakerRewardDetailsRequest,
  GetMakerRewardDetailsResponse,
  GetMakerRewardsSummaryResponse,
  GetMarketRecentTradesRequest,
  GetMarketRecentTradesResponse,
  GetOrderbookRequest,
  GetOrderBookResponse,
  GetOrderByTypeRequest,
  GetOrderRequest,
  GetOrderResponse,
  GetPositionRequest,
  GetPositionResponse,
  GetReferrerInfoResponse,
  GetTotalHistoricalTradingRewardsResponse,
  GetTradeAndEarnRewardsDetailRequest,
  GetTradeAndEarnRewardsDetailResponse,
  GetTradeAndEarnRewardsOverviewResponse,
  GetTransactionHistoryRequest,
  GetTransferHistoryRequest,
  GetUserFundingHistoryResponse,
  GetUserRewardsHistoryRequest,
  GetUserRewardsHistoryResponse,
  GetUserRewardsSummaryResponse,
  GetUserTradesHistoryRequest,
  GetUserTradesHistoryResponse,
  GetUserTradesRequest,
  GetUserTradesResponse,
  GetUserTransactionHistoryResponse,
  GetUserTransferHistoryResponse,
  GetUserWhiteListStatusForMarkeMakerResponse,
  LinkReferredUserRequest,
  LinkReferredUserResponse,
  MarketData,
  MarketMeta,
  MasterInfo,
  OpenReferralDetails,
  OpenReferralOverview,
  OpenReferralPayoutList,
  OpenReferralRefereeDetails,
  OrderCancellationRequest,
  OrderCancelSignatureRequest,
  OrderSignatureRequest,
  OrderSignatureResponse,
  PlaceOrderRequest,
  PlaceOrderResponse,
  PostOrderRequest,
  PostTimerAttributes,
  PostTimerResponse,
  StatusResponse,
  TickerData,
  verifyDepositResponse,
} from "./interfaces/routes";

import { createTypedSignature } from "@firefly-exchange/library";

import { APIService } from "./exchange/apiService";
import { SERVICE_URLS } from "./exchange/apiUrls";
import {
  APIErrorMessages,
  ResponseSchema,
  VerificationStatus,
} from "./exchange/contractErrorHandling.service";
import { Sockets } from "./exchange/sockets";
import {
  ARBITRUM_NETWROK,
  ExtendedNetwork,
  EXTRA_FEES,
  Networks,
} from "./constants";
import {
  adjustLeverageContractCall,
  adjustMarginContractCall,
  approvalFromUSDCContractCall,
  depositToMarginBankContractCall,
  withdrawFromMarginBankContractCall,
  setSubAccount,
  closePositionCall,
} from "./exchange/contractService";
// @ts-ignore
import { generateRandomNumber } from "../utils/utils";
import { WebSockets } from "./exchange/WebSocket";

export class FireflyClient {
  protected readonly network: ExtendedNetwork;

  private web3: Web3;

  private wallet: Wallet | undefined;

  private orderSigners: Map<MarketSymbol, OrderSigner> = new Map();

  private apiService: APIService;

  public sockets: Sockets;
  public webSockets: WebSockets | undefined;
  public kmsSigner: AwsKmsSigner | undefined;

  public marketSymbols: string[] = []; // to save array market symbols [DOT-PERP, SOL-PERP]

  private walletAddress = ""; // to save user's public address when connecting from UI

  private signer: Signer | undefined; // to save signer when connecting from UI

  private web3Provider: any | undefined; // to save raw web3 provider when connecting from UI

  private signingMethod: SigningMethod = SigningMethod.MetaMaskLatest; // to save signing method when integrating on UI

  private contractAddresses: any;

  private isTermAccepted = false;

  private networkName = NETWORK_NAME.arbitrum; //arbitrum | boba

  private maxBlockGasLimit = 0;

  private maxSaltLimit = 2 ** 60;

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
   * @param _account accepts either privateKey or AWS-KMS-SIGNER object if user intend to sign using kms
   */
  constructor(
    _isTermAccepted: boolean,
    _network: ExtendedNetwork,
    _account?: string | AwsKmsSigner
  ) {
    this.network = _network;

    this.web3 = new Web3(_network.url);

    this.apiService = new APIService(this.network.apiGateway);

    this.sockets = new Sockets(this.network.socketURL);

    if (this.network.webSocketURL) {
      this.webSockets = new WebSockets(this.network.webSocketURL);
    }

    this.isTermAccepted = _isTermAccepted;

    //if input is string then its private key else it should be AwsKmsSigner object
    if (typeof _account == "string") {
      this.initializeWithPrivateKey(_account);
    } else if (_account instanceof AwsKmsSigner) {
      this.initializeWithKMS(_account);
    }
  }

  initializeWithKMS = async (awsKmsSigner: AwsKmsSigner): Promise<void> => {
    try {
      this.kmsSigner = awsKmsSigner;
      //fetching public address of the account
      this.walletAddress = await this.kmsSigner.getAddress();
    } catch (err) {
      console.log(err);
      throw Error("Failed to initialize KMS");
    }
  };

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
      new providers.StaticJsonRpcProvider(this.network.url)
    );
  };

  /***
   * Set UUID to api headers for colocation partners
   */
  setUUID = (uuid: string) => {
    this.apiService.setUUID(uuid);
  };

  /**
   * initializes contract addresses & onboards user
   */
  init = async (userOnboarding: boolean = true, apiToken: string = "") => {
    // get contract addresses
    const addresses = await this.getContractAddresses();
    if (!addresses.ok) {
      throw Error("Failed to fetch contract addresses");
    }

    this.contractAddresses = addresses.data;

    if (apiToken) {
      this.apiService.setAPIToken(apiToken);
      // for socket
      this.sockets.setAPIToken(apiToken);
      this.webSockets?.setAPIToken(apiToken);
    }
    // onboard user if not onboarded
    else if (userOnboarding) {
      await this.userOnBoarding();
    }

    if (this.network.UUID) {
      this.setUUID(this.network.UUID);
    }

    // fetch gas limit
    this.maxBlockGasLimit = (await this.web3.eth.getBlock("latest")).gasLimit;

    // check if Network is arbitrum
    this.networkName = this.network.url.includes(ARBITRUM_NETWROK)
      ? NETWORK_NAME.arbitrum
      : NETWORK_NAME.bobabeam;
  };

  setSubAccount = async (
    publicAddress: address,
    market: string,
    status: boolean
  ) => {
    const perpContract = this.getContract(this._perpetual, undefined, market);
    const resp = await setSubAccount(
      perpContract,
      publicAddress,
      status,
      this.getWallet(),
      this.maxBlockGasLimit,
      this.networkName
    );
    return resp;
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
   * @returns Number representing balance of user in USDC contract
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
   * @returns Number representing balance of user in Margin Bank contract
   */
  getMarginBankBalance = async (contract?: address): Promise<number> => {
    const marginBankContract = this.getContract(this._marginBank, contract);
    const mbContract = mapContract(
      this.networkName,
      FactoryName.marginBank,
      marginBankContract
    );

    const balance = await mbContract
      .connect(this.getWallet())
      .getAccountBankBalance(this.getPublicAddress());

    const balanceNumber = bnStrToBaseNumber(bnToString(balance.toHexString()));
    return Math.floor(balanceNumber * 1000000) / 1000000; // making balance returned always in 6 precision
  };

  /**
   * Faucet function, mints 10K USDC to wallet - Only works on Testnet
   * Assumes that the user wallet has native gas Tokens on Testnet
   * @param contract (optional) address of USDC contract
   * @returns Boolean true if user is funded, false otherwise
   */
  mintTestUSDC = async (contract?: address): Promise<boolean> => {
    if (this.network === Networks.PRODUCTION_ARBITRUM) {
      throw Error(`Function does not work on PRODUCTION`);
    }

    const amountString = toBigNumberStr(10000, this.MarginTokenPrecision);
    const contractAdd = this.getContract(this._usdcToken, contract);
    const tokenContract = (contractAdd as Contract).connect(this.getWallet());
    let gasLimit = this.maxBlockGasLimit;

    if (this.networkName == NETWORK_NAME.arbitrum) {
      gasLimit =
        +(await tokenContract.estimateGas.approve(
          this.getPublicAddress(),
          amountString
        )) + EXTRA_FEES;
    }

    // mint 10K usdc token
    await (
      await tokenContract.mint(this.getPublicAddress(), amountString, {
        gasLimit: gasLimit,
      })
    ).wait();

    return true;
  };

  /**
   * Returns Native token balance in user's account
   * @returns Number representing native token balance in account
   */
  getChainNativeBalance = async (): Promise<number> => {
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
   * @returns ResponseSchema
   */
  depositToMarginBank = async (
    amount: number,
    usdcContract?: address,
    mbContract?: address
  ): Promise<ResponseSchema> => {
    const tokenContract = this.getContract(this._usdcToken, usdcContract);
    const marginBankContract = this.getContract(this._marginBank, mbContract);

    return await depositToMarginBankContractCall(
      tokenContract,
      marginBankContract,
      amount,
      this.MarginTokenPrecision,
      this.getWallet(),
      this.maxBlockGasLimit,
      this.networkName,
      this.getPublicAddress
    );
  };

  /**
   * Approves margin to deposit form USDC contract
   * @param amount the number of usdc to approve
   * @param usdcContract (optional) address of usdc contract
   * @param mbContract (address) address of Margin Bank contract
   * @returns ResponseSchema
   */
  approvalFromUSDC = async (
    amount: number,
    usdcContract?: address,
    mbContract?: address
  ): Promise<ResponseSchema> => {
    const tokenContract = this.getContract(this._usdcToken, usdcContract);
    const marginBankContract = this.getContract(this._marginBank, mbContract);

    //verify the user address via chainalysis
    const apiResponse = await this.verifyDeposit(amount);
    if (apiResponse.status > 300) {
      const response = {
        ok: apiResponse.ok,
        data: apiResponse.response.data,
        message: apiResponse.response.message,
        code: apiResponse.status,
      };
      return response;
    }
    if (
      apiResponse.response.data.verificationStatus &&
      apiResponse.response.data.verificationStatus.toLowerCase() !=
        VerificationStatus.Success
    ) {
      apiResponse.ok = false;
      apiResponse.status = 5001;
      apiResponse.response.message = APIErrorMessages.restrictedUser;
      return this.apiService.transformAPItoResponseSchema(apiResponse);
    }
    // approve usdc contract to allow margin bank to take funds out for user's behalf
    return approvalFromUSDCContractCall(
      tokenContract,
      marginBankContract,
      amount,
      this.MarginTokenPrecision,
      this.getWallet(),
      this.maxBlockGasLimit,
      this.networkName
    );
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
    return await withdrawFromMarginBankContractCall(
      marginBankContract,
      this.MarginTokenPrecision,
      this.getWallet(),
      this.maxBlockGasLimit,
      this.networkName,
      this.getMarginBankBalance,
      this.getPublicAddress,
      amount
    );
  };

  /**
   * @notice Withdraw the number of margin tokens equal to the value of the account at the time
   *  perpetual was delisted. A position can only be closed once.
   * @param symbol market on which to close position
   * @param perpContract (optional) address of perpetual contract
   * @returns boolean true if position is closed, false otherwise
   */
  closePosition = async (
    symbol: string,
    perpContract?: address
  ): Promise<ResponseSchema> => {
    const contract = this.getContract(this._perpetual, perpContract, symbol);

    return await closePositionCall(
      contract,
      this.getWallet(),
      this.maxBlockGasLimit,
      this.networkName,
      this.getPublicAddress
    );
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
    const order = this.createOrderToSign(params, params.maker);

    const signer = this.orderSigners.get(params.symbol);
    if (!signer) {
      throw Error(
        `Provided Market Symbol(${params.symbol}) is not added to client library`
      );
    }
    let orderSignature: string;

    if (this.kmsSigner !== undefined) {
      const orderHash = signer.getOrderHash(order);

      /*
      For every orderHash sent to etherium etherium will hash it and wrap
      it with "\\x19Ethereum Signed Message:\\n" + message.length + message
      Hence for that we have to hash it again.
      */
      const orderEthHash = this.web3.eth.accounts.hashMessage(orderHash);
      const signedMessage = await this.kmsSigner._signDigest(orderEthHash);

      // This just adds 01 at the end of the message if we pass 1
      orderSignature = createTypedSignature(signedMessage, 1);
    } else {
      orderSignature = await (signer as OrderSigner).signOrder(
        order,
        this.getSigningMethod(),
        this.getPublicAddress()
      );
    }

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
      maker: params.maker
        ? params.maker
        : this.getPublicAddress().toLocaleLowerCase(),
      triggerPrice: isStopOrder(params.orderType) ? params.triggerPrice : 0,
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
        userAddress: params.maker,
        orderType: params.orderType,
        price: toBigNumberStr(params.price),
        triggerPrice: toBigNumberStr(params.triggerPrice || "0"),
        quantity: toBigNumberStr(params.quantity),
        leverage: toBigNumberStr(params.leverage),
        side: params.side,
        reduceOnly: params.reduceOnly,
        salt: params.salt,
        expiration: params.expiration,
        orderSignature: params.orderSignature,
        timeInForce: params.timeInForce || TIME_IN_FORCE.GOOD_TILL_TIME,
        postOnly: params.postOnly == true,
        cancelOnRevert: params.cancelOnRevert == true,
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
      cancelOnRevert: params.cancelOnRevert,
      clientId: params.clientId,
    });

    return response;
  };

  /**
   * Verifies if the order
   * @param params OrderSignatureResponse
   * @returns boolean indicating if order signature is valid
   */
  verifyOrderSignature = (params: OrderSignatureResponse): boolean => {
    const signedOrder: SignedOrder = {
      isBuy: params.side === ORDER_SIDE.BUY,
      reduceOnly: params.reduceOnly,
      quantity: toBigNumber(params.quantity),
      price: toBigNumber(params.price),
      triggerPrice: isStopOrder(params.orderType)
        ? toBigNumber(params.triggerPrice || "0")
        : toBigNumber(0),
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
   * Posts to exchange for cancellation of provided orders with signature
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
        parentAddress: params.parentAddress,
      },
      { isAuthenticationRequired: true }
    );
    return response;
  };

  /**
   * Creates signature and posts order for cancellation on exchange of provided orders
   * @param params OrderCancelSignatureRequest containing order hashes to be cancelled
   * @returns response from exchange server
   */
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
  cancelAllOpenOrders = async (
    symbol: MarketSymbol,
    parentAddress?: string
  ) => {
    const openOrders = await this.getUserOrders({
      symbol,
      statuses: [
        ORDER_STATUS.OPEN,
        ORDER_STATUS.PARTIAL_FILLED,
        ORDER_STATUS.PENDING,
      ],
      parentAddress,
    });

    const hashes = openOrders.data?.map((order) => order.hash) as string[];

    const response = await this.postCancelOrder({
      hashes,
      symbol,
      parentAddress,
    });

    return response;
  };

  /**
   * Updates user's leverage to given leverage
   * @param symbol market symbol get information about
   * @param leverage new leverage you want to change to
   * @param perpetualAddress (address) address of Perpetual contract
   * @returns ResponseSchema
   */
  adjustLeverage = async (
    params: adjustLeverageRequest
  ): Promise<ResponseSchema> => {
    const userPosition = await this.getUserPosition({
      symbol: params.symbol,
      parentAddress: params.parentAddress,
    });
    if (!userPosition.data) {
      throw Error(`User positions data doesn't exist`);
    }

    const position = userPosition.data as any as GetPositionResponse;

    // if user position exists, make contract call
    if (Object.keys(position).length > 0) {
      // TODO [BFLY-603]: this should be returned as array from dapi, remove this typecasting when done
      const perpContract = this.getContract(
        this._perpetual,
        params.perpetualAddress,
        params.symbol
      );

      return await adjustLeverageContractCall(
        perpContract,
        this.getWallet(),
        params.leverage,
        this.maxBlockGasLimit,
        this.networkName,
        params.parentAddress
          ? () => {
              return params.parentAddress!;
            }
          : this.getPublicAddress
      );
    }
    // call API to update leverage
    const {
      ok,
      data,
      response: { errorCode, message },
    } = await this.updateLeverage({
      symbol: params.symbol,
      leverage: params.leverage,
      parentAddress: params.parentAddress,
    });
    const response: ResponseSchema = { ok, data, code: errorCode, message };
    return response;
  };

  /**
   * Gets Users default leverage.
   * @param symbol market symbol get information about
   * @returns user default leverage
   */
  getUserDefaultLeverage = async (
    symbol: MarketSymbol,
    parentAddress?: string
  ) => {
    const accData = await this.getUserAccountData(parentAddress);
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
   * @returns ResponseSchema
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

    return await adjustMarginContractCall(
      operationType,
      perpContract,
      this.getWallet(),
      amount,
      this.maxBlockGasLimit,
      this.networkName,
      this.getPublicAddress
    );
  };

  /**
   * Generate and receive readOnlyToken, this can only be accessed at the time of generation
   * @returns readOnlyToken string
   */
  generateReadOnlyToken = async () => {
    const response = await this.apiService.post<string>(
      SERVICE_URLS.USER.GENERATE_READONLY_TOKEN,
      {},
      { isAuthenticationRequired: true }
    );
    return response;
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
   * Gets Orders by type and statuses. Returns the first 50 orders by default.
   * @param params of type OrderByTypeRequest,
   * @returns OrderResponse array
   */
  getUserOrdersByType = async (params: GetOrderByTypeRequest) => {
    const response = await this.apiService.get<GetOrderResponse[]>(
      SERVICE_URLS.USER.ORDERS_BY_TYPE,
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
   * Gets user trades
   * @param params PlaceOrderResponse
   * @returns GetUserTradesHistoryResponse
   */
  getUserTradesHistory = async (params: GetUserTradesHistoryRequest) => {
    const response = await this.apiService.get<GetUserTradesHistoryResponse>(
      SERVICE_URLS.USER.USER_TRADES_HISTORY,
      { ...params },
      { isAuthenticationRequired: true }
    );

    return response;
  };

  /**
   * Gets user Account Data
   * @returns GetAccountDataResponse
   */
  getUserAccountData = async (parentAddress?: string) => {
    const response = await this.apiService.get<GetAccountDataResponse>(
      SERVICE_URLS.USER.ACCOUNT,
      { parentAddress },
      { isAuthenticationRequired: true }
    );
    return response;
  };

  /**
   * Gets verification status of user account
   * @param amount deposit amount
   * @returns verification status of user
   */
  verifyDeposit = async (amount: number) => {
    const response = await this.apiService.get<verifyDepositResponse>(
      SERVICE_URLS.USER.VERIFY_DEPOSIT,
      { depositAmount: amount },
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
   * Gets user funding history
   * @param params GetFundingHistoryRequest
   * @returns GetUserTransactionHistoryResponse
   */
  getUserFundingHistory = async (params: GetFundingHistoryRequest) => {
    const response = await this.apiService.get<GetUserFundingHistoryResponse>(
      SERVICE_URLS.USER.FUNDING_HISTORY,
      {
        ...params,
      },
      { isAuthenticationRequired: true }
    );
    return response;
  };

  /**
   * Gets user transfer history
   * @param params GetTransferHistoryRequest
   * @returns GetUserTransferHistoryResponse
   */
  getUserTransferHistory = async (params: GetTransferHistoryRequest) => {
    const response = await this.apiService.get<GetUserTransferHistoryResponse>(
      SERVICE_URLS.USER.TRANSFER_HISTORY,
      {
        ...params,
      },
      { isAuthenticationRequired: true }
    );
    return response;
  };

  /**
   * Gets market funding rate
   * @param symbol market symbol to fetch funding rate of
   * @returns GetFundingRateResponse
   */
  getMarketFundingRate = async (symbol: MarketSymbol) => {
    const response = await this.apiService.get<GetFundingRateResponse>(
      SERVICE_URLS.MARKET.FUNDING_RATE,
      {
        symbol,
      }
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
   * Gets Master Info of the market(s)
   * @param symbol (optional) market symbol get information about, by default fetches info on all available markets
   * @returns MasterInfo
   */
  getMasterInfo = async (symbol?: MarketSymbol) => {
    const response = await this.apiService.get<MasterInfo>(
      SERVICE_URLS.MARKET.MASTER_INFO,
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
   * Gets ticker data of any market
   * @param symbol market symbol to get information about, if not provided fetches data of all markets
   * @returns TickerData
   */
  getTickerData = async (symbol?: MarketSymbol) => {
    const response = await this.apiService.get<TickerData>(
      SERVICE_URLS.MARKET.TICKER,
      { symbol }
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

  /**
   * Creates message to be signed, creates signature and authorize it from dapi
   * @returns auth token
   */
  userOnBoarding = async (token?: string) => {
    let userAuthToken = token;
    if (!userAuthToken) {
      let signature: string;

      if (this.kmsSigner !== undefined) {
        const hashedMessageSHA = this.web3.utils.sha3(
          this.network.onboardingUrl
        );
        /*
          For every orderHash sent to etherium etherium will hash it and wrap
          it with "\\x19Ethereum Signed Message:\\n" + message.length + message
          Hence for that we have to hash it again.
        */
        //@ts-ignore
        const hashedMessageETH =
          this.web3.eth.accounts.hashMessage(hashedMessageSHA);
        signature = await this.kmsSigner._signDigest(hashedMessageETH);
      } else {
        // sign onboarding message
        signature = await OnboardingSigner.createOnboardSignature(
          this.network.onboardingUrl,
          this.wallet ? this.wallet.privateKey : undefined,
          this.web3Provider
        );
      }
      // authorize signature created by dAPI
      const authTokenResponse = await this.authorizeSignedHash(signature);

      if (!authTokenResponse.ok || !authTokenResponse.data) {
        throw Error(
          `Authorization error: ${authTokenResponse.response.message}`
        );
      }
      userAuthToken = authTokenResponse.data.token;
    }
    // for api
    this.apiService.setAuthToken(userAuthToken);
    // this.apiService.setWalletAddress(this.getPublicAddress());
    // for socket
    this.sockets.setAuthToken(userAuthToken);
    this.webSockets?.setAuthToken(userAuthToken);
    // TODO: remove this when all endpoints on frontend are integrated from client library
    return userAuthToken;
  };

  /**
   * Reset timer for cancel on disconnect for open orders
   * @param params PostTimerAttributes containing the countdowns of all markets
   * @returns PostTimerResponse containing accepted and failed countdowns. If status is not 201, request wasn't successful.
   */
  resetCancelOnDisconnectTimer = async (params: PostTimerAttributes) => {
    const response = await this.apiService.post<PostTimerResponse>(
      SERVICE_URLS.USER.CANCEL_ON_DISCONNECT,
      params,
      { isAuthenticationRequired: true },
      this.network.dmsURL
    );
    if (response.status == 503) {
      throw Error(
        `Cancel on Disconnect (dead-mans-switch) feature is currently unavailable`
      );
    }
    return response;
  };

  /**
   * Gets user Cancel on Disconnect timer
   * @returns GetCountDownsResponse
   */
  getCancelOnDisconnectTimer = async (
    symbol?: string,
    parentAddress?: string
  ) => {
    const response = await this.apiService.get<GetCountDownsResponse>(
      SERVICE_URLS.USER.CANCEL_ON_DISCONNECT,
      {
        parentAddress,
        symbol,
      },
      { isAuthenticationRequired: true },
      this.network.dmsURL
    );
    if (response.status == 503) {
      throw Error(
        `Cancel on Disconnect (dead-mans-switch) feature is currently unavailable`
      );
    }
    return response;
  };

  /**
   * Generates referral code
   * @param params GenerateReferralCodeRequest
   * @returns GenerateReferralCodeResponse
   */
  generateReferralCode = async (params: GenerateReferralCodeRequest) => {
    const response = await this.apiService.post<GenerateReferralCodeResponse>(
      SERVICE_URLS.GROWTH.GENERATE_CODE,
      params,
      { isAuthenticationRequired: true }
    );
    return response;
  };

  /**
   * Links referred user
   * @param params LinkReferredUserRequest
   * @returns LinkReferredUserResponse
   */
  linkReferredUser = async (params: LinkReferredUserRequest) => {
    const response = await this.apiService.post<LinkReferredUserResponse>(
      SERVICE_URLS.GROWTH.LINK_REFERRED_USER,
      params,
      { isAuthenticationRequired: true }
    );
    return response;
  };

  /**
   * Gets referrer Info
   * @param campaignId
   * @returns GetReferrerInfoResponse
   */
  getReferrerInfo = async (campaignId: number) => {
    const response = await this.apiService.get<GetReferrerInfoResponse>(
      SERVICE_URLS.GROWTH.REFERRER_INFO,
      { campaignId },
      { isAuthenticationRequired: true }
    );
    return response;
  };

  /**
   * Gets campaign details
   * @returns Array of GetCampaignDetailsResponse
   */
  getCampaignDetails = async () => {
    const response = await this.apiService.get<GetCampaignDetailsResponse[]>(
      SERVICE_URLS.GROWTH.CAMPAIGN_DETAILS
    );
    return response;
  };

  /**
   * Gets campaign reward details
   * @param campaignId
   * @returns GetCampaignRewardsResponse
   */
  getCampaignRewards = async (campaignId: number) => {
    const response = await this.apiService.get<GetCampaignRewardsResponse>(
      SERVICE_URLS.GROWTH.CAMPAIGN_REWARDS,
      { campaignId },
      { isAuthenticationRequired: true }
    );
    return response;
  };

  //Open referral Program
  getOpenReferralRefereeDetails = async (payload: {
    cursor: string;
    pageSize: number;
  }) => {
    const response = await this.apiService.get<{
      data: OpenReferralRefereeDetails;
      nextCursor: string;
      isMoreDataAvailable: boolean;
    }>(SERVICE_URLS.GROWTH.OPEN_REFERRAL_REFEREE_DETAILS, payload, {
      isAuthenticationRequired: true,
    });
    return response;
  };

  getOpenReferralDetails = async (payload: { campaignId: number }) => {
    const response = await this.apiService.get<OpenReferralDetails>(
      SERVICE_URLS.GROWTH.OPEN_REFERRAL_REFEREES_COUNT,
      payload,
      { isAuthenticationRequired: true }
    );
    return response;
  };

  getOpenReferralPayouts = async (payload: {
    cursor: string;
    pageSize: number;
  }) => {
    const response = await this.apiService.get<{
      data: OpenReferralPayoutList;
      nextCursor: string;
      isMoreDataAvailable: boolean;
    }>(SERVICE_URLS.GROWTH.OPEN_REFERRAL_PAYOUTS, payload, {
      isAuthenticationRequired: true,
    });
    return response;
  };

  generateOpenReferralReferralCode = async (payload: {
    campaignId: string;
  }) => {
    const response = await this.apiService.post<{
      referralAddress: string;
      referralCode: string;
      message: string;
    }>(SERVICE_URLS.GROWTH.OPEN_REFERRAL_GENERATE_CODE, payload, {
      isAuthenticationRequired: true,
    });
    return response;
  };

  getOpenReferralOverview = async () => {
    const response = await this.apiService.get<OpenReferralOverview>(
      SERVICE_URLS.GROWTH.OPEN_REFERRAL_OVERVIEW,
      undefined,
      {
        isAuthenticationRequired: true,
      }
    );
    return response;
  };

  openReferralLinkReferredUser = async (payload: { referralCode: string }) => {
    const response = await this.apiService.post(
      SERVICE_URLS.GROWTH.OPEN_REFERRAL_LINK_REFERRED_USER,
      payload,
      {
        isAuthenticationRequired: true,
      }
    );
    return response;
  };

  //Open referral Program

  /**
   * Gets affiliate payout details
   * @param campaignId
   * @returns Array of GetAffiliatePayoutsResponse
   */
  getAffiliatePayouts = async (campaignId: number) => {
    const response = await this.apiService.get<GetAffiliatePayoutsResponse[]>(
      SERVICE_URLS.GROWTH.AFFILIATE_PAYOUTS,
      { campaignId },
      { isAuthenticationRequired: true }
    );
    return response;
  };

  /**
   * Gets affiliate referree details
   * @param GetAffiliateRefereeDetailsRequest
   * @returns GetAffiliateRefereeDetailsResponse
   */
  getAffiliateRefereeDetails = async (
    params: GetAffiliateRefereeDetailsRequest
  ) => {
    const response =
      await this.apiService.get<GetAffiliateRefereeDetailsResponse>(
        SERVICE_URLS.GROWTH.AFFILIATE_REFEREE_DETAILS,
        params,
        { isAuthenticationRequired: true }
      );
    return response;
  };

  /**
   * Gets affiliate referree count
   * @param campaignId
   * @returns GetAffiliateRefereeCountResponse
   */
  getAffiliateRefereeCount = async (campaignId: number) => {
    const response =
      await this.apiService.get<GetAffiliateRefereeCountResponse>(
        SERVICE_URLS.GROWTH.GROWTH_REFEREES_COUNT,
        { campaignId },
        { isAuthenticationRequired: true }
      );
    return response;
  };

  /**
   * Gets user rewards history
   * @param optional params GetUserRewardsHistoryRequest
   * @returns GetUserRewardsHistoryResponse
   */
  getUserRewardsHistory = async (params?: GetUserRewardsHistoryRequest) => {
    const response = await this.apiService.get<GetUserRewardsHistoryResponse>(
      SERVICE_URLS.GROWTH.USER_REWARDS_HISTORY,
      params,
      { isAuthenticationRequired: true }
    );
    return response;
  };

  /**
   * Gets user rewards summary
   * @returns GetUserRewardsSummaryResponse
   */
  getUserRewardsSummary = async () => {
    const response = await this.apiService.get<GetUserRewardsSummaryResponse>(
      SERVICE_URLS.GROWTH.USER_REWARDS_SUMMARY,
      {},
      { isAuthenticationRequired: true }
    );
    return response;
  };

  /**
   * Gets rewards overview
   * @param campaignId
   * @returns GetTradeAndEarnRewardsOverviewResponse
   */
  getTradeAndEarnRewardsOverview = async (campaignId: number) => {
    const response =
      await this.apiService.get<GetTradeAndEarnRewardsOverviewResponse>(
        SERVICE_URLS.GROWTH.REWARDS_OVERVIEW,
        { campaignId },
        { isAuthenticationRequired: true }
      );
    return response;
  };

  /**
   * Gets rewards details
   * @param GetTradeAndEarnRewardsDetailRequest
   * @returns GetTradeAndEarnRewardsDetailResponse
   */
  getTradeAndEarnRewardsDetail = async (
    params: GetTradeAndEarnRewardsDetailRequest
  ) => {
    const response =
      await this.apiService.get<GetTradeAndEarnRewardsDetailResponse>(
        SERVICE_URLS.GROWTH.REWARDS_DETAILS,
        params,
        { isAuthenticationRequired: true }
      );
    return response;
  };

  /**
   * Gets total historical trading reward details
   * @returns GetTotalHistoricalTradingRewardsResponse
   */
  getTotalHistoricalTradingRewards = async () => {
    const response =
      await this.apiService.get<GetTotalHistoricalTradingRewardsResponse>(
        SERVICE_URLS.GROWTH.TOTAL_HISTORICAL_TRADING_REWARDS,
        {},
        { isAuthenticationRequired: true }
      );
    return response;
  };

  /**
   * Gets maker rewards summary
   * @returns GetMakerRewardsSummaryResponse
   */
  getMakerRewardsSummary = async () => {
    const response = await this.apiService.get<GetMakerRewardsSummaryResponse>(
      SERVICE_URLS.GROWTH.MAKER_REWARDS_SUMMARY,
      {},
      { isAuthenticationRequired: true }
    );
    return response;
  };

  /**
   * Gets maker reward details
   * @param GetMakerRewardDetailsRequest
   * @returns GetMakerRewardDetailsResponse
   */
  getMakerRewardDetails = async (params: GetMakerRewardDetailsRequest) => {
    const response = await this.apiService.get<GetMakerRewardDetailsResponse>(
      SERVICE_URLS.GROWTH.MAKER_REWARDS_DETAILS,
      params,
      { isAuthenticationRequired: true }
    );
    return response;
  };

  /**
   * Gets market maker whitelist status
   * @returns GetUserWhiteListStatusForMarkeMaker
   */
  getUserWhiteListStatusForMarketMaker = async () => {
    const response =
      await this.apiService.get<GetUserWhiteListStatusForMarkeMakerResponse>(
        SERVICE_URLS.GROWTH.MAKER_WHITELIST_STATUS,
        {},
        { isAuthenticationRequired: true }
      );
    return response;
  };

  //= ==============================================================//
  //                    PRIVATE HELPER FUNCTIONS
  //= ==============================================================//
  /**
   * Checks if Firefly client was initialized with Private Key or Web3Provider and returns respective signer
   * @returns Wallet if initialized with private key else signer object
   */
  private getWallet = (): Wallet | Signer => {
    const walletOrSigner: Signer | Wallet = this.wallet
      ? (this.wallet as Wallet)
      : (this.signer as Signer);
    if (!walletOrSigner) {
      throw Error(`Invalid Signer`);
    }
    return walletOrSigner;
  };

  /**
   * Checks if Firefly client was initialized with Private Key or Web3Provider and returns respective signing method
   * @returns Signing Method
   */
  private getSigningMethod = () => {
    return this.wallet ? SigningMethod.Hash : this.signingMethod;
  };

  /**
   * Private function to get the contract address of given contract name mapped with respective factory
   * @param contractName name of the contract eg: `Perpetual`, `USDC` etc
   * @param contract address of contract
   * @param market name of the specific market to get address for
   * @returns Contract | MarginBank | IsolatedTrader or throws error
   */
  private getContract = (
    contractName: string,
    contract?: address,
    market?: MarketSymbol
  ):
    | Contract
    | contracts_exchange_arbitrum.MarginBank
    | contracts_exchange_boba.MarginBank
    | contracts_exchange_arbitrum.IsolatedTrader
    | contracts_exchange_boba.IsolatedTrader
    | contracts_exchange_arbitrum.Perpetual
    | contracts_exchange_boba.Perpetual
    | contracts_exchange_arbitrum.DummyUSDC
    | contracts_exchange_boba.DummyUSDC => {
    contract = this.getContractAddressByName(contractName, contract, market);
    switch (contractName) {
      case this._perpetual:
        const Perpetual__factory = getFactory(
          this.networkName,
          FactoryName.perpetual
        )!;
        const perpFactory = new Perpetual__factory();
        const perp = perpFactory.attach(contract);
        return mapContract(this.networkName, FactoryName.perpetual, perp);
      case this._usdcToken:
        const DummyUSDC__factory = getFactory(
          this.networkName,
          FactoryName.dummyUsdc
        )!;
        const dummyFactory = new DummyUSDC__factory();
        const dummyUSDC = dummyFactory.attach(contract);
        return mapContract(this.networkName, FactoryName.dummyUsdc, dummyUSDC);
      case this._marginBank:
        const MarginBank__factory = getFactory(
          this.networkName,
          FactoryName.marginBank
        )!;
        const marginBankFactory = new MarginBank__factory();
        const marginBank = marginBankFactory.attach(contract);
        return mapContract(
          this.networkName,
          FactoryName.marginBank,
          marginBank
        );
      case this._isolatedTrader:
        const IsolatedTrader__factory = getFactory(
          this.networkName,
          FactoryName.isolatedTrader
        )!;
        const ordersFactory = new IsolatedTrader__factory();
        const orders = ordersFactory.attach(contract);
        return mapContract(
          this.networkName,
          FactoryName.isolatedTrader,
          orders
        );
      default:
        throw Error(`Unknown contract name received: ${contractName}`);
    }
  };

  /**
   * Gets the contract address of provided name
   * @param contractName name of the contract eg: `Perpetual`, `USDC` etc
   * @param contract address of contract
   * @param market name of the specific market to get address for
   * @returns contract address of given name
   */
  private getContractAddressByName = (
    contractName: string,
    contract?: address,
    market?: MarketSymbol
  ): string => {
    // if a market name is provided and contract address is not provided
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
  private createOrderToSign = (
    params: OrderSignatureRequest,
    parentAddress?: address
  ): Order => {
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
      params.salt && bigNumber(params.salt).lt(bigNumber(this.maxSaltLimit))
        ? bigNumber(params.salt)
        : bigNumber(generateRandomNumber(1_000));

    return {
      isBuy: params.side === ORDER_SIDE.BUY,
      price: toBigNumber(params.price),
      quantity: toBigNumber(params.quantity),
      leverage: toBigNumber(params.leverage || 1),
      maker: parentAddress
        ? parentAddress
        : this.getPublicAddress().toLocaleLowerCase(),
      reduceOnly: params.reduceOnly == true,
      triggerPrice: isStopOrder(params.orderType)
        ? toBigNumber(params.triggerPrice || "0")
        : toBigNumber(0),
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
  private updateLeverage = async (params: adjustLeverageRequest) => {
    const response = await this.apiService.post<AdjustLeverageResponse>(
      SERVICE_URLS.USER.ADJUST_LEVERGAE,
      {
        symbol: params.symbol,
        address: params.parentAddress
          ? params.parentAddress
          : this.getPublicAddress(),
        leverage: toBigNumberStr(params.leverage),
        marginType: MARGIN_TYPE.ISOLATED,
      },
      { isAuthenticationRequired: true }
    );
    return response;
  };
}
