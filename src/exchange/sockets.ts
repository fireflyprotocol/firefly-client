/* eslint-disable no-unused-vars */
import {
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
// const WebSocket = require('ws');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const WebSocket = require('ws')
export class Sockets {
  private socketInstance!: WebSocket;

  private token: string;

  private callbackListeners: Record<string, any> = {};

  private url: string;

  constructor(url: string) {
    this.url = url;
    this.token = "";
  }

  createDynamicUrl(dynamicUrl: string, object: any) {
    // eslint-disable-next-line no-restricted-syntax, guard-for-in
    for (const key in object) {
      dynamicUrl = dynamicUrl.replace(`{${key}}`, object[key]);
    }
    return dynamicUrl;
  }

  /**
   * opens socket instance connection
   */
  async open() {
    console.log("HELLO")

    this.socketInstance = new WebSocket(
      this.url
    );


    const testSocket = this.socketInstance;

    const myPromise = new Promise(function(resolve, reject) {
      testSocket.onopen = function () {
        console.log("OPEN");
        resolve(true)
      };
      testSocket.onerror = function (err) {
        console.log("ERROR");
        reject(err)
      };
    });

    // this.socketInstance.onopen = function () {
    //   console.log("OPEN");
    //   cbOpen();
    // };
    // this.socketInstance.onerror = function (err) {
    //   console.log("ERROR");
    //   cbError(err);
    // };

    this.socketInstance.onmessage = (event: any) => {
      console.log(event)
      event = JSON.parse(event.data);
      if (this.callbackListeners[event.eventName]) {
        this.callbackListeners[event.eventName](event.data);
      }
    };

    return myPromise
  }

  /**
   * closes the socket instance connection
   */
  close() {
    if (this.socketInstance) {
      // this.socketInstance.disconnect();
      this.socketInstance.close();
    }
  }

  subscribeGlobalUpdatesBySymbol(symbol: MarketSymbol): boolean {
    if (!this.socketInstance) return false;
    this.socketInstance.send(
      JSON.stringify([
        "SUBSCRIBE",
        [
          {
            e: SOCKET_EVENTS.GLOBAL_UPDATES_ROOM,
            p: symbol,
          },
        ],
      ])
    );
    return true;
  }

  unsubscribeGlobalUpdatesBySymbol(symbol: MarketSymbol): boolean {
    if (!this.socketInstance) return false;
    this.socketInstance.send(
      JSON.stringify([
        "UNSUBSCRIBE",
        [
          {
            e: SOCKET_EVENTS.GLOBAL_UPDATES_ROOM,
            p: symbol,
          },
        ],
      ])
    );
    return true;
  }

  subscribeUserUpdateByToken(callback?: any): boolean {
    if (!this.socketInstance) return false;
    this.socketInstance.send(
      JSON.stringify([
        "SUBSCRIBE",
        [
          {
            e: SOCKET_EVENTS.UserUpdatesRoom,
            t: this.token,
          },
        ],
      ])
      // (data: UserSubscriptionAck) => {
      //   if (callback instanceof Function) callback(data);
      // }
    );
    return true;
  }

  unsubscribeUserUpdateByToken(callback?: any): boolean {
    if (!this.socketInstance) return false;
    this.socketInstance.send(
      JSON.stringify([
        "UNSUBSCRIBE",
        [
          {
            e: SOCKET_EVENTS.UserUpdatesRoom,
            t: this.token,
          },
        ],
      ])
      // (data: UserSubscriptionAck) => {
      //   if (callback instanceof Function) callback(data);
      // }
    );
    return true;
  }

  setAuthToken = (token: string) => {
    this.token = token;
  };

  // Emitted when any price bin on the oderbook is updated.
  onOrderBookUpdate = (cb: ({ orderbook }: any) => void) => {
    this.callbackListeners[SOCKET_EVENTS.OrderbookUpdateKey] = cb;
  };

  onMarketDataUpdate = (
    cb: ({ marketData }: { marketData: MarketData }) => void
  ) => {
    this.callbackListeners[SOCKET_EVENTS.MarketDataUpdateKey] = cb;
  };

  onMarketHealthChange = (
    cb: ({ status, symbol }: { status: MARKET_STATUS; symbol: string }) => void
  ) => {
    this.callbackListeners[SOCKET_EVENTS.MarketHealthKey] = cb;
  };

  onCandleStickUpdate = (
    symbol: string,
    interval: string,
    cb: (candle: MinifiedCandleStick) => void
  ) => {
    this.callbackListeners[
      this.createDynamicUrl(SOCKET_EVENTS.GET_LAST_KLINE_WITH_INTERVAL, {
        symbol,
        interval,
      })
    ] = cb;
  };

  onExchangeHealthChange = (
    cb: ({ isAlive }: { isAlive: boolean }) => void
  ) => {
    this.callbackListeners[SOCKET_EVENTS.ExchangeHealthKey] = cb;
  };

  // TODO: figure out what it does
  onRecentTrades = (
    cb: ({ trades }: { trades: GetMarketRecentTradesResponse[] }) => void
  ) => {
    this.callbackListeners[SOCKET_EVENTS.RecentTradesKey] = cb;
  };

  onUserOrderUpdate = (
    cb: ({ order }: { order: PlaceOrderResponse }) => void
  ) => {
    this.callbackListeners[SOCKET_EVENTS.OrderUpdateKey] = cb;
  };

  onUserPositionUpdate = (
    cb: ({ position }: { position: GetPositionResponse }) => void
  ) => {
    this.callbackListeners[SOCKET_EVENTS.PositionUpdateKey] = cb;
  };

  onUserUpdates = (
    cb: ({ trade }: { trade: GetUserTradesResponse }) => void
  ) => {
    this.callbackListeners[SOCKET_EVENTS.UserTradeKey] = cb;
  };

  onUserAccountDataUpdate = (
    cb: ({ accountData }: { accountData: GetAccountDataResponse }) => void
  ) => {
    this.callbackListeners[SOCKET_EVENTS.AccountDataUpdateKey] = cb;
  };
}
