var auth = require('./auth');

module.exports = function TokenCache() {

	var self = this;
	this._cache = {};

	/**
	 * Retrieve an authentication token, or reuse a previously obtained one if it is not expired.
	 * Only one request will be performed for any combination of `options.email` and `options.scopes`.
	 *
	 * @param options The JWT generation options.
	 */
	TokenCache.prototype.get = function (options, callback) {

		var key = options.email + ':' + options.scopes.join(',');

		if (!self._cache[key]) {
			self._cache[key] = new TokenRequest(options);
		}

		self._cache[key].get(callback);

	};

	/**
	 * Clear all cached tokens previously requested by this instance.
	 */
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
			// wait for the pending request instead of issuing a new one
			this.pendingCallbacks.push(callback);
		} else if (this.status == 'completed') {

			if (this.issued + this.duration < new Date().getTime()) {
				this.status = 'expired';
				this.get(callback);
			} else {
				callback(null, this.token);
			}

		}
	};

	function fireCallbacks(err, token) {
		// execute accumulated callbacks during the 'pending' state
		self.pendingCallbacks.forEach(function (callback) {
			callback(err, token);
		});
		self.pendingCallbacks = [];
	}
}
