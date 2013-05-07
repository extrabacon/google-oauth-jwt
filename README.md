# google-oauth-jwt

Google OAuth 2.0 authentication for server-to-server applications with Node.js.

This library generates [JWT](http://self-issued.info/docs/draft-ietf-oauth-json-web-token.html) tokens to establish
identity to an API, without an end-user being involved. This is the preferred scenario for server-side communications.
It can be used to interact with Google APIs requiring access to user data (such as Google Drive, Calendar, etc.) for
which URL-based callbacks and user authorization prompts are not appropriate.

Tokens are generated for a service account, which is created from the Google API console. Service accounts must also
be granted access to resources, using traditional assignation of permissions using the unique service account email
address.

The authentication process is implemented following the specifications found
[here](https://developers.google.com/accounts/docs/OAuth2ServiceAccount).

The package also integrates with [request](https://github.com/mikeal/request) to seamlessly query Google RESTful APIs,
which is optional. Integration with [request](https://github.com/mikeal/request) provides automatic requesting of
tokens, as well as built-in token caching.

## Documentation

### Installation
```bash
npm install google-oauth-jwt
```

### Generating a key to sign the tokens

1. From the [Google API Console](https://code.google.com/apis/console/), create a
  [service account](https://developers.google.com/console/help/#service_accounts).

2. Download the generated P12 key.

   IMPORTANT: keep a copy of the key, Google keeps only the public key.

3. Convert the key to PEM, so we can use it from the Node crypto module.

   To do this, run the following in Terminal:
   ```bash
   openssl pkcs12 -in downloaded-key-file.p12 -out your-key-file.pem -nodes
   ```

   The password for the key is `notasecret`, as mentioned when you downloaded the key.

### Granting access to resources to be requested through an API

In order to query resources using the API, access must be granted to the service account. Each Google application that
has security settings must be configured individually. Access is granted by assigning permissions to the service
account, using its email address found in the API console.

For example, in order to list files in Google Drive, folders and files must be shared with the service account email
address. Likewise, to access a calendar, the calendar must be shared with the service account.

### Querying a RESTful Google API with "request"

In this example, we use a modified instance of [request](https://github.com/mikeal/request) to query the
Google Drive API. The modified request module handles the token automatically using a `jwt` setting passed to
the `request` function.

```javascript
// obtain a JWT-enabled version of request
var request = require('google-oauth-jwt').requestWithJWT();

request({
  url: 'https://www.googleapis.com/drive/v2/files',
  jwt: {
    // use the email address of the service account, as seen in the API console
    email: 'my-service-account@developer.gserviceaccount.com',
    // use the PEM file we generated from the downloaded key
    keyFile: 'my-service-account-key.pem',
    // specify the scopes you wish to access - each application has different scopes
    scopes: ['https://www.googleapis.com/auth/drive.readonly']
  }
}, function (err, res, body) {
	console.log(JSON.parse(body));
});
```

Note that the `options` object includes a `jwt` object we use to configure how to encode the JWT. The token will then
automatically be requested and inserted in the query string for this API call. It will also be cached and
reused for subsequent calls using the same service account and scopes.

### Requesting the token manually

If you wish to simply request the token for use with a Google API, use the `authenticate` method.

```javascript
var googleAuth = require('google-oauth-jwt');

googleAuth.authenticate({
  // use the email address of the service account, as seen in the API console
  email: 'my-service-account@developer.gserviceaccount.com',
  // use the PEM file we generated from the downloaded key
  keyFile: 'my-service-account-key.pem',
  // specify the scopes you wish to access
  scopes: ['https://www.googleapis.com/auth/drive.readonly']
}, function (err, token) {
  console.log(token);
});
```

If you want to use the built-in token cache, use the `TokenCache` class. Tokens are cached using the email address and
the scopes as the key.

```javascript
var TokenCache = require('google-oauth-jwt').TokenCache,
    tokens = new TokenCache();

tokens.get({
  // use the email address of the service account, as seen in the API console
  email: 'my-service-account@developer.gserviceaccount.com',
  // use the PEM file we generated from the downloaded key
  keyFile: 'my-service-account-key.pem',
  // specify the scopes you wish to access
  scopes: ['https://www.googleapis.com/auth/drive.readonly']
}, function (err, token) {
  console.log(token);
});
```

Using `TokenCache` will request only one token for multiple concurrent requests to `get`. A new token request will
automatically be issued if the token is expired.

### Encoding JWT manually

It is also possible to encode the JWT manually using the `encodeJWT` method.

```javascript
var googleAuth = require('google-oauth-jwt');

googleAuth.encodeJWT({
  // use the email address of the service account, as seen in the API console
  email: 'my-service-account@developer.gserviceaccount.com',
  // use the PEM file we generated from the downloaded key
  keyFile: 'my-service-account-key.pem',
  // specify the scopes you which to access
  scopes: ['https://www.googleapis.com/auth/drive.readonly']
}, function (err, jwt) {
  console.log(jwt);
});
```

### Specifying options

The following options can be specified in order to generate the JWT:

```javascript
var options = {

  // the email address of the service account (required)
  // this information is obtained via the API console
  email: 'my-service-account@developer.gserviceaccount.com',

  // an array of scopes uris to request access to (required)
  // different scopes are available for each application (refer to the app documentation)
  // scopes are NOT permission levels, but limitations applied to the API access
  // so remember to also grant permissions for the application!
  scopes: [...],

  // the cryptographic key as a string, can be the contents of the PEM file
  // the key will be used to sign the JWT and validated by Google OAuth
  key: 'KEY_CONTENTS',

  // the path to the PEM file to use for the cryptographic key (ignored if 'key' is also defined)
  // the key will be used to sign the JWT and validated by Google OAuth
  keyFile: 'path_to/key.pem',

  // the duration of the requested token in milliseconds (optional)
  // default is 1 hour (60 * 60 * 1000), which is the maximum allowed by Google
  expiration: 3600000,

  // if access is being granted on behalf of someone else, specifies who is impersonating the service account
  delegationEmail: 'email_address@mycompany.com',

  // turns on simple console logging for debugging
  debug: false

};
```

Options are used to encode the JWT that will be sent to Google OAuth servers in order to issue a token that can then be
used for the APIs.

For more information:
[https://developers.google.com/accounts/docs/OAuth2ServiceAccount#formingclaimset](https://developers.google.com/accounts/docs/OAuth2ServiceAccount#formingclaimset)

## Changelog

* 0.0.4: fixed pending callbacks accumulating indefinitely in TokenCache
* 0.0.3: introduction of TokenCache
* 0.0.2: improved error handling and documentation
* 0.0.1: initial version

## Compatibility

+ Tested with Node 0.8
+ Tested on Mac OS X 10.8

## Dependencies

+ [request](https://github.com/mikeal/request)

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
