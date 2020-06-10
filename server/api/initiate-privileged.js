const { transactionLineItems } = require('../api-util/lineItems');
const { getSdk, getTrustedSdk, handleError, serialize, deserialize } = require('../api-util/sdk');

const debug = (...args) => {
  const formattedArgs = args.map(arg => {
    if (typeof arg === 'object') {
      return JSON.stringify(arg, null, '  ');
    }
    return arg;
  });
  console.log.apply(console, formattedArgs);
};

module.exports = (req, res) => {
  // const { isSpeculative, bookingData, bodyParams, queryParams } = deserialize(req.body);
  const { isSpeculative, bookingData, bodyParams, queryParams } = req.body;

  const listingId = bodyParams && bodyParams.params ? bodyParams.params.listingId : null;

  debug('================================================================');
  debug('initiate privileged');
  debug('isSpeculative:', isSpeculative);
  debug('listingId:', listingId);

  const sdk = getSdk(req, res);
  let lineItems = null;

  sdk.listings
    .show({ id: listingId })
    .then(listingResponse => {
      const listing = listingResponse.data.data;
      lineItems = transactionLineItems(listing, bookingData);

      return getTrustedSdk(req);
    })
    .then(trustedSdk => {
      debug('initiating tx with trusted SDK');

      const { params } = bodyParams;

      // Add lineItems to the body params
      const body = {
        ...bodyParams,
        params: {
          ...params,
          lineItems,
        },
      };

      // debug('calling tx initiate with body params:', body, 'and query params:', queryParams);
      debug('calling tx initiate');

      if (isSpeculative) {
        return trustedSdk.transactions.initiateSpeculative(body, queryParams);
      }
      return trustedSdk.transactions.initiate(body, queryParams);
    })
    .then(apiResponse => {
      // debug('response from tx initiate:', apiResponse);
      debug('tx initiate success');
      const { status, statusText, data } = apiResponse;
      res
        .status(status)
        // TODO: set content type header
        .send(
          serialize({
            status,
            statusText,
            data,
          })
        )
        .end();
    })
    .catch(e => {
      handleError(res, e);
    });
};
