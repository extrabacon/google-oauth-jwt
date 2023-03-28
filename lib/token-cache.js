var debug = require('debug')('google-oauth-jwt');

/**
 * A cache of tokens for reusing previously requested tokens until they expire.
 *
 * Tokens are requested by calling the `authenticate` method and cached for any combination of `options.email` and
 * `options.scopes`.
 *
 * @constructor TokenCache
 */
function TokenCache() {
	// cache is just a key/value pair
	this._cache = {};
};

/**
 * Retrieve an authentication token, or reuse a previously obtained one if it is not expired.
 * Only one request will be performed for any combination of `options.email`, `options.scopes`
 * and `options.delegationEmail`.
 *
 * @param options The JWT generation options.
 * @callback {Function} The callback to invoke with the resulting token.
 */
TokenCache.prototype.get = function (options, callback) {
	var key = options.email + ':' + options.scopes.join(',');
	if (options.delegationEmail) key += ':' + options.delegationEmail;
	if (!this._cache[key]) {
		this._cache[key] = new TokenRequest(this.authenticate, options);
	}
	this._cache[key].get(callback);
};

/**
 * Clear all tokens previously requested by this instance.
 */
TokenCache.prototype.clear = function () {
	this._cache = {};
};

/**
 * The method to use to perform authentication and retrieving a token.
 * Used for overriding the authentication mechanism.
 *
 * @param {Object} options The JWT generation options.
 * @callback {Function} callback The callback to invoke with the resulting token.
 */
TokenCache.prototype.authenticate = require('./auth').authenticate;

/**
 * A single cacheable token request with support for concurrency.
 * @private
 * @constructor
 */
function TokenRequest(authenticate, options) {

	this.status = 'expired';
	this.pendingCallbacks = [];

	// execute accumulated callbacks during the 'pending' state
	TokenRequest.prototype.fireCallbacks = function (err, token) {
		this.pendingCallbacks.forEach(function (callback) {
			callback(err, token);
		});
		this.pendingCallbacks = [];
	}

	TokenRequest.prototype.get = function (callback) {
		var self = this;

		if (self.status == 'expired') {

			self.status = 'pending';
			self.pendingCallbacks.push(callback);

			authenticate(options, function (err, token) {
				if (err) {
					self.status = 'expired';
					return self.fireCallbacks(err, null);
				}
				self.issued = Date.now();
				self.duration = options.expiration || 60 * 60 * 1000;
				self.token = token;
				self.status = 'completed';
				return self.fireCallbacks(null, token);
			});

		} else if (self.status == 'pending') {
			// wait for the pending request instead of issuing a new one
			self.pendingCallbacks.push(callback);
		} else if (self.status == 'completed') {

			if (self.issued + self.duration < Date.now()) {
				self.status = 'expired';
				debug('token is expired, a new token will be requested');
				self.get(callback);
			} else {
				callback(null, self.token);
			}

		}
	};
}

/**
 * The global token cache that can be used as a default instance.
 * @type TokenCache
 */
TokenCache.global = new TokenCache();

module.exports = TokenCache;
