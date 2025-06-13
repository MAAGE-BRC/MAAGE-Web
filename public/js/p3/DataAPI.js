// Return a singleton instance of the BVBVRC API Client which
// exists globally as BVBRCClient

define([], function () {
  // Initialize the client with the endpoint and auth token
  var endpoint = window.App && window.App.dataAPI;
  var token = window.App && window.App.authorizationToken;
  
  if (!window.BVBRCClient) {
    console.error('BVBRCClient not loaded');
    return null;
  }
  
  var client = new BVBRCClient(endpoint, token);
  
  // Update token when it changes
  if (window.App) {
    Object.defineProperty(window.App, 'authorizationToken', {
      get: function() { return this._authToken; },
      set: function(value) {
        this._authToken = value;
        if (client && value) {
          client.token = value;
        }
      }
    });
    // Set initial value
    window.App._authToken = token;
  }
  
  return client;
});
