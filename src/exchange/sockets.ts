import { io } from "socket.io-client";
import { address, SocketInstance, MarketSymbol, SOCKET_EVENTS } from "../types";

export class Sockets {
  private socketInstance: SocketInstance;

  constructor(url: string) {
    this.socketInstance = io(url, {
      transports: ["websocket"],
    });
  }

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

  // eslint-disable-next-line no-unused-vars
  onOrderBookUpdate(cb: ({ orderbook }: any) => void) {
    this.socketInstance.on(SOCKET_EVENTS.OrderbookUpdateKey, cb);
  }
}
