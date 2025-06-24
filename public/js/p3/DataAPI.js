define([], function () {
  
  var endpoint = window.App && window.App.dataAPI;
  var token = window.App && window.App.authorizationToken;
  
  if (!window.BVBRCClient) {
    console.error('BVBRCClient not loaded');
    return null;
  }
  
  var client = new BVBRCClient(endpoint, token);
  
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
    
    window.App._authToken = token;
  }
  
  return client;
});
