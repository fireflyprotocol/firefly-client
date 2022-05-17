import Web3 from "web3";
import * as contracts from './deployedContracts.json'

import { Network, MarketSymbol, Orders } from "./index";

export class FFLYClient{
    protected readonly network:Network;
    private orderSigners:Map<MarketSymbol, Orders> = new Map();
    
    /**
     * 
     * @param _network containing network rpc url and chain id
     */
    constructor(_network:Network){
        this.network = _network;
    }

    /**
     * 
     * @param market Symbol of MARKET BTC-USDT
     * @param ordersContractAddress (Optional) address of orders contract address for market 
     * @returns boolean true if market is added else false
     */
    addMarket(market:MarketSymbol, ordersContractAddress?:string):boolean{

        // if orders contract address is not provided read 
        // from deployed contracts addresses if possible
        if(!ordersContractAddress){
            try {
                ordersContractAddress = (contracts as any)[this.network.chainId][market]["Orders"];
            } catch(e){
                // orders contract address for given network and market name was not found
            }
        }
        
        // if orders contract address is empty or undefined return false
        if(ordersContractAddress == "" || ordersContractAddress == undefined){
            return false;
        }

        // if signer for market already exists return false
        if(this.orderSigners.get(market)){
           return false; 
        } else { // else create order signer for market
            this.orderSigners.set(market,  new Orders(
                new Web3(this.network.url),
                this.network.chainId,
                ordersContractAddress
            ));
            return true;            
        }
    }

    /**
     * 
     * @param market symbol of the market to be removed
     * @returns boolean  true if market is removed false other wise
     */
    removeMarket(market:MarketSymbol):boolean{
        return this.orderSigners.delete(market);
    }


   
}
