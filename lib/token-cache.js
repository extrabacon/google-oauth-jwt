var auth = require('./auth');

module.exports = function TokenCache() {

	var self = this;
	this._cache = {};

	TokenCache.prototype.get = function (options, callback) {

		var key = options.email + ':' + options.scopes.join(',');

		if (!self._cache[key]) {
			self._cache[key] = new TokenRequest(options);
		}

		self._cache[key].get(callback);

	};

	TokenCache.prototype.clear = function () {
		self._cache = {};
	};

};

function TokenRequest(options) {

	var self = this;
	this.status = 'expired';
	this.pendingCallbacks = [];

	this.get = function (callback) {

		if (this.status == 'expired') {

			this.status = 'pending';
			this.pendingCallbacks.push(callback);

			auth.authenticate(options, function (err, token) {

				if (err) return fireCallbacks(err, null);

				self.issued = new Date().getTime();
				self.duration = options.expiration || 60 * 60 * 1000;
				self.token = token;
				self.status = 'completed';
				return fireCallbacks(null, token);

			});

		} else if (this.status == 'pending') {
			this.pendingCallbacks.push(callback);
		} else if (this.status == 'completed') {

			if (this.issued + this.duration > new Date().getTime()) {
				this.status = 'expired';
				this.get(callback);
			} else {
				callback(null, this.token);
			}

		}
	};

	function fireCallbacks(err, token) {
		self.pendingCallbacks.forEach(function (callback) {
			callback(err, token);
		});
		self.pendingCallbacks = [];
	}
}
