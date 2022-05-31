/* eslint-disable no-unused-vars */
import { io } from "socket.io-client";
import {
  address,
  SocketInstance,
  MarketSymbol,
  SOCKET_EVENTS,
  MARKET_STATUS,
} from "../types";
import {
  GetMarketRecentTradesResponse,
  PlaceOrderResponse,
  GetPositionResponse,
  GetUserTradesResponse,
  GetAccountDataResponse,
  MiniTickerData,
} from "../interfaces/routes";

export class Sockets {
  private socketInstance!: SocketInstance;

  private url: string;

  constructor(url: string) {
    this.url = url;
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
    this.socketInstance.disconnect();
    this.socketInstance.close();
  }

  subscribeGlobalUpdatesBySymbol(symbol: MarketSymbol) {
    this.socketInstance.emit("SUBSCRIBE", [
      {
        e: SOCKET_EVENTS.GLOBAL_UPDATES_ROOM,
        p: symbol,
      },
    ]);
  }

  unsubscribeGlobalUpdatesBySymbol(symbol: MarketSymbol) {
    this.socketInstance.emit("UNSUBSCRIBE", [
      {
        e: SOCKET_EVENTS.GLOBAL_UPDATES_ROOM,
        p: symbol,
      },
    ]);
  }

  subscribeUserUpdateByAddress(ethAddress: address) {
    this.socketInstance.emit("SUBSCRIBE", [
      {
        e: SOCKET_EVENTS.UserUpdatesRoom,
        u: ethAddress.toLowerCase(),
      },
    ]);
  }

  unsubscribeUserUpdateByAddress(ethAddress: address) {
    this.socketInstance.emit("UNSUBSCRIBE", [
      {
        e: SOCKET_EVENTS.UserUpdatesRoom,
        u: ethAddress.toLowerCase(),
      },
    ]);
  }

  // Emitted when any price bin on the oderbook is updated.
  onOrderBookUpdate = (cb: ({ orderbook }: any) => void) => {
    this.socketInstance.on(SOCKET_EVENTS.OrderbookUpdateKey, cb);
  };

  onMarketDataUpdate = (
    cb: ({ marketData }: { marketData: MiniTickerData }) => void
  ) => {
    this.socketInstance.on(SOCKET_EVENTS.MarketDataUpdateKey, cb);
  };

  onMarketHealthChange = (
    cb: ({ status, symbol }: { status: MARKET_STATUS; symbol: string }) => void
  ) => {
    this.socketInstance.on(SOCKET_EVENTS.MarketHealthKey, cb);
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
