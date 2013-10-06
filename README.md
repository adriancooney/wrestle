# RESTeasy
### A REST API unit testing framework
Resyeasy enables you to unit test and automatically document your API from the command line or the browser by specifying intuitive, unit tests for each route.

## Tests
Defining tests with RESTeasy is as simple as defining the route, the HTTP method and the expected JSON response.

```js
resteasy.describe("Get user named 'foo'")
.get("/user/foo").expect({
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
Resteasy tests can be executed from the command line by simple supplying the file to the `resteasy test` command then run the tests.

	$ resteasy test path/to/tests.js

## Browser
Resteasy tests can also be run in the browser. Define your tests and include `index.js`, `browser/interface.js` and the test file.

There are a couple of caveats however due to the Cross-Origin Resource Sharing (CORS) policy which doesn't allow cross-domain requests (or in fact any requests from a static page) so the following options to enable testing in the browser.

1. Host and run the tests under the same domain as the API.
2. Start Chrome with the `--disable-web-security` flag to disable the CORS security.
3. Enable CORS in your API's headers.

## Documentation
### Test defintion API
#### resteasy.describe( _&lt;string>_ )
Describe a test case. This is the `description` variable in the documentation generator

```js
resteasy.describe("Generate a random username")
	.post("/username").expect({
		username: String
	});
```

#### resteasy._method_( _&lt;path>_, _&lt;data>_ )
Create a test case for a GET, PUT, POST or DELETE HTTP method. `path` can contain variables expanded by `resteasy.format`. `data` is the request data to be passed along to the server. Data specified alongside the GET method will be converted to URL parameters.

```js
resteasy.get("/user/foo").expect({
	username: "foo",
	email: String
});
```

#### _&lt;test>_.expect( _&lt;code>_, _&lt;responseSchema>_, _&lt;callback>_ )
Define the response schema for a test. `code` is the expected HTTP status code. `responseSchema` is the schema for the JSON response, see `resteasy.schema` for a full description on defining schemas.

```js
resteasy.get("/404").expect(404);

resteasy.get("/user/foo").expect({
	id: Number,
	name: String,
	gender: /male|female/
});
```

#### resteasy._&lt;request|response>_.schema( _&lt;method>_, _&lt;code>_, _&lt;responseSchema>_ )
Define a schema for request data or JSON response that matches either the request method, HTTP status code or both. A schema is an object that defines a set of rules another a request or response object must conform to. Resteasy loops over the object and tests if the property exists in the schema and that the property's value is of the same type as the schema or matches a regular expression. Schemas can contain variables which will be replaced by values when the request is executed (variables are defined using `resteasy.define`).

```js
resteasy.response.schema(200, {
	meta: {
		code: 200,
		url: String,
		error: Boolean
	}
});

resteasy.request.schema("post", {
	session: ":session",
	auth: {
		username: "admin",
		password: "root"
	}
});
```

#### resteasy.define( _&lt;name>_, _&lt;value>_ )
Define a variable for use within schemas or paths which can be accessed using the `:` prefix.

### Suite tools

#### resteasy.on( _&lt;event>_, _&lt;callback>_ )
Add an event listener to the test suite. Below is a list of events and the details sent to them.

<table>
	<tr>
		<th>Name</th><th>Description</th><th>Parameters</th>
	</tr>
	<tr>
		<td>start</td><td>A new test has started.</td><td>test</td>
	</tr>
	<tr>
		<td>pass</td><td>A test has passed.</td><td>test, status, response</td>
	</tr>
	<tr>
		<td>fail</td><td>A test has failed.</td><td>test, err, status, response</td>
	</tr>
	<tr>
		<td>finish</td><td>A test has been completed.</td><td>test, err, status, response</td>
	</tr>
	<tr>
		<td>begin</td><td>Testing has begun.</td><td></td>
	</tr>
	<tr>
		<td>end</td><td>All tests have been completed.</td><td>report</td>
	</tr>
	<tr>
		<td>paused</td><td>Testing has been paused</td><td></td>
	</tr>
</table>

#### resteasy.begin( _[x, y, x] | [upper, lower]_ )
Begin testing. Optionally pass in array of test indexs or bound to only run selected tests.

#### resteasy.pause()
Pause testing.

#### resteasy.run()
Resume testing.

## TODO
* Create a GUI for the browser