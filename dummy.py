import time
from firefly_exchange_client import FireflyClient
from constants import Networks
from enumerations import MARKET_SYMBOLS, SOCKET_EVENTS
import asyncio
import logging
# from utilities import config_logging

# config_logging(logging, logging.DEBUG)

# initialize client
client = FireflyClient(
      True, # agree to terms and conditions
      Networks["MAINNET_ARBITRUM"], # network to connect with
      "41c241c3673bee00a0b78baa6923a0971dd75f13c44432e742c5377abbe6ab0c", # private key of wallet
      True, # on boards user on firefly. Must be set to true for first time use
      )

def callback(event):
    print("Event data:", event)

def on_message(ws, message):
    print(message)

def on_error(ws, error):
    print(error)

def on_close(ws, close_status_code, close_msg):
    print("### closed ###")
async def main():

  # must open socket before subscribing
  print("Making socket connection to firefly exchange")
  client.webSocketClient.initialize_socket(on_open=on_open,on_close=on_close,on_error=on_error)

def on_open(ws):
   # subscribe to global event updates for BTC market 
  status = client.webSocketClient.subscribe_global_updates_by_symbol(MARKET_SYMBOLS.BTC)
  print("Subscribed to global BTC events: {}".format(status))

  # subscribe to local user events
  client.webSocketClient.subscribe_user_update_by_token()
  print("Subscribed to user events")

  # triggered when order book updates
  print("Listening to Orderbook updates")
  client.webSocketClient.listen(SOCKET_EVENTS.ORDERBOOK_UPDATE.value, callback)

  # triggered when status of any user order updates
  print("Listening to user order updates")
  client.webSocketClient.listen(SOCKET_EVENTS.ORDER_UPDATE.value, callback)

  # SOCKET_EVENTS contains all events that can be listened to
  
  # logs event name and data for all markets and users that are subscribed.
  # helpful for debugging
  # client.socket.listen("default",callback)

  # time.sleep(60)
  # # unsubscribe from global events
  # status = client.webSocketClient.unsubscribe_global_updates_by_symbol(MARKET_SYMBOLS.BTC)
  # print("Unsubscribed from global BTC events: {}".format(status))

  # status = client.webSocketClient.unsubscribe_user_update_by_token()
  # print("Unsubscribed from user events: {}".format(status))


  # # close socket connection
  # print("Closing sockets!")
  # client.webSocketClient.stop()

if __name__ == "__main__":
    asyncio.run(main())