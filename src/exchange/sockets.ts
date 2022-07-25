/* eslint-disable no-unused-vars */
import { io } from "socket.io-client";
import {
  address,
  SocketInstance,
  MarketSymbol,
  SOCKET_EVENTS,
  MARKET_STATUS,
  MinifiedCandleStick,
} from "@firefly-exchange/library";

import {
  GetMarketRecentTradesResponse,
  PlaceOrderResponse,
  GetPositionResponse,
  GetUserTradesResponse,
  GetAccountDataResponse,
  MarketData,
} from "../interfaces/routes";

export class Sockets {
  private socketInstance!: SocketInstance;

  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  createDynamicUrl(dynamicUrl: string, object: any) {
    for (const key in object) {
      dynamicUrl = dynamicUrl.replace(`{${key}}`, object[key]);
    }
    return dynamicUrl;
  }

  /**
   * opens socket instance connection
   */
  open() {
    this.socketInstance = io(this.url, {
      transports: ["websocket"],
    });
  }

  /**
   * closes the socket instance connection
   */
  close() {
    if (this.socketInstance) {
      this.socketInstance.disconnect();
      this.socketInstance.close();
    }
  }

  subscribeGlobalUpdatesBySymbol(symbol: MarketSymbol): boolean {
    if (!this.socketInstance) return false;
    this.socketInstance.emit("SUBSCRIBE", [
      {
        e: SOCKET_EVENTS.GLOBAL_UPDATES_ROOM,
        p: symbol,
      },
    ]);
    return true;
  }

  unsubscribeGlobalUpdatesBySymbol(symbol: MarketSymbol): boolean {
    if (!this.socketInstance) return false;
    this.socketInstance.emit("UNSUBSCRIBE", [
      {
        e: SOCKET_EVENTS.GLOBAL_UPDATES_ROOM,
        p: symbol,
      },
    ]);
    return true;
  }

  subscribeUserUpdateByAddress(ethAddress: address): boolean {
    if (!this.socketInstance) return false;
    this.socketInstance.emit("SUBSCRIBE", [
      {
        e: SOCKET_EVENTS.UserUpdatesRoom,
        u: ethAddress.toLowerCase(),
      },
    ]);
    return true;
  }

  unsubscribeUserUpdateByAddress(ethAddress: address): boolean {
    if (!this.socketInstance) return false;
    this.socketInstance.emit("UNSUBSCRIBE", [
      {
        e: SOCKET_EVENTS.UserUpdatesRoom,
        u: ethAddress.toLowerCase(),
      },
    ]);
    return true;
  }

  // Emitted when any price bin on the oderbook is updated.
  onOrderBookUpdate = (cb: ({ orderbook }: any) => void) => {
    this.socketInstance.on(SOCKET_EVENTS.OrderbookUpdateKey, cb);
  };

  onMarketDataUpdate = (
    cb: ({ marketData }: { marketData: MarketData }) => void
  ) => {
    this.socketInstance.on(SOCKET_EVENTS.MarketDataUpdateKey, cb);
  };

  onMarketHealthChange = (
    cb: ({ status, symbol }: { status: MARKET_STATUS; symbol: string }) => void
  ) => {
    this.socketInstance.on(SOCKET_EVENTS.MarketHealthKey, cb);
  };

  onCandleStickUpdate = (
    symbol: string,
    interval: string,
    cb: (candle: MinifiedCandleStick) => void,
  ) => {
    this.socketInstance.on(this.createDynamicUrl(
      SOCKET_EVENTS.GET_LAST_KLINE_WITH_INTERVAL, {
			symbol: symbol,
			interval: interval,
		}), cb);
  };

  onExchangeHealthChange = (
    cb: ({ isAlive }: { isAlive: boolean }) => void
  ) => {
    this.socketInstance.on(SOCKET_EVENTS.ExchangeHealthKey, cb);
  };

  // TODO: figure out what it does
  onRecentTrades = (
    cb: ({ trades }: { trades: GetMarketRecentTradesResponse[] }) => void
  ) => {
    this.socketInstance.on(SOCKET_EVENTS.RecentTradesKey, cb);
  };

  onUserOrderUpdate = (
    cb: ({ order }: { order: PlaceOrderResponse }) => void
  ) => {
    this.socketInstance.on(SOCKET_EVENTS.OrderUpdateKey, cb);
  };

  onUserPositionUpdate = (
    cb: ({ position }: { position: GetPositionResponse }) => void
  ) => {
    this.socketInstance.on(SOCKET_EVENTS.PositionUpdateKey, cb);
  };

  onUserUpdates = (
    cb: ({ trade }: { trade: GetUserTradesResponse }) => void
  ) => {
    this.socketInstance.on(SOCKET_EVENTS.UserTradeKey, cb);
  };

  onUserAccountDataUpdate = (
    cb: ({ accountData }: { accountData: GetAccountDataResponse }) => void
  ) => {
    this.socketInstance.on(SOCKET_EVENTS.AccountDataUpdateKey, cb);
  };
}
