import Web3 from "web3";
import { Contract, Wallet, providers } from "ethers";
import { toBigNumberStr, bnStrToNumber } from "./helpers/utils";
import * as contracts from "../contracts/deployedContracts.json";
import * as Test_Token from "../contracts/Test_Token.json";
import { MarginBank__factory } from "../contracts/orderbook";

import { Network, MarketSymbol, OrderSigner, address } from "./index";
import { MarginBank } from "../contracts/orderbook";

export class FFLYClient{
    protected readonly network:Network;
    private web3:Web3;
    private wallet:Wallet;
    private orderSigners:Map<MarketSymbol, OrderSigner> = new Map();
    
    /**
     * 
     * @param _network containing network rpc url and chain id
     * @param _acctPvtKey private key for the account to be used for placing orders
     */
    constructor(_network:Network, _acctPvtKey:string){
        this.network = _network;
        this.web3 = new Web3(_network.url);
        this.web3.eth.accounts.wallet.add(_acctPvtKey);
        this.wallet = new Wallet(_acctPvtKey, new providers.JsonRpcProvider(_network.url));
    }

    /**
     * 
     * @param market Symbol of MARKET BTC-USDT
     * @param ordersContractAddress (Optional) address of orders contract address for market 
     * @returns boolean true if market is added else false
     */
    addMarket(market:MarketSymbol, ordersContract?:address):boolean{

        // if orders contract address is not provided read 
        // from deployed contracts addresses if possible
        if(!ordersContract){
            try {
                ordersContract = (contracts as any)[this.network.chainId][market]["Orders"]["address"];
            } catch(e){
                // orders contract address for given network and market name was not found
            }
        }
        
        // if orders contract address is empty or undefined return false
        if(ordersContract == "" || ordersContract == undefined){
            return false;
        }

        // if signer for market already exists return false
        if(this.orderSigners.get(market)){
           return false; 
        } else { // else create order signer for market
            this.orderSigners.set(market,  new OrderSigner(
                this.web3,
                this.network.chainId,
                ordersContract
            ));
            return true;            
        }
    }

    /**
     * Removes the provided symbol market order signer
     * @param market symbol of the market to be removed
     * @returns boolean  true if market is removed false other wise
     */
    removeMarket(market:MarketSymbol):boolean{
        return this.orderSigners.delete(market);
    }

    /**
     * Returns the USDC balance of user in USDC contract
     * @param contract (optional) address of USDC contract
     * @returns Number representing balance of user
     */
    async getUSDCBalance(contract?:address):Promise<number>{

        const tokenContract = this._getContract("Test_Token", contract);

        if(tokenContract == false) { return 0; }

        const balance = await (tokenContract as Contract).connect(this.wallet)
                        .balanceOf(this.wallet.address);

        return bnStrToNumber(+balance);
    }


    /**
     * Returns the USDC Balance(Free Collateral) of the account in Margin Bank contract
     * @param contract (optional) address of Margin Bank contract
     * @returns Number representing balance of user
     */
     async getMarginBankBalance(contract?:address):Promise<number>{

        const marginBankContract = this._getContract("MarginBank", contract);

        if(marginBankContract == false) { return 0; }

        const balance = await (marginBankContract as MarginBank)
                        .connect(this.wallet)
                        .getAccountBankBalance(this.wallet.address)

        return bnStrToNumber(+balance);
    }

    /**
     * Faucet function, mints 10K USDC to wallet - Only works on Testnet
     * Assumes that the user wallet has Boba/Moonbase Tokens on Testnet
     * @param contract (optional) address of USDC contract
     * @returns Boolean true if user is funded, false otherwise
     */
    async getTestUSDC(contract?:address):Promise<boolean>{
        const tokenContract = this._getContract("Test_Token", contract);

        if(tokenContract == false) { return false; }

        try{
            // mint 10K USDC token
            await (await (tokenContract as Contract)
                .connect(this.wallet)
                .mint(this.wallet.address, toBigNumberStr(10000))
                ).wait();
        } catch(e){
            return false;
        }

        return true;
    }

    /**
     * Transfers USDC to margin bank to be used for placing orders and opening
     * positions on Firefly Exchange
     * @param amount the number of USDC to be transferred
     * @param usdcContract (optional) address of USDC contract
     * @param mbContract (address) address of Margin Bank contract
     * @returns boolean true if funds are transferred, false otherwise
     */
    async moveUSDCToMarginBank(amount:number, usdcContract?:address, mbContract?:address):Promise<boolean>{

        const tokenContract = this._getContract("Test_Token", usdcContract);
        const marginBankContract = this._getContract("MarginBank", mbContract);

        if(tokenContract == false || marginBankContract == false ) { return false; }

        const amountString = toBigNumberStr(amount);

        try {
            // approve usdc contract to allow margin bank to take funds out for user's behalf
            await (
                await (tokenContract as Contract)
                .connect(this.wallet)
                .approve(
                    (marginBankContract as MarginBank).address,
                    amountString,
                    {}
                )
            ).wait();
            
            // deposit `amount` usdc to margin bank
            await (
                await (marginBankContract as MarginBank)
                  .connect(this.wallet)
                  .depositToBank(
                    this.wallet.address,
                    amountString,
                    {}
                  )
              ).wait();
            
            return true;
        } catch(e){
            console.log(e);
            return false;
        }

    }


    /**
     * Transfers USDC from MarginBank, back to USDC contract
     * @param amount (optional) if not provided, transfers all available USDC tokens 
     * from Margin Bank to USDC contract
     * @param usdcContract (optional) address of USDC contract
     * @param mbContract (address) address of Margin Bank contract
     * @returns boolean true if funds are transferred, false otherwise
     */
     async moveUSDCFromMarginBank(amount?:number, usdcContract?:address, mbContract?:address):Promise<boolean>{

        const tokenContract = this._getContract("Test_Token", usdcContract);
        const marginBankContract = this._getContract("MarginBank", mbContract);

        if(tokenContract == false || marginBankContract == false ) { return false; }

        const amountString = toBigNumberStr(
            amount || await this.getMarginBankBalance((marginBankContract as MarginBank).address));

        try {

            // transfer amount back to USDC contract
            await (
                await (marginBankContract as MarginBank)
                  .connect(this.wallet)
                  .transferFromBank(
                      this.wallet.address, 
                      this.wallet.address, 
                      amountString)
                ).wait();
            
            return true;
        } catch(e){
            console.log(e);
            return false;
        }

    }

    //===============================================================//
    // INTERNAL HELPER FUNCTIONS
    //===============================================================//
    
    /**
     * Internal function to return a global(Test USDC Token / Margin Bank) contract
     * @param contract address of contract
     * @returns contract or false
     */
    _getContract(contractName:string, contract?:address):Contract|boolean|MarginBank {

        if(!contract){
            contract = (contracts as any)[this.network.chainId][contractName]["address"]
        }

        if(contract == "" || contract == undefined){
            return false;
        }

        switch(contractName){
            case "Test_Token":
                return new Contract(contract, Test_Token.abi);
            case "MarginBank":
                const marginBankFactory = new MarginBank__factory();
                const marginBank = marginBankFactory.attach(contract);
                return marginBank as any as MarginBank;
            default:
                return false;
        }

    }


   
}
