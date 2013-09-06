var auth = require('./lib/auth'),
	request = require('./lib/request-jwt');

exports.TokenCache = require('./lib/token-cache');
exports.authenticate = auth.authenticate;
exports.encodeJWT = auth.encodeJWT;
exports.requestWithJWT = request.requestWithJWT;
