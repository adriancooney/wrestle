# Wrestle
### A REST API unit testing framework
Wrestle enables you to unit test and automatically document your API from the command line or the browser by specifying intuitive, unit tests for each route.

## Features
* Simple unit test defintion.
* Run tests in the browser or from the command line.
* Generate documentation (with themes) from the test spec.

## Installation
Install Wrestle with npm.

	$ npm install wrestle -g


## Tests
Defining tests with Wrestle is as simple as defining the route, the HTTP method and the expected JSON response.

```js
wrestle.describe("Get user named 'foo'")
.get("/user/foo").expect({
	username: "foo",
	id: /\w{6}/
});

wrestle.post("/user", {
	username: "bar"
}).expect(200, {
	success: true
});
```

## Command Line
Wrestle tests can be executed from the command line by simple supplying the file to the `wrestle test` command then run the tests.

	$ wrestle test path/to/tests.js

![Command line example](http://i.imgur.com/BFLhZ4V.png)

## Browser
Wrestle tests can also be run in the browser. Define your tests and include `index.js`, `browser/interface.js` and the test file.

There are a couple of caveats however due to the Cross-Origin Resource Sharing (CORS) policy which doesn't allow cross-domain requests (or in fact any requests from a static page) so the following options to enable testing in the browser.

1. Host and run the tests under the same domain as the API.
2. Start Chrome with the `--disable-web-security` flag to disable the CORS security.
3. Enable CORS in your API's headers.

## Documentation
### Command line
```
wrestle -- Simple REST API testing
  help 			 		Shows this help.
  test <file> 			Run a test file.
    --simple  		 	Simple output report
    --report  		 	Just output report
    --i x..y   		 	Run tests numbers x through to y
    --i x, y, z		 	Run tests x, y, z only
  doc <file> 			Output API documentation
    --theme <theme>		Output documentation with theme from doc/theme/
    --output <path>		Specify output path for documentation. Defaults to test file directory.
```

### Test defintion API
#### wrestle.describe( _&lt;string>_ )
Describe a test case. This is the `description` variable in the documentation generator

```js
wrestle.describe("Generate a random username")
	.post("/username").expect({
		username: String
	});
```

#### wrestle._method_( _&lt;path>_, _&lt;data>_ )
Create a test case for a GET, PUT, POST or DELETE HTTP method. `path` can contain variables expanded by `wrestle.format`. `data` is the request data to be passed along to the server. Data specified alongside the GET method will be converted to URL parameters.

```js
wrestle.get("/user/foo").expect({
	username: "foo",
	email: String
});
```

#### _&lt;test>_.expect( _&lt;code>_, _&lt;responseSchema>_, _&lt;callback>_ )
Define the response schema for a test. `code` is the expected HTTP status code. `responseSchema` is the schema for the JSON response, see `wrestle.schema` for a full description on defining schemas.

```js
wrestle.get("/404").expect(404);

wrestle.get("/user/foo").expect({
	id: Number,
	name: String,
	gender: /male|female/
});
```

#### wrestle._&lt;request|response>_.schema( _&lt;method>_, _&lt;code>_, _&lt;responseSchema>_ )
Define a schema for request data or JSON response that matches either the request method, HTTP status code or both. A schema is an object that defines a set of rules another a request or response object must conform to. Wrestle loops over the object and tests if the property exists in the schema and that the property's value is of the same type as the schema or matches a regular expression. Schemas can contain variables which will be replaced by values when the request is executed (variables are defined using `wrestle.define`).

```js
wrestle.response.schema(200, {
	meta: {
		code: 200,
		url: String,
		error: Boolean
	}
});

wrestle.request.schema("post", {
	session: ":session",
	auth: {
		username: "admin",
		password: "root"
	}
});
```

#### wrestle.define( _&lt;name>_, _&lt;value>_ )
Define a variable for use within schemas or paths which can be accessed using the `:` prefix.

### Suite tools

#### wrestle.on( _&lt;event>_, _&lt;callback>_ )
Add an event listener to the test suite using `.on` or `.addEventListener`. Below is a list of events and the details sent to them.

<table>
	<tr>
		<th>Name</th><th>Description</th><th>Parameters</th>
	</tr>
	<tr>
		<td>test</td><td>A new test has begun testing.</td><td>test</td>
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
	<tr>
		<td>error</td><td>An error has occured.</td><td></td>
	</tr>
</table>

Below is the list of events sent to a test. These can be binded to the test sent when the `test` event above is called.

<table>
	<tr>
		<th>Name</th><th>Description</th><th>Parameters</th>
	</tr>
	<tr>
		<td>start</td><td>A new test has started.</td>
	</tr>
	<tr>
		<td>pass</td><td>A test has passed.</td><td>status, response</td>
	</tr>
	<tr>
		<td>fail</td><td>A test has failed.</td><td>err, status, response</td>
	</tr>
	<tr>
		<td>finish</td><td>A test has been completed.</td><td>err, status, response</td>
	</tr>
</table>

#### wrestle.begin( _[x, y, x] | [upper, lower]_ )
Begin testing. Optionally pass in array of test indexs or bound to only run selected tests.

#### wrestle.pause()
Pause testing.

#### wrestle.run()
Resume testing.

## Themes
Wrestle can compile your API spec into some pretty informative documentation. It does this with a Mustache templating system. As is matures, more complex data will be passed into the documentation and maybe even a selection of templating engines but for now, it's fairly basic. Below is a table of all the variables passed into the theme. See the [Mustache.js documentation](https://github.com/janl/mustache.js/) for some help in theme formatting.

<table>
	<tr>
		<td>Variable Name</td><td>Description</td>
	</tr>
	<tr>
		<td>rules</td><td>Array of API rules.</td>
	</tr>
	<tr>
		<td>rule.method</td><td>API rule HTTP method.</td>
	</tr>
	<tr>
		<td>rule.path</td><td>Path with emphasis on variables.</td>
	</tr>
	<tr>
		<td>rule.description</td><td>Description of the API rule.</td>
	</tr>
	<tr>
		<td>rule.parameters</td><td>Parameters sent along with request to the server.</td>
	</tr>
	<tr>
		<td>rule.response</td><td>Respone recieved from request.</td>
	</tr>
	<tr>
		<td>version</td><td>The current version of wrestle</td>
	</tr>
</table>

## TODO
* Create a GUI for the browser