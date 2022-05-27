import {
  MarketSymbol,
  ORDER_STATUS,
  ORDER_SIDE,
  TIME_IN_FORCE,
  MARGIN_TYPE,
  ORDER_TYPE,
  address,
} from "../types";

export interface GetOrderResponse {
  id: number;
  clientId: string;
  requestTime: number;
  cancelReason: string;
  orderStatus: string;
  hash: string;
  symbol: string;
  orderType: string;
  orderTypeID: number;
  timeInForce: string;
  timeInForceTypeID: number;
  userAddress: string;
  side: string;
  price: string;
  limitPrice: string;
  triggerPrice: string;
  quantity: string;
  leverage: string;
  reduceOnly: boolean;
  expiration: number;
  salt: string;
  orderSignature: string;
  filledQty: string;
  avgFillPrice: string;
  amountLeft: string;
  makerFee: string;
  takerFee: string;
  updatedAt: number;
  createdAt: number;
  postOnly: boolean;
  fee: string;
}

export interface GetOrderRequest {
  status: ORDER_STATUS; // status of orders to be fetched
  symbol?: MarketSymbol; // will fetch orders of provided market
  pageSize?: number; // will get only provided number of orders must be <= 50
  pageNumber?: number; // will fetch particular page records. A single page contains 50 records.
}

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
  orderSignatrue: string;
}

export interface PlaceOrderRequest extends OrderSignatureResponse {
  timeInForce?: TIME_IN_FORCE; // GTC/FOK/IOC by default all orders are GTC
  postOnly?: boolean; // true/false, default is true
}

export type ServerOrderResponse = {
  id: number;
  clientId: string;
  requestTime: number;
  cancelReason: string;
  orderStatus: ORDER_STATUS;
  hash: string;
  symbol: string;
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

export interface PlaceCancelOrderResponse {
  status: number; // status code - 201 is success
  // TODO define proper interfaces for data
  data: ServerOrderResponse; // placed order data returned from dapi
}

export interface GetPositionRequest {
  symbol?: MarketSymbol; // will fetch orders of provided market
  pageSize?: number; // will fetch provided number of open positions <= 50
  pageNumber?: number; // will fetch particular page records. A single page contains 50 records.
}

export interface GetPositionResponse {
  userAddress: address;
  symbol: MarketSymbol;
  avgEntryPrice: string;
  latestBlockNumber: number;
  latestTxHash: string;
  marginTypeID: number;
  margin: string;
  leverage: string;
  quantity: string;
  createdAt: number;
  updatedAt: number;
  positionSelectedLeverage: string;
  marginType: MARGIN_TYPE;
  indexPrice: string;
  midMarketPrice: string;
  debt: string;
  liquidationPrice: string;
  side: ORDER_SIDE;
  positionValue: string;
  unrealizedProfit: string;
  unrealizedProfitPercent: string;
}

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
