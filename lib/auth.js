var fs = require('fs'),
	crypto = require('crypto'),
	request = require('request'),
	debug = require('debug')('google-oauth-jwt');

// constants
var GOOGLE_OAUTH2_URL = 'https://accounts.google.com/o/oauth2/token';

/**
 * Request an authentication token by submitting a signed JWT to Google OAuth2 service.
 *
 * @param {Object} options The JWT generation options.
 * @param {Function} callback The callback function to invoke with the resulting token.
 */
exports.authenticate = function (options, callback) {

	callback = callback || function () {};

	exports.encodeJWT(options, function (err, jwt) {

		if (err) return callback(err);

		return request.post(GOOGLE_OAUTH2_URL, {
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			form: {
				grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
				assertion: jwt
			}
		}, function (err, res, body) {

			if (err) {
				return callback(err);
			} else {
				debug('response from OAuth server: HTTP %d -> %j', res.statusCode, body);
			}

			try {
				body = JSON.parse(body);
			}
			catch (e) {
				return callback(new Error('failed to parse response body: ' + body));
			}

			if (res.statusCode != 200) {
				err = new Error(
					'failed to obtain an authentication token, request failed with HTTP code ' +
					res.statusCode + ': ' + body.error
				);
				err.statusCode = res.statusCode;
				err.body = body;
				return callback(err);
			}

			return callback(null, body.access_token);

		});
	});
};

/**
 * Encode a JSON Web Token (JWT) using the supplied options.
 *
 * The token represents an authentication request for a specific user and is signed with a private key to ensure
 * authenticity.
 *
 * Available options are:
 *   `options.email`: the email address of the service account (required)
 *   `options.scopes`: an array of scope URIs to demand access for (required)
 *   `options.key` or options.keyFile: the private key to use to sign the token (required)
 *   `options.expiration`: the duration of the requested token, in milliseconds (default: 1 hour)
 *   `options.delegationEmail`: an email address for which access is being granted on behalf of (optional)
 *
 * @param {Object} options The options to use to generate the JWT
 * @param {Function} callback The callback function to invoke with the encoded JSON Web Token (JWT)
 */
exports.encodeJWT = function (options, callback) {

	if (!options) throw new Error('options is required');
	if (!options.email) throw new Error('options.email is required');
	if (!options.scopes) throw new Error('options.scopes is required');
	if (!Array.isArray(options.scopes)) throw new Error('options.scopes must be an array');
	if (options.scopes.length == 0) throw new Error('options.scopes must contain at least one scope');
	if (!options.key && !options.keyFile) throw new Error('options.key or options.keyFile are required');
	callback = callback || function () {};

	debug('generating jwt for %j', options);

	var iat = Math.floor(new Date().getTime() / 1000),
		exp = iat + Math.floor((options.expiration || 60 * 60 * 1000) / 1000),
		claims = {
			iss: options.email,
			scope: options.scopes.join(' '),
			aud: GOOGLE_OAUTH2_URL,
			exp: exp,
			iat: iat
		};

	if (options.delegationEmail) {
		claims.sub = options.delegationEmail;
	}

	var JWT_header = new Buffer(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString('base64'),
		JWT_claimset = new Buffer(JSON.stringify(claims)).toString('base64'),
		unsignedJWT = [JWT_header, JWT_claimset].join('.');

	obtainKey(function (err, key) {

		if (err) return callback(err);

		try {
			var JWT_signature = crypto.createSign('RSA-SHA256').update(unsignedJWT).sign(key, 'base64'),
				signedJWT = [unsignedJWT, JWT_signature].join('.');
		} catch (e) {
			// in Node 0.12, an error is thrown
			var signErr = new Error('failed to sign JWT, the key is probably invalid');
			signErr.inner = e;
			return callback(signErr);
		}

		if (JWT_signature === '') {
			return callback(new Error('failed to sign JWT, the key is probably invalid'));
		}

		debug('signed jwt: %s', signedJWT);
		return callback(null, signedJWT);

	});

	function obtainKey(callback) {
		if (options.key && options.key != '') {
			// key is supplied as a string
			return callback(null, options.key);
		} else if (options.keyFile) {
			// read the key from the specified file
			return fs.readFile(options.keyFile, callback);
		}
		return callback(new Error(
			'key is not specified, use "options.key" or "options.keyFile" to specify the key to use to sign the JWT'
		));
	}

};
