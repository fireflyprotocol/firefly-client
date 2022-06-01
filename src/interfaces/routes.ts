import {
  MarketSymbol,
  ORDER_STATUS,
  ORDER_SIDE,
  TIME_IN_FORCE,
  MARGIN_TYPE,
  ORDER_TYPE,
  address,
  CANCEL_REASON,
  MARKET_STATUS,
  Interval,
} from "../types";

export interface GetOrderResponse {
  id: number;
  clientId: string;
  symbol: MarketSymbol;
  userAddress: address;
  hash: string;

  price: string;
  quantity: string;
  filledQty: string;
  avgFillPrice: string;
  leverage: string;
  fee: string;
  side: ORDER_SIDE;
  reduceOnly: false;
  orderType: ORDER_TYPE;
  timeInForce: TIME_IN_FORCE;
  orderStatus: ORDER_STATUS;
  cancelReason: CANCEL_REASON;
  postOnly: boolean;

  salt: number;
  expiration: number;
  updatedAt: number;
  createdAt: number;

  cancelling?: boolean;
}

export interface GetTransactionHistoryRequest {
  symbol?: MarketSymbol; // will fetch orders of provided market
  pageSize?: number; // will get only provided number of orders must be <= 50
  pageNumber?: number; // will fetch particular page records. A single page contains 50 records.
}

export interface GetOrderRequest extends GetTransactionHistoryRequest {
  statuses: ORDER_STATUS; // status of orders to be fetched
}

export interface GetPositionRequest extends GetTransactionHistoryRequest {}

export interface RequiredOrderFields {
  symbol: MarketSymbol; // market for which to create order
  price: number; // price at which to place order. Will be zero for a market order
  quantity: number; // quantity/size of order
  side: ORDER_SIDE; // BUY/SELL
}

export interface OrderSignatureRequest extends RequiredOrderFields {
  leverage?: number; // leverage to take, default is 1
  reduceOnly?: boolean; // is order to be reduce only true/false, default its false
  salt?: number; // random number for uniqueness of order. Generated randomly if not provided
  expiration?: number; // time at which order will expire. Will be set to 1 month if not provided
}

export interface OrderSignatureResponse extends RequiredOrderFields {
  leverage: number;
  reduceOnly: boolean;
  salt: number;
  expiration: number;
  orderSignature: string;
}

export interface PlaceOrderRequest extends OrderSignatureResponse {
  timeInForce?: TIME_IN_FORCE; // GTC/FOK/IOC by default all orders are GTC
  postOnly?: boolean; // true/false, default is true
}

export interface PostOrderRequest extends OrderSignatureRequest {
  timeInForce?: TIME_IN_FORCE;
  postOnly?: boolean;
}

export type PlaceOrderResponse = {
  id: number;
  clientId: string;
  requestTime: number;
  cancelReason: string;
  orderStatus: ORDER_STATUS;
  hash: string;
  symbol: MarketSymbol;
  orderType: ORDER_TYPE;
  timeInForce: TIME_IN_FORCE;
  userAddress: string;
  side: ORDER_SIDE;
  price: string;
  quantity: string;
  leverage: string;
  reduceOnly: true;
  expiration: number;
  salt: number;
  orderSignature: string;
  filledQty: string;
  avgFillPrice: string;
  amountLeft: string;
  makerFee: string;
  takerFee: string;
  createdAt: number;
  updatedAt: number;
};

export interface OrderCancelSignatureRequest {
  symbol: MarketSymbol;
  hashes: string[];
}

export interface OrderCancellationRequest extends OrderCancelSignatureRequest {
  signature: string;
}

export interface GetOrderbookRequest {
  symbol: MarketSymbol;
  limit: number; // number of bids/asks to retrieve, should be <= 50
}

export interface GetPositionResponse {
  userAddress: address;
  symbol: MarketSymbol;
  marketAddress: string;
  marginType: MARGIN_TYPE;

  side: ORDER_SIDE;
  avgEntryPrice: string;
  quantity: string;
  margin: string;
  leverage: string;
  positionSelectedLeverage: string;
  liquidationPrice: string;
  positionValue: string;
  unrealizedProfit: string;
  unrealizedProfitPercent: string;

  midMarketPrice: string;
  indexPrice: string;

  createdTime: string;
  updateTime: string;

  closing?: boolean;
  closingType?: ORDER_TYPE;
}

export interface GetOrderBookResponse {
  asks: string[][];
  bids: string[][];
  highestBid: string;
  lowestAsk: string;
  midPrice: string;
  symbol: MarketSymbol;
  loading?: boolean;
  lastUpdatedAt: number;
  orderbookUpdateId: number;
  responseSentAt: number;
  limit?: number;
}

export interface GetUserTradesRequest {
  symbol?: MarketSymbol;
  maker?: boolean;
  fromId?: number;
  startTime?: number;
  endTime?: number;
  pageSize?: number;
  pageNumber?: number;
  type?: ORDER_TYPE;
}

export interface GetUserTradesResponse {
  id: number;
  symbol: MarketSymbol;
  commission: string;
  commissionAsset: string;
  maker: boolean;
  side: ORDER_SIDE;
  price: string;
  quantity: string;
  quoteQty: string;
  realizedPnl: string;
  time: number;
}

export interface MarketAccountData {
  symbol: MarketSymbol;
  openOrderMargin: string;
  reducingOpenOrderMargin: string;
  positionQtyReduced: string;
  positionQtyReducible: string;
  unrealizedProfit: string;
  positionMargin: string;
  expectedPnl: string;
  selectedLeverage: string;
}

export interface GetAccountDataResponse {
  address: address;
  feeTier: string;
  canTrade: boolean;
  totalOpenOrderMargin: string;
  totalReducingOpenOrderMargin: string;
  totalPositionMargin: string;
  totalPositionQtyReduced: string;
  totalPositionQtyReducible: string;
  totalExpectedPnl: string;
  totalUnrealizedProfit: string;
  walletBalance: string;
  freeCollateral: string;
  accountValue: string;
  accountDataByMarket: MarketAccountData[];
  updateTime: number;
}

export interface GetUserTransactionHistoryResponse {
  id: number;
  symbol: MarketSymbol;
  commission: string;
  commissionAsset: string;
  maker: boolean;
  side: ORDER_SIDE;
  price: string;
  quantity: string;
  quoteQty: string;
  realizedPnl: string;
  time: number;
  orderHash: string;
  traderType: string;
}

export interface GetMarketRecentTradesRequest {
  symbol: MarketSymbol;
  pageSize?: number;
  pageNumber?: number;
  traders?: address;
}

export interface GetMarketRecentTradesResponse {
  symbol: MarketSymbol;
  id: number;
  price: string;
  quantity: string;
  quoteQty: string;
  time: number;
  side: ORDER_SIDE;
}

export interface GetCandleStickRequest {
  symbol: MarketSymbol;
  interval: Interval;
  startTime?: number;
  endTime?: number;
  limit?: number;
}

/* Market Endpoints */
export interface MarketInfo {
  symbol: MarketSymbol;
  ContractType: string;
  maintMarginReq: string;
  inititalMarginReq: string;
  baseAssetSymbol: string;
  baseAssetName: string;
  quoteAssetSymbol: string;
  quoteAssetName: string;
  pricePrecision: number;
  sizePrecision: number;
  baseAssetPrecision: number;
  quoteAssetPrecision: number;
  minOrderSize: number;
  maxMarketOrderSize: string;
  maxLimitOrderSize: string;
  minOrderPrice: string;
  maxOrderPrice: string;
  defaultMakerFee: string;
  defaultTakerFee: string;
  liquidationFee: string;
  marketTakeBound: string;
  defaultLeverage: string;
}

export interface MiniTickerData {
  symbol: MarketSymbol;
  bestAskPrice: string;
  bestAskQty: string;
  bestBidPrice: string;
  bestBidQty: string;
  midMarketPrice: string;
  midMarketPriceDirection: number;
  indexPrice: string;
  time: string;
  lastFundingRate: string;
  nextFundingTime: string;
  lastPrice: string;
  lastQty: string;
  lastTime: string;
  _24hrPriceChange: string;
  _24hrPriceChangePercent: string;
  _24hrOpenPrice: string;
  _24hrHighPrice: string;
  _24hrLowPrice: string;
  _24hrClosePrice: string;
  _24hrVolume: string;
  _24hrQuoteVolume: string;
  _24hrOpenTime: string;
  _24hrCloseTime: string;
  _24hrFirstId: number;
  _24hrLastId: number;
  _24hrCount: string;

  marketAddress?: string;
  loading?: boolean;
}

export interface MarketMeta {
  symbol: MarketSymbol;
  rpcURI: string;
  onboardingWebsiteUrl: string;
  orderAddress: address;
  perpetualAddress: address;
  marginBankAddress: address;
  orderbookQueuePort: string;
  orderbookStatePort: string;
  orderbookServerIP: string;
  status: MARKET_STATUS;
}

export interface StatusResponse {
  isAlive: boolean;
  serverTime: number;
}
