var moduleToTest = require('..'),
	_ = require('underscore'),
	async = require('async'),
	fs = require('fs'),
	chai = require('chai'),
	spies = require('chai-spies'),
	expect = chai.expect,
	jwt_settings = require('./jwt-settings.json');

console.log('WARNING: running these tests require a per-user configuration!!');
console.log('To specify your configuration, copy `jwt-settings.json.sample` to `jwt-settings.json`');
console.log('\nMake sure that your service account is setup, has been granted access to the requested scopes, and that you have converted your key to PEM');

chai.use(spies);

function jwtSettings(settings) {
	return _.extend({}, jwt_settings, settings);
}

describe('encodeJWT()', function () {

	it('should sign a token with a string-based key', function (done) {

		// read the key from the file
		var key = ''+fs.readFileSync(jwt_settings.keyFile);
		expect(key).to.not.be.null.and.to.be.a.string;
		expect(key).to.have.length.above(1);

		moduleToTest.encodeJWT(jwtSettings({ key: key }), function (err, jwt) {
			if (err) throw err;
			expect(jwt).to.not.be.null.and.to.be.a.string;
			expect(jwt).to.have.length.above(1);
			done();
		});

	});

	it('should sign a token with a key obtained from a file', function (done) {
		moduleToTest.encodeJWT(jwtSettings(), function (err, jwt) {
			if (err) throw err;
			expect(jwt).to.not.be.null.and.to.be.a.string;
			expect(jwt).to.have.length.above(1);
			done();
		});
	});

	it('should fail when options are missing or invalid', function () {
		function encodeJWT(settings) {
			return function () {
				moduleToTest.encodeJWT(settings);
			}
		}
		expect(encodeJWT(null)).to.throw(Error);
		expect(encodeJWT({})).to.throw(/email/);
		expect(encodeJWT({ key: 'key', scopes: ['scope'] })).to.throw(/email/);
		expect(encodeJWT({ email: 'email', scopes: ['scope'] })).to.throw(/key/);
		expect(encodeJWT({ email: 'email', key: 'key' })).to.throw(/scopes/);
		expect(encodeJWT({ email: 'email', key: 'key', scopes: '' })).to.throw(/scopes/);
		expect(encodeJWT({ email: 'email', key: 'key', scopes: [] })).to.throw(/scopes/);
	});

	it('should fail when signing with an invalid key', function (done) {
		moduleToTest.encodeJWT(jwtSettings({ key: 'this is not a key' }), function (err, jwt) {
			expect(err).to.be.an.instanceOf(Error);
			expect(jwt).to.be.undefined;
			done();
		});
	});

});

describe('authenticate()', function () {

	it('should return a valid token for a legitimate request', function (done) {
		moduleToTest.authenticate(jwtSettings(), function (err, token) {
			if (err) throw err;
			expect(token).to.not.be.null.and.to.be.a.string;
			expect(token).to.have.length.above(1);
			done();
		});
	});

	it('should fail for an invalid request', function (done) {
		moduleToTest.authenticate(jwtSettings({ email: 'invalid email!' }), function (err, token) {
			expect(err).to.be.an.instanceOf(Error);
			expect(token).to.be.undefined;
			done();
		});
	});

});

describe('TokenCache', function () {

	var fakeAuth = function (options, callback) {
		callback(null, 'fake_token');
	};

	describe('get()', function () {

		it('should request a token on first call', function (done) {
			var tokens = new moduleToTest.TokenCache();
			tokens.authenticate = chai.spy(fakeAuth);

			tokens.get(jwtSettings(), function (err, token) {
				if (err) throw err;
				expect(tokens.authenticate).to.have.been.called.once;
				expect(token).to.equal('fake_token');
				done();
			});
		});

		it('should reuse a token on subsequent calls', function (done) {

			var tokens = new moduleToTest.TokenCache();
			tokens.authenticate = chai.spy(fakeAuth);

			tokens.get(jwtSettings(), function (err, firstToken) {
				if (err) throw err;
				expect(tokens.authenticate).to.have.been.called.once;

				// request tokens at different intervals
				async.each([100, 200, 500], function (interval, next) {
					setTimeout(function () {
						tokens.get(jwt_settings, function (err, cachedToken) {
							if (err) throw err;
							expect(cachedToken).to.equal(firstToken);
							expect(tokens.authenticate).to.have.been.called.once;
							next();
						});
					}, interval);
				}, done);

			});
		});

		it('should issue only one request on concurrent calls', function (done) {

			var tokens = new moduleToTest.TokenCache();
			tokens.authenticate = chai.spy(fakeAuth);
			tokens.get = chai.spy(tokens.get);

			// make 5 simultaneous calls on an empty cache - only one should make the request
			async.parallel([
				function (next) { tokens.get(jwt_settings, next) },
				function (next) { tokens.get(jwt_settings, next) },
				function (next) { tokens.get(jwt_settings, next) },
				function (next) { tokens.get(jwt_settings, next) },
				function (next) { tokens.get(jwt_settings, next) }
			], function (err, results) {
				if (err) throw err;
				expect(tokens.authenticate).to.have.been.called.once;
				expect(tokens.get).to.have.been.called.exactly(5);
				results.forEach(function (token) {
					expect(token).to.equal('fake_token');
				});
				done();
			});

		});

		it('should discard an expired token and request another one', function (done) {

			var settings = jwtSettings({ expiration: 500 });
			var tokens = new moduleToTest.TokenCache();
			tokens.authenticate = chai.spy(fakeAuth);

			async.auto({
				initial_request: function (next) {
					// this token should expire after 500ms
					tokens.get(settings, function (err, token) {
						expect(tokens.authenticate).to.have.been.called.once;
						next(err);
					});
				},
				wait_for_expiration: function (next) {
					setTimeout(next, settings.expiration + 5);
				},
				get_new_token: ['wait_for_expiration', function (next) {
					// the token should no longer be available, a new request should be made
					tokens.get(settings, function (err, token) {
						expect(tokens.authenticate).to.have.been.called.twice;
						next(err);
					});
				}]
			}, done);

		});
	});

	describe('clear()', function () {

		it('should remove previously requested tokens', function (done) {

			var tokens = new moduleToTest.TokenCache();
			expect(_.keys(tokens._cache)).to.be.empty;

			tokens.get(jwtSettings(), function (err, token) {
				if (err) throw err;
				expect(_.keys(tokens._cache)).to.have.length(1);
				tokens.clear();
				expect(_.keys(tokens._cache)).to.be.empty;
				done();
			});

		});
	});
});

describe('requestWithJWT', function () {

	it('should work normally, without jwt settings', function (done) {
		var request = moduleToTest.requestWithJWT();
		request('http://www.google.com/', function (err, res) {
			expect(res.statusCode).to.equal(200);
			done(err);
		});
	});

	it('should request a token automatically', function (done) {

		var tokens = new moduleToTest.TokenCache();
		tokens.get = chai.spy(tokens.get);
		tokens.authenticate = chai.spy(tokens.authenticate);

		var request = moduleToTest.requestWithJWT(tokens);

		// test multiple variants of calls to request
		async.parallel({
			get_helper: function (next) {
				request.get(jwt_settings.test_url, { jwt: jwtSettings() }, function (err, res, body) {
					expect(res.statusCode).to.equal(200);
					next(err);
				});
			},
			with_url_and_options: function (next) {
				request(jwt_settings.test_url, { jwt: jwtSettings() }, function (err, res, body) {
					expect(res.statusCode).to.equal(200);
					next(err);
				});
			},
			only_with_options: function (next) {
				request({
					url: jwt_settings.test_url,
					jwt: jwtSettings()
				}, function (err, res, body) {
					expect(res.statusCode).to.equal(200);
					next(err);
				});
			}
		}, function (err) {
			if (err) throw err;
			expect(tokens.get).to.have.been.called.exactly(3);
			expect(tokens.authenticate).to.have.been.called.once;
			done();
		});

	});

	it('should use a global token cache', function (done) {

		var tokens = moduleToTest.TokenCache.global;
		tokens.get = chai.spy(tokens.get);
		tokens.authenticate = chai.spy(tokens.authenticate);

		// clear the global cache in case it has been used by other tests
		tokens.clear();
		expect(_.keys(tokens._cache)).to.have.length(0);

		function requestWithoutTokenCache(next) {
			// use a new instance each time
			var request = moduleToTest.requestWithJWT();
			request({
				url: jwt_settings.test_url,
				jwt: jwtSettings()
			}, function (err, res, body) {
				expect(res.statusCode).to.equal(200);
				next(err);
			});
		}

		// perform 3 simultaneous requests with 3 separate instances - the same cache should be used
		async.parallel([
			requestWithoutTokenCache,
			requestWithoutTokenCache,
			requestWithoutTokenCache
		], function (err) {
			if (err) throw er
			expect(_.keys(tokens._cache)).to.have.length(1);
			expect(tokens.get).to.have.been.called.exactly(3);
			expect(tokens.authenticate).to.have.been.called.once;
			done();
		});

	});

});
