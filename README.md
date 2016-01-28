# google-oauth-jwt

Google OAuth 2.0 authentication for server-to-server applications with Node.js.

This library generates [JWT](http://self-issued.info/docs/draft-ietf-oauth-json-web-token.html) tokens to establish
identity for an API, without an end-user being involved. This is the preferred scenario for server-side communications.
It can be used to interact with Google APIs requiring access to user data (such as Google Drive, Calendar, etc.) for
which URL-based callbacks and user authorization prompts are not appropriate.

Tokens are generated for a service account, which is created from the Google API console. Service accounts must also
be granted access to resources, using traditional assignation of permissions using the unique service account email
address.

The authentication process is implemented following the specifications found
[here](https://developers.google.com/accounts/docs/OAuth2ServiceAccount).

This package also integrates with [request](https://github.com/mikeal/request) to seamlessly query Google RESTful APIs,
which is optional. Integration with [request](https://github.com/mikeal/request) provides automatic requesting of
tokens, as well as built-in token caching.

## Documentation

### Installation
```bash
npm install google-oauth-jwt
```

### How does it work?

When using Google APIs from the server (or any non-browser based application), authentication is performed through a
Service Account, which is a special account representing your application. This account has a unique email address that
can be used to grant permissions to. If a user wants to give access to his Google Drive to your application, he must share the files or folders with the Service Account using the supplied email address.

Now that the Service Account has permission to some user resources, the application can query the API with OAuth2.
When using OAuth2, authentication is performed using a token that has been obtained first by submitting a JSON Web
Token (JWT). The JWT identifies the user as well as the scope of the data he wants access to. The JWT is also signed
with a cryptographic key to prevent tampering. Google generates the key and keeps only the public key for validation.
You must keep the private key secure with your application so that you can sign the JWT in order to guarantee its authenticity.

The application requests a token that can be used for authentication in exchange with a valid JWT. The resulting token
can then be used for multiple API calls, until it expires and a new token must be obtained by submitting another JWT.

### Creating a Service Account using the Google Developers Console

1. From the [Google Developers Console](https://cloud.google.com/console), select your project or create a new one.

2. Under "APIs & auth", click "Credentials".

3. Under "OAuth", click the "Create new client ID" button.

4. Select "Service account" as the application type and click "Create Client ID".

5. The key for your new service account should prompt for download automatically. Note that your key is protected with a password.
   IMPORTANT: keep a secure copy of the key, as Google keeps only the public key.

6. Convert the downloaded key to PEM, so we can use it from the Node [crypto](http://nodejs.org/api/crypto.html) module.

   To do this, run the following in Terminal:
   ```bash
   openssl pkcs12 -in downloaded-key-file.p12 -out your-key-file.pem -nodes
   ```

   You will be asked for the password you received during step 5.

That's it! You now have a service account with an email address and a key that you can use from your Node application.

### Granting access to resources to be requested through an API

In order to query resources using the API, access must be granted to the Service Account. Each Google application that
has security settings must be configured individually. Access is granted by assigning permissions to the service
account, using its email address found in the API console.

For example, in order to list files in Google Drive, folders and files must be shared with the service account email
address. Likewise, to access a calendar, the calendar must be shared with the service account.

### Querying Google APIs with "request"

In this example, we use a modified instance of [request](https://github.com/mikeal/request) to query the
Google Drive API. [request](https://github.com/mikeal/request) is a full-featured HTTP client which can be extended with Google OAuth2 capabilities by using the `requestWithJWT` method. The modified module will request and cache tokens automatically when supplied with a `jwt` setting in the options.

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

Note that the `options` object includes a `jwt` object we use to configure the JWT generation. The token will then
automatically be requested and inserted in the authorization header. It will also be cached and reused for subsequent calls using the same service account and scopes.

If you want to use a specific version of `request`, simply pass it to the the `requestWithJWT` method as such:

```javascript
// my version of request
var request = require('request');
// my modified version of request
request = require('google-oauth-jwt').requestWithJWT(request);
```

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

### Encoding the JWT manually

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

### Specifying JWT generation options

The following options can be specified in order to generate the JWT used for authentication:

```javascript
var options = {

  // the email address of the service account (required)
  // this information is obtained via the API console
  email: 'my-service-account@developer.gserviceaccount.com',

  // an array of scopes uris to request access to (required)
  // different scopes are available for each application, refer to the app documentation
  // scopes are limitations applied to the API access
  scopes: [...],

  // the cryptographic key as a string, can be the contents of the PEM file
  // the key will be used to sign the JWT and validated by Google OAuth
  key: 'KEY_CONTENTS',

  // the path to the PEM file to use for the cryptographic key (ignored if 'key' is also defined)
  // the key will be used to sign the JWT and validated by Google OAuth
  keyFile: 'path/to/key.pem',

  // the duration of the requested token in milliseconds (optional)
  // default is 1 hour (60 * 60 * 1000), which is the maximum allowed by Google
  expiration: 3600000,

  // if access is being granted on behalf of someone else, specifies who is impersonating the service account
  delegationEmail: 'email_address@mycompany.com'

};
```

For more information:
[https://developers.google.com/accounts/docs/OAuth2ServiceAccount#formingclaimset](https://developers.google.com/accounts/docs/OAuth2ServiceAccount#formingclaimset)

Options are used to encode the JWT that will be sent to Google OAuth servers in order to issue a token that can then be
used for authentification to Google APIs. The same options are used for `authenticate`, `TokenCache.get` or the `jwt`
setting passed to `request` options.

## Running the tests

Running the unit tests for `google-oauth-jwt` requires a valid Service Account, its encryption key and a URL to test.

To launch the tests, first configure your account in "test/jwt-settings.json" using the sample file. Make sure your
test URL also matches with the requested scopes. The tests do not make any assumption on the results from the API, so
you can use any OAuth2 enabled API.

For example, to run the tests by listing Google Drive files, you can use the following configuration:

```javascript
{
  "email": "my-account@developer.gserviceaccount.com",
  "scopes": ["https://www.googleapis.com/auth/drive.readonly"],
  "keyFile": "./test/key.pem",
  "test_url": "https://www.googleapis.com/drive/v2/files"
}
```

To run the tests:

```bash
npm test
```

or

```bash
mocha -t 5000
```

The 5 seconds timeout is required since some tests make multiple calls to the API. If you get timeout exceeded errors,
you can bump this value since not all Google APIs may respond with the same timings.

## Debugging

To turn on debugging, add "google-oauth-jwt" to your `DEBUG` variable. Debugging events include JWT generation, token
requests to the OAuth server and token expirations through `TokenCache`.

For example, to turn on debugging while running the unit tests, use this:

```bash
DEBUG=google-oauth-jwt mocha -t 5000
```

## Compatibility

+ Tested with Node 0.10, 0.12, 4.2, 5.5

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
