# google-oauth-jwt

Google API OAuth2 authentication for Server to Server applications with Node.js. Requires a Service account from the
Google API console.

This library generates JWT (JSON Web Token) tokens to establish identity without an end-user being involved.
The tokens must be signed with a key that you need to generate from the API console. The tokens are generated from
the specifications found at
[https://developers.google.com/accounts/docs/OAuth2ServiceAccount](https://developers.google.com/accounts/docs/OAuth2ServiceAccount).

It also integrates with [https://github.com/mikeal/request](request) to seamlessly query Google REST APIs.

## Documentation

### Installation
```bash
npm install google-oauth-jwt
```

### Generating a key to sign the tokens

1. From the Google API Console, create a Service account
For more help:
[https://developers.google.com/console/help/#service_accounts](https://developers.google.com/console/help/#service_accounts)

2. Download the generated P12 key. IMPORTANT: keep a copy of the key, Google keeps only the public key.

3. Convert the key to PEM, so we can use it from the Node crypto module.
To do this, run the following in Terminal:
```bash
openssl pkcs12 -in downloaded-key-file.p12 -out your-key-file.pem -nodes
```
The password for the key is "notasecret", as mentioned when you downloaded the key.

### Granting access to resources that can be requested through an API

In order to query resources using the APIs, access must be granted to the Service Account. Each Google application that
has security settings must be configured individually. Access is granted using the email address of the service account.

For example, in order to list files in Google Drive, folders and files must be shared with the Service Account, by using
its email address.

Same goes for Google Calendar, Google Contacts, etc.

### Querying a RESTful Google API

In this example, we will use a modified instance of [https://github.com/mikeal/request](request) to query the
Google Drive API. This modified instance allows to automatically request and cache the token.

Note that the request options object includes a "jwt" setting to specify how to request the token. The token will
automatically be generated and inserted in the querystring for this API call. The token will also be cached and
reused for subsequent calls using the same service account and scopes.

```javascript
var request = require('google-oauth-jwt').requestWithJWT();

request({
	url: 'https://www.googleapis.com/drive/v2/files',
	jwt: {
	  // use the email address of the service account, as indicated in the API console
		email: 'my-service-account@developer.gserviceaccount.com',
		// use the PEM file we generated from the downloaded key
		keyFile: 'my-service-account-key.pem',
		// specify the scopes you which to access
		scopes: ['https://www.googleapis.com/auth/drive.readonly']
	}
}, function (err, res, body) {

	console.log(JSON.parse(body));

});
```

### Requesting the token manually

If you wish to simply request the token for use with a Google API, use the 'authenticate' method.

```javascript
var googleAuth = require('google-oauth-jwt');

googleAuth.authenticate({
  // use the email address of the service account, as indicated in the API console
  email: 'my-service-account@developer.gserviceaccount.com',
  // use the PEM file we generated from the downloaded key
  keyFile: 'my-service-account-key.pem',
  // specify the scopes you which to access
  scopes: ['https://www.googleapis.com/auth/drive.readonly']
}, function (err, token) {

  console.log(token);

});
```

### Specifying options

The following options can be specified in order to generate the JWT:

```javascript
var options = {
  // the email address of the service account (required)
  email: 'my-service-account@developer.gserviceaccount.com',
  // an array of scopes uris to request access to (required)
  scopes: [...],
  // the cryptographic key as a string, can be the contents of the PEM file
  key: 'KEY_CONTENTS',
  // the path to the PEM file to use for the cryptographic key (ignored is 'key' is defined)
  keyFile: 'KEY_CONTENTS',
  // the duration of the token in milliseconds - default is 1 hour (60 * 60 * 1000), maximum allowed by Google is 1 hour
  expiration: 3600000,
  // if access is being granted on behalf of someone else, specifies who is impersonating the service account
  delegationEmail: 'email_address'
};
```

More information:
[https://developers.google.com/accounts/docs/OAuth2ServiceAccount#formingclaimset](https://developers.google.com/accounts/docs/OAuth2ServiceAccount#formingclaimset)

## Compatibility

+ Tested with Node 0.8
+ Tested on Mac OS X 10.8

## Dependencies

+ request

## License

The MIT License (MIT)

Copyright (c) 2013, Nicolas Mercier

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
