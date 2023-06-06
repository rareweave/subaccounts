(async () => {
  let Arweave = require('arweave');
  let ArSubaccounts = require('../src/index');
  let jwk = require('../jwk.json');
  let arweave = Arweave.init({
    host: 'prophet.rareweave.store',
    port: 443,
    protocol: 'https',
    timeout: 60_000,
    logging: false,
  });
  let SubAccounts = new ArSubaccounts(arweave, jwk, 'https://arweave.net/graphql');
  console.log(await SubAccounts.useSubaccount("Test2"))

  // console.log(await arweave.transactions.sign(subaccount, jwk));
  // console.log(await arweave.transactions.post(subaccount));
  // let tx = await SubAccounts.fetchMaster(
  //   'qkLzauXrJOkaD--23J90W3O-TgRePUKG_ExzSm5xqk5OrAtFTnvySiGYN2uPfDi34tuQ3HIRxLIJ-893Z_Xg-Ev0FH0Tssg3nfBUNPnSIMce_haBjLhuijbi77bxrw2qPC9UIBpfHfIy7O0JKpAL_0qLuKiIzhtt23YGrnVib_P4dRh28B4QuZj_fjK7i4DDluwlDxp7TkgGT2bYXOPVu9eQPeKNzxqQTlGQqGgmnabxEeF19NlvBCatHVGrmirukrWkk4NZmOi-s1sMd0AqA7j-9JCwT9Vm92oXUhvaSgAGv9I4bScobosAdxT0hSaI5-i-mtfpRWCs9VVWw0I2BDnch9MdytHR0SgJ5Z8qcn1Q6wW4QYdDhUDHSFtTp7vAwQUg0Y5IRXY2bXflGJFmICLZTj8iRgo0o2ePEvTQ4Sy5Rlm23lt162pgwhvWFYHfc3LmCcIZ453PUouLFYckf2EJ01AMmicfD9l6kEmEAvtwPH3Gi_7OECYLHjr62e3EQa6TxZ5G3qMBKuHb6uf2I3JI9oiSXcn0QDLfADFxMYZi3eY-TQ3ifxjBCVLFecAirho7k33uLwYio7yVeXy4Ff9po4wBjFGNUNPDPuLUCFUkjQLFQltXtRmyVawXpNrZ6h4kk14vcedWzQw_K0_5ER7k-4ug_vi9-4qBffHsshk',
  //   'ssdsdsss',
  // );

  // console.log(tx);
})();
