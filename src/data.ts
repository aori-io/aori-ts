import { AORI_HTTP_API } from "./constants";

/**
 * TODO: implement GET requests for: 
 * 
 * - /data/historicalOrderData
 * - /data/market
 * - /data/asset/{address}
 * 
**/

export class Data { 
    private httpProvider: typeof AORI_HTTP_API;

    constructor() {
        this.httpProvider = AORI_HTTP_API;
    }
    
    
}