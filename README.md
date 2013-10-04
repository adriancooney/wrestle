# RESTeasy
### A REST API unit testing framework
Resyeasy enables you to unit test your API from the command line or the browser by specifying intuitive, unit tests for each route.

## Tests
Defining tests with RESTeasy is as simple as defining the route, the HTTP method and the expected JSON response.

```js
	resteasy.get("/user/foo").expect({
		username: "foo",
		id: /\w{6}/
	});

	resteasy.post("/user", {
		username: "bar"
	}).expect(200, {
		success: true
	});
```

## Command Line
Resteasy tests can be executed from the command line by simple supplying the file to the `resteasy test` command. First of all create your `tests.js` file.

```js
	var resteasy = require("resteasy");

	resteasy.get("/foo").expect(200);

	module.exports = resteasy; // Export the tests
```

Then run the tests.

	$ resteasy test path/to/tests.js

## Browser
Resteasy tests can also be run in the browser. Define your tests and include `index.js`, `browser/interface.js` and the test file.

There are a couple of caveats however due to the Cross-Origin Resource Sharing (CORS) policy which doesn't allow cross-domain requests (or in fact any requests from a static page) so we have three options.

1. Host and run the tests under the same domain as the API.
2. Start Chrome with the `--disable-web-security` flag to disable the CORS security.