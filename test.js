(async () => {
  let Arweave = require("arweave");
  let ArSubaccounts = require("./index");
  let jwk = require("./jwk.json");
  let arweave = Arweave.init({
    host: "prophet.rareweave.store",
    port: 443,
    protocol: "https",
    timeout: 60_000,
    logging: false,
  });
  let subaccountlib = new ArSubaccounts(arweave, jwk);

  console.log(await arweave.wallets.jwkToAddress(jwk));
  const subaccount = await subaccountlib.makeSubaccount(
    await arweave.wallets.jwkToAddress(jwk),
    "test"
  );

  let data = await arweave.transactions.getData(
    "g8gs_Hbf3N-ja7AcTzHtWhVORiou4IMYAaetjQZUzsc",
    {
      decode: true,
      string: true,
    }
  );

  console.log(JSON.parse(data));

  console.log(await subaccountlib.decrypt(JSON.parse(data)));
})();
