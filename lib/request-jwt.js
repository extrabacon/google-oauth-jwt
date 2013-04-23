var TokenCache = require('./token-cache'),
	tokens = new TokenCache();

/**
 * Returns a JWT-enabled request module.
 * @param request The request instance to modify to enable JWT.
 * @returns {Function} The JWT-enabled request module.
 */
exports.requestWithJWT = function (request) {

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
			options = {uri: uri};
		} else {
			options = uri;
		}
		if (callback) options.callback = callback;

		// look for a request with JWT requirement
		if (options.jwt) {
			return tokens.get(options.jwt, function (err, token) {

				if (err) return callback(err);

				// TODO: for now the token is only passed using the query string
				options.qs = options.qs || {};
				options.qs.access_token = token;
				return request(uri, options, callback);

			});
		} else {
			return request(uri, options, callback);
		}

	};
};

/**
 * Resets the token cache, clearing previously requested tokens.
 */
exports.resetCache = function () {
	tokens.clear();
};

