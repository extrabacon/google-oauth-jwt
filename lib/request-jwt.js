var TokenCache = require('./token-cache');

/**
 * Returns a Google OAuth2 enabled request module.
 * The modified function accepts a "jwt" setting in the options parameter to configure token-based authentication.
 *
 * When a "jwt" setting is defined, a token will automatically be requested (or reused) and inserted into the
 * "authorization" header.
 *
 * The "jwt" setting accepts the following parameters:
 *   `email`: the email address of the service account (required)
 *   `scopes`: an array of scope URIs to demand access for (required)
 *   `key` or `keyFile`: the private key to use to sign the token (required)
 *   `expiration`: the duration of the requested token, in milliseconds (default: 1 hour)
 *   `delegationEmail`: an email address for which access is being granted on behalf of (optional)
 *
 * @param {Object} tokens The TokenCache instance to use. If not specified, `TokenCache.global` will be used.
 * @param {Function} request The request module to modify to enable Google OAuth2 support. If not supplied, the bundled
 * version will be used.
 * @returns {Function} The modified request module with Google OAuth2 support.
 */
exports.requestWithJWT = function (tokens, request) {

	if (typeof tokens === 'function') {
		request = tokens;
		tokens = null;
	}
	if (!tokens) {
		// use the global token cache
		tokens = TokenCache.global;
	}
	if (!request) {
		// use the request module from our dependency
		request = require('request');
	}

	var _init = request.Request.prototype.init;

	request.Request.prototype.init = function initWithJWT(options) {
		var self = this;
		if (options && options.jwt) {
			tokens.get(options.jwt, function (err, token) {
				if (err) return options.callback(err);
				options.auth = { bearer: token };
				_init.call(self, options);
			});
			delete options.jwt;
		} else {
			return _init.call(self, options);
		}
	}

	return request;

};
