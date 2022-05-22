/* eslint-disable no-undef */
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";

import {
  Networks,
  MARKET_SYMBOLS,
  ORDER_STATUS,
  FireflyClient,
  bnStrToBaseNumber,
  ORDER_SIDE,
  GetPositionRequest,
} from "../src/index";

chai.use(chaiAsPromised);

const testAcctKey =
  "4ef06568055d528efdeb3a2e0c1a4b1a0f1fdf4f9e388f11f0a248228298c2b7";
const testOrdersContract = "0x46ABa007B8c0ff7Da3132b52b81d2C15D2e8E815";

describe("FireflyClient", () => {
  it("should initialize the client", async () => {
    const client = new FireflyClient(Networks.TESTNET, testAcctKey);
    expect(client).to.be.not.eq(undefined);
  });

  it("should return public address of account", async () => {
    const client = new FireflyClient(Networks.TESTNET, testAcctKey);
    expect(client.getPublicAddress()).to.be.equal(
      "0xe83515fEa858D4ac48278F27DF375fbF2bff441d"
    );
  });

  describe("Market", () => {
    it("should add DOT-PERP market", async () => {
      const client = new FireflyClient(Networks.TESTNET, testAcctKey);
      expect(client.addMarket(MARKET_SYMBOLS.DOT)).to.be.equal(true);
    });

    it("should add DOT-PERP market with custom orders contract address", async () => {
      const client = new FireflyClient(Networks.TESTNET, testAcctKey);
      expect(
        client.addMarket(MARKET_SYMBOLS.DOT, testOrdersContract)
      ).to.be.equal(true);
    });

    it("should return FALSE as there is no market for name TEST-PERP", async () => {
      const client = new FireflyClient(Networks.TESTNET, testAcctKey);
      expect(client.addMarket("TEST-PERP")).to.be.equal(false);
    });

    it("should add market despite not existing in deployed contracts", async () => {
      const client = new FireflyClient(Networks.TESTNET, testAcctKey);
      expect(client.addMarket("TEST-PERP", testOrdersContract)).to.be.equal(
        true
      );
    });

    it("should return False as DOT-PERP market is already added", async () => {
      const client = new FireflyClient(Networks.TESTNET, testAcctKey);
      expect(client.addMarket(MARKET_SYMBOLS.DOT)).to.be.equal(true);
      expect(client.addMarket(MARKET_SYMBOLS.DOT)).to.be.equal(false);
    });

    it("should remove the DOT market", async () => {
      const client = new FireflyClient(Networks.TESTNET, testAcctKey);
      expect(client.addMarket(MARKET_SYMBOLS.DOT)).to.be.equal(true);
      expect(client.removeMarket(MARKET_SYMBOLS.DOT)).to.be.equal(true);
    });

    it("should return false when trying to remove a non-existent market", async () => {
      const client = new FireflyClient(Networks.TESTNET, testAcctKey);
      expect(client.removeMarket(MARKET_SYMBOLS.DOT)).to.be.equal(false);
    });
  });

  describe("Balance", () => {
    const client = new FireflyClient(Networks.TESTNET, testAcctKey);

    it("should get 10K Test USDCs", async () => {
      expect(await client.getTestUSDC()).to.be.equal(true);
      expect(
        bnStrToBaseNumber(await client.getUSDCBalance())
      ).to.be.greaterThanOrEqual(10000);
    });

    it("should move 1 USDC token to Margin Bank", async () => {
      expect(await client.depositToMarginBank(1)).to.be.equal(true);
      expect(
        bnStrToBaseNumber(await client.getMarginBankBalance())
      ).to.be.greaterThanOrEqual(1);
    });

    it("should withdraw 1 USDC token from Margin Bank", async () => {
      expect(await client.withdrawFromMarginBank(1)).to.be.equal(true);
    });

    it("should move all USDC token from Margin Bank", async () => {
      expect(await client.withdrawFromMarginBank()).to.be.equal(true);
      expect(await client.getMarginBankBalance()).to.be.eql("0");
    });
  });

  describe("Get Orders", () => {
    const client = new FireflyClient(Networks.TESTNET, testAcctKey);

    it("should get all open orders", async () => {
      const data = await client.getOrders({
        status: ORDER_STATUS.OPEN,
        symbol: MARKET_SYMBOLS.DOT,
      });
      expect(data.length).to.be.greaterThanOrEqual(0);
    });

    it("should get all cancelled orders", async () => {
      const data = await client.getOrders({
        status: ORDER_STATUS.CANCELLED,
        symbol: MARKET_SYMBOLS.DOT,
      });
      expect(data.length).to.be.greaterThanOrEqual(1);
    });

    it("should get 1 cancelled orders", async () => {
      const data = await client.getOrders({
        status: ORDER_STATUS.CANCELLED,
        symbol: MARKET_SYMBOLS.DOT,
        pageSize: 1,
      });
      expect(data.length).to.be.equals(1);
    });

    it("should get 0 expired orders as page 2 does not exist for expired orders", async () => {
      const data = await client.getOrders({
        status: ORDER_STATUS.EXPIRED,
        symbol: MARKET_SYMBOLS.DOT,
        pageNumber: 2,
      });
      expect(data.length).to.be.equals(0);
    });
  });

  describe("Create/Post Orders", () => {
    const client = new FireflyClient(Networks.TESTNET, testAcctKey);
    client.addMarket(MARKET_SYMBOLS.DOT);

    before(async () => {
      await client.getTestUSDC();
      await client.depositToMarginBank(10000);
    });

    it("should throw error as DOT market is not added to client", async () => {
      await expect(
        client.createSignedOrder({
          symbol: MARKET_SYMBOLS.BTC,
          price: 0,
          quantity: 0.1,
          side: ORDER_SIDE.SELL,
        })
      ).to.be.eventually.rejectedWith(
        "Provided Market Symbol(BTC-PERP) is not added to client library"
      );
    });

    it("should create signed order", async () => {
      const signedOrder = await client.createSignedOrder({
        symbol: MARKET_SYMBOLS.DOT,
        price: 0,
        quantity: 0.1,
        side: ORDER_SIDE.SELL,
      });

      expect(signedOrder.leverage).to.be.equal(1);
      expect(signedOrder.price).to.be.equal(0);
      expect(signedOrder.quantity).to.be.equal(0.1);
    });

    it("should place a LIMIT SELL order on exchange", async () => {
      const signedOrder = await client.createSignedOrder({
        symbol: MARKET_SYMBOLS.DOT,
        price: 11,
        quantity: 0.5,
        side: ORDER_SIDE.SELL,
      });

      const response = await client.placeOrder({ ...signedOrder });
      expect(response.status).to.be.equal(201);
    });

    it("should place a MARKET BUY order on exchange", async () => {
      const signedOrder = await client.createSignedOrder({
        symbol: MARKET_SYMBOLS.DOT,
        price: 0,
        quantity: 0.5,
        side: ORDER_SIDE.BUY,
      });
      const response = await client.placeOrder({ ...signedOrder });
      expect(response.status).to.be.equal(201);
    });
  });

  describe.only("Get Position", () => {
    const client = new FireflyClient(Networks.TESTNET, testAcctKey);
    client.addMarket(MARKET_SYMBOLS.DOT);

    it("should return zero open positions for the user", async () => {
      const clientTemp = new FireflyClient(
        Networks.TESTNET,
        "20049f9e228fc02b924e022533b92ddc07d0a1f125845d2caca14b8010943f63"
      );
      clientTemp.addMarket(MARKET_SYMBOLS.DOT);

      const positions = await clientTemp.getPosition({});
      expect((positions as GetPositionRequest[]).length).to.be.equal(0);
    });

    xit("should return no open position for user against BTC-PERP market", async () => {
      const clientTemp = new FireflyClient(
        Networks.TESTNET,
        "20049f9e228fc02b924e022533b92ddc07d0a1f125845d2caca14b8010943f63"
      );
      // 0x5064A2a865DDbfFfCd621e600f5Cd5cE9D8c36af

      clientTemp.addMarket(MARKET_SYMBOLS.DOT);

      const position = await clientTemp.getPosition({
        symbol: MARKET_SYMBOLS.DOT,
      });
      expect(position as GetPositionRequest).to.be.equal(undefined);
    });

    it("should get user's DOT-PERP Position", async () => {
      const position = await client.getPosition({
        symbol: MARKET_SYMBOLS.DOT,
      });
      expect((position as GetPositionRequest).symbol).to.be.equal(
        MARKET_SYMBOLS.DOT
      );
    });

    it("should get all open positions for the user across all markets", async () => {
      const position = await client.getPosition({});
      expect(
        (position as GetPositionRequest[]).length
      ).to.be.greaterThanOrEqual(1);
    });
  });
});
