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

	var interceptor = function (fn) {
		return function (uri, options, callback) {
			var params = request.initParams(uri, options, callback);
			if (params.jwt) {
				return tokens.get(params.jwt, function (err, token) {
					if (err) return params.callback(err);
					params.headers = params.headers || {};
					params.headers.authorization = 'Bearer ' + token;
					fn(params.uri || null, params, params.callback);
				});
			} else {
				return fn(params.uri || null, params, params.callback);
			}
		};
	};

	var requestProxy = interceptor(request);
	requestProxy._request = request;
	requestProxy.get = interceptor(request.get);
	requestProxy.post = interceptor(request.post);
	requestProxy.put = interceptor(request.put);
	requestProxy.patch = interceptor(request.patch);
	requestProxy.head = interceptor(request.head);
	requestProxy.del = interceptor(request.del);
	requestProxy.defaults = request.defaults;
	requestProxy.forever = request.forever;
	requestProxy.jar = request.jar;
	requestProxy.cookie = request.cookie;
	return requestProxy;
};
