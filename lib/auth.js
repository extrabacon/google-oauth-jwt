var fs = require('fs'),
	crypto = require('crypto'),
	request = require('request');

/**
 * Requests a token by submitting a signed JWT.
 * @param options The JWT generation options.
 * @param callback
 */
exports.authenticate = function (options, callback) {

	callback = callback || function () { };

	exports.encodeJWT(options, function (err, jwt) {

		if (err) return callback(err);

		return request.post('https://accounts.google.com/o/oauth2/token', {
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			form: {
				grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
				assertion: jwt
			}
		}, function (err, res, body) {

			if (err) return callback(err);

			if (res.statusCode == 200) {
				try {
					return callback(undefined, JSON.parse(body).access_token);
				} catch (parseErr) {
					return callback(parseErr);
				}
			}

			return callback(new Error("Unable to request an access token (HTTP " + res.statusCode + ') : ' + body));
		});
	});

};

/**
 * Encodes a JWT using the supplied options.
 * @param options The options to use to generate the JWT.
 * @param callback
 */
exports.encodeJWT = function (options, callback) {

	var iat = Math.floor(new Date().getTime() / 1000),
		exp = iat + Math.floor((options.expiration || 60 * 60 * 1000) / 1000),
		claims = {
			iss: options.email,
			scope: options.scopes.join(' '),
			aud: 'https://accounts.google.com/o/oauth2/token',
			exp: exp,
			iat: iat
		};

	if (options.delegationEmail) {
		claims.prn = options.delegationEmail;
	}

	var JWT_header = new Buffer(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString('base64'),
		JWT_claimset = new Buffer(JSON.stringify(claims)).toString('base64'),
		unsignedJWT = [JWT_header, JWT_claimset].join('.');

	obtainKey(function (err, key) {

		if (err) return callback(err);

		var JWT_signature = crypto.createSign('RSA-SHA256').update(unsignedJWT).sign(key, 'base64'),
			signedJWT = [unsignedJWT, JWT_signature].join('.');

		return callback(undefined, signedJWT);

	});

	function obtainKey(callback) {

		if (options.key) {
			return callback(undefined, options.key);
		} else if (options.keyFile) {
			return fs.readFile(options.keyFile, callback);
		}

		return callback(new Error('Key is not specified. Use options.key or options.keyFile to specify a key.'));
	}

};
