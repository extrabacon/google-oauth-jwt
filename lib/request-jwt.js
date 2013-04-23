var auth = require('./auth'),
	tokenCache = {},
	cacheInvalidations = [];

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

		// look for a request with JWT requirements
		if (options.jwt) {
			return getToken(options.jwt, function (err, token) {

				if (err) return callback(err);

				// TODO: for now the token is only passed using the query string
				// insert the token in the query string
				options.qs = options.qs || {};
				options.qs.access_token = token;
				request(uri, options, callback);

			});
		} else {
			return request(uri, options, callback);
		}

	};

	function getToken(options, callback) {

		var key = options.email + ':' + options.scopes.join('|');

		if (tokenCache[key]) {
			// token is already available, return it now
			callback(null, tokenCache[key]);
		} else {
			// token must be retrieved
			auth.authenticate(options, function (err, token) {

				if (err) return callback(err);

				// store the token for reuse
				tokenCache[key] = token;

				// setup token expiration
				cacheInvalidations.push(setTimeout(function () {
					delete tokenCache[key];
				}, (options.expiration || 60 * 60 * 1000)));

				return callback(null, token);
			});
		}
	}
};

/**
 * Resets the token cache, clearing previously requested tokens.
 */
exports.resetCache = function () {
	cacheInvalidations.forEach(function (timerId) {
		clearTimeout(timerId);
	});
	tokenCache = {};
};

