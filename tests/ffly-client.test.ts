import { expect } from "chai";
import { Networks, MARKET_SYMBOLS, FFLYClient, bnStrToBaseNumber } from "../src/index";

const testAcctKey = "4ef06568055d528efdeb3a2e0c1a4b1a0f1fdf4f9e388f11f0a248228298c2b7";
const testOrdersContract = "0x46ABa007B8c0ff7Da3132b52b81d2C15D2e8E815";

describe("FFLYClient", () => {

    it("should initialize the client", async ()=>{
        const client = new FFLYClient(Networks.TESTNET, testAcctKey);
        expect(client).to.be.not.eq(undefined);
    });

    it("should add DOT-PERP market", async ()=>{
        const client = new FFLYClient(Networks.TESTNET, testAcctKey);
        expect(client.addMarket(MARKET_SYMBOLS.DOT)).to.be.equal(true);
    });

    it("should add DOT-PERP market with custom orders contract address", async ()=>{
        const client = new FFLYClient(Networks.TESTNET, testAcctKey);
        expect(client.addMarket(MARKET_SYMBOLS.DOT, testOrdersContract)).to.be.equal(true);
    });

    it("should return FALSE as there is no market for name TEST-PERP", async ()=>{
        const client = new FFLYClient(Networks.TESTNET, testAcctKey);
        expect(client.addMarket("TEST-PERP")).to.be.equal(false);
    });

    it("should add market despite not existing in deployed contracts", async ()=>{
        const client = new FFLYClient(Networks.TESTNET, testAcctKey);
        expect(client.addMarket("TEST-PERP", testOrdersContract)).to.be.equal(true);
    });

    it("should return False as DOT-PERP market is already added", async ()=>{
        const client = new FFLYClient(Networks.TESTNET, testAcctKey);
        expect(client.addMarket(MARKET_SYMBOLS.DOT)).to.be.equal(true);
        expect(client.addMarket(MARKET_SYMBOLS.DOT)).to.be.equal(false);
    });

    it("should remove the DOT market", async ()=>{
        const client = new FFLYClient(Networks.TESTNET, testAcctKey);
        expect(client.addMarket(MARKET_SYMBOLS.DOT)).to.be.equal(true);
        expect(client.removeMarket(MARKET_SYMBOLS.DOT)).to.be.equal(true);
    });

    it("should return false when trying to remove a non-existent market", async ()=>{
        const client = new FFLYClient(Networks.TESTNET, testAcctKey);
        expect(client.removeMarket(MARKET_SYMBOLS.DOT)).to.be.equal(false);
    });

    it("should get 10K Test USDCs", async ()=>{
        const client = new FFLYClient(Networks.TESTNET, testAcctKey);
        expect(await client.getTestUSDC()).to.be.equal(true);
        expect(bnStrToBaseNumber(await client.getUSDCBalance())).to.be.greaterThanOrEqual(10000);
    });

    it("should move 1 USDC token to Margin Bank", async ()=>{
        const client = new FFLYClient(Networks.TESTNET, testAcctKey);
        expect(await client.moveUSDCToMarginBank(1)).to.be.equal(true);
        expect(bnStrToBaseNumber(await client.getMarginBankBalance())).to.be.greaterThanOrEqual(1);
    });


    it("should withdraw 1 USDC token from Margin Bank", async ()=>{
        const client = new FFLYClient(Networks.TESTNET, testAcctKey);
        expect(await client.withdrawUSDCFromMarginBank(1)).to.be.equal(true);
    });

    it("should move all USDC token from Margin Bank", async ()=>{
        const client = new FFLYClient(Networks.TESTNET, testAcctKey);
        expect(await client.withdrawUSDCFromMarginBank()).to.be.equal(true);
        expect(await client.getMarginBankBalance()).to.be.eql("0");
    });
    
});