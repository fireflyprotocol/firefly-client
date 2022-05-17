import { expect } from "chai";
import { Networks, MARKET_SYMBOLS, FFLYClient } from "../src/index";

describe("FFLYClient", () => {

    it("should initialize the client", async ()=>{
        const client = new FFLYClient(Networks.TESTNET);
        expect(client).to.be.not.eq(undefined);
    });


    it("should add DOT-PERP market", async ()=>{
        const client = new FFLYClient(Networks.TESTNET);
        expect(client.addMarket(MARKET_SYMBOLS.DOT)).to.be.equal(true);
    });

    it("should add DOT-PERP market with custom orders contract address", async ()=>{
        const client = new FFLYClient(Networks.TESTNET);
        expect(client.addMarket(MARKET_SYMBOLS.DOT, 
            "0x46ABa007B8c0ff7Da3132b52b81d2C15D2e8E815")).to.be.equal(true);
    });

    it("should return FALSE as there is no market for name TEST-PERP", async ()=>{
        const client = new FFLYClient(Networks.TESTNET);
        expect(client.addMarket("TEST-PERP")).to.be.equal(false);
    });

    it("should add market despite not existing in deployed contracts", async ()=>{
        const client = new FFLYClient(Networks.TESTNET);
        expect(client.addMarket("TEST-PERP",
            "0x46ABa007B8c0ff7Da3132b52b81d2C15D2e8E815")).to.be.equal(true);
    });

    it("should return False as DOT-PERP market is already added", async ()=>{
        const client = new FFLYClient(Networks.TESTNET);
        expect(client.addMarket(MARKET_SYMBOLS.DOT)).to.be.equal(true);
        expect(client.addMarket(MARKET_SYMBOLS.DOT)).to.be.equal(false);
    });

    it("should remove the DOT market", async ()=>{
        const client = new FFLYClient(Networks.TESTNET);
        expect(client.addMarket(MARKET_SYMBOLS.DOT)).to.be.equal(true);
        expect(client.removeMarket(MARKET_SYMBOLS.DOT)).to.be.equal(true);
    });

    it("should return false when trying to remove a non-existent market", async ()=>{
        const client = new FFLYClient(Networks.TESTNET);
        expect(client.removeMarket(MARKET_SYMBOLS.DOT)).to.be.equal(false);
    });

});