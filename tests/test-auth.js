var async = require('async'),
	expect = require('chai').expect,
	PythonShell = require('../lib/python-shell');

describe('auth', function () {

	describe('encodeJWT', function () {

		it('should sign a token with a string-based key', function (done) {

		});

		it('should sign a token with a key obtained from a file', function (done) {
			
		});
		
		it('should fail when signing with an invalid key', function (done) {
			
		});

	});
	
	describe('authenticate', function () {

		it('should return a valid token for a legitimate request', function (done) {

		});
		
		it('should fail for an invalid request', function (done) {

		});

	});

});
