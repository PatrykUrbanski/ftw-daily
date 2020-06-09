const { transactionLineItems } = require('../api-util/lineItems');
const { constructValidLineItems } = require('../api-util/lineItemHelpers');
const { getSdk, handleError } = require('../api-util/sdk');

module.exports = (req, res) => {
  const { isOwnListing, listingId, bookingData } = req.body;

  const sdk = getSdk(req, res);

  const listingPromise = isOwnListing
    ? sdk.ownListings.show({ id: listingId })
    : sdk.listings.show({ id: listingId });

  listingPromise
    .then(apiResponse => {
      const listing = apiResponse.data.data;
      const lineItems = transactionLineItems(listing, bookingData);

      // Because we are using returned lineItems directly in FTW we need to use helper to
      // add some attributes like lineTotal and reversal that Marketplace API also adds to response
      const validLineItems = constructValidLineItems(lineItems);

      res
        .status(200)
        .json(validLineItems)
        .end();
    })
    .catch(e => {
      handleError(res, e);
    });
};
