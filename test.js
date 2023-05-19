(async () => {
    let Arweave = require("arweave")
    let ArSubaccounts = require("./index")
    let jwk = require("./jwk.json")
    let arweave = Arweave.init({
        host: "prophet.rareweave.store",
        port: 443,
        protocol: "https",
        timeout: 60_000,
        logging: false,
    });
    let subaccountlib = new ArSubaccounts(arweave, jwk)
    // const subaccount = await subaccountlib.makeSubaccount(arweave.wallets.jwkToAddress(jwk), "permamail")
})()