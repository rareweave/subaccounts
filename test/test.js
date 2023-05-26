(async () => {
  let Arweave = require("arweave");
  let ArSubaccounts = require("../src/index");
  let jwk = require("./jwk.json");
  let arweave = Arweave.init({
    host: "prophet.rareweave.store",
    port: 443,
    protocol: "https",
    timeout: 60_000,
    logging: false,
  });
  let SubAccounts = new ArSubaccounts(
    arweave,
    jwk,
    "https://prophet.rareweave.store/graphql"
  );

  console.log(await arweave.wallets.jwkToAddress(jwk));
  // const subaccount = await SubAccounts.makeSubaccount(
  //   await arweave.wallets.jwkToAddress(jwk),
  //   "Yeher"
  // );

  let tx = await SubAccounts.fetchMaster(
    "quACgoeeEXdm7rzwetcJ0pJ4re-omYK4YQrdQ0nPxDtj3MAR3ZnqyF-UZTzwU43AM1yxL-rDnq-nnoHlct8N5gRyI-QdyEd6bjJXvYHhcH_8ro6b6T2gf7d-DAKctoFlsiQoreQ4qlxwR7BAm2qbKv31F-7iNmkx-5GzW-jq22GvHgptLqcG9H9OyLPgMOjoWvM-oQNPvA1-Mxd4HZHzANihW5vCAS93xZ1fDvhXWgtYK91aeBJ3VybDCt206TeUUwKbKYYB3zR7A6Ze7uOJC61pFxjJsg9F8z42AVF9fTZXM_A1gsQ-h0HZaW2OgHuMEWpLjrgtu_CUZ1yJn5m_BhHWGBMimLu-cvUaNAV9sp5UPAasZgIXa4YkywjPOcORrF4HWTUtb_IvZy0pGWj5fFTz0wJobBRovCERObzdz0pZp8vxHobbdcYkOjGt2TREDQKVKeQo4W2ib5eQYfP8FRJMhka8V33vCx5qIdF6QotE4zVnAvzENyXQ4m1Rb3Xy0JIFCLGQQBbp-oiu0WvxUzuX-O2iEzqrUdxH4_HXfKF9lK3SHFoHjWLPR2sH1okkjiYbp65rhKmx74qUERaqlLCKVLDok90Ty6tcFkcchS9p5FShXrRw7qBAp3Fr6ggosim6Y_Qqgq6AtErAK_WXJbyrydijHMTtW_ogFcnJ2xs",
    "ssss"
  );

  console.log(tx);
})();
