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

	return function (uri, options, callback) {
		
		if (typeof uri === 'undefined') throw new Error('undefined is not a valid uri or options object.');
		if ((typeof options === 'function') && !callback) callback = options;
		if (options && typeof options === 'object') {
			options.uri = uri;
		} else if (typeof uri === 'string') {
			options = { uri: uri };
		} else {
			options = uri;
		}
		if (callback) options.callback = callback;
	
		// look for a request with JWT requirement and perform authentication transparently
		if (options.jwt) {
			return tokens.get(options.jwt, function (err, token) {
				if (err) return callback(err);
				options.headers = options.headers || {};
				options.headers.authorization = 'Bearer ' + token;
				return request(options, callback);
			});
		} else {
			return request(options, callback);
		}
		
	};
};
