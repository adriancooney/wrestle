(function(exports) {
"use strict";

var wrestle = function() {
	this.store = {};
	this.events = {};
	this.queue = [];

    this.version = "0.1";

	this.options = {
		display: {
			info: true, //Show info
			expect: true, //Show expectation
			pass: true, //Show passes
			response: true, //Show response
			responseData: false,
			fail: true, //Show fails
			begin: true, //Show beginning message
			report: true// Show report
		}
	};

	//Runtime variables
	this.running = false;
	this.buffer = [];

	// Test definition API extensions
	this.response = {};
	this.response.schema = this.schema.bind(this, "response");

    this.request = {};
    this.request.schema = this.schema.bind(this, "request");

    this.headers = {};
    this.headers.schema = this.schema.bind(this, "headers");
};

/**
 * Add event listener to wrestle object
 * @param {string}   name     Name of event
 * @param {Function} callback Callback function
 */	
wrestle.prototype.addEventListener = function(name, callback) {
	if(typeof name == "function") this.events["*"] = name;
	else this.events[name] = callback;
};

wrestle.prototype.on = wrestle.prototype.addEventListener;

/**
 * Emit an event on the wrestle object
 * @param  {string} name Event Name
 * @param  {*[, ..]} Arguments to pass to callback
 */
wrestle.prototype.emit = function() {
	var args = Array.prototype.slice.call(arguments),
		name = args[0],
		data = args.slice(1);

	if(this.events["*"]) this.events["*"].apply(this, args);
	if(this.events[name]) this.events[name].apply(this, data);
};

/**
 * Some sugar for wrestle.store[name] = value
 * @param  {string} name  Var name
 * @param  {*} value Value to store
 * @return {*}       Value stored
 */
wrestle.prototype.define = function(name, value) {
	if(typeof name == "object") {
		for(var key in name) {
			this.store[key] = name[key];
		}
	} else return this.store[name] = value;
};

/**
 * Proxy for wrestle.store[name]
 * @param  {string} name Variable name
 * @return {*}      The stored value
 */
wrestle.prototype.retrieve = function(name) {
	return this.store[name];
};

/**
 * Format a string with #define
 * @param  {string} string The string to format
 * @return {string}        The formatted string
 */
wrestle.prototype.format = function(string) {
	var that = this;
	return typeof string == "string" ? string.replace(/\:(\w+)/g, function(match, name) {
		var value = that.retrieve(name);

		if(!value) throw new Error("Variable '" + name + "' not defined.");
		else return value;
	}) : string;
};

/**
 * Expand an object with variables
 * @param  {Object} object 
 * @return {Object}        The expanded object
 */
wrestle.prototype.expand = function(object) {
	var that = this;
	return (function next(keys) {
		var key = keys.shift();

		if(key) {
			var value = object[key];

			if(value.constructor == Object) object[key] = that.expand(value);
			else object[key] = that.format(value);

			return next(keys);
		} else {
			return object;
		}
	})(Object.keys(object));
};

/**
 * Create a response schema
 *
 * Usage:
 * 		schema("response", {});
 * 		schema("response", "post", {});
 * 		schema("response", 200, {});
 * 		schema("response", "post", 200, {})
 * 		
 * @param  {string} namespace Reponse schemas
 * @param  {string} type      Request method
 * @param  {number} code      Response code
 * @param  {object} object    The response object
 * @return {object}           The schema object
 */
wrestle.prototype.schema = function(namespace, _type, _code, _object) {
	var type, code, object;
	if(typeof _type == "object" && !_code && !_object) object = _type;
	if(typeof _type == "string" && typeof _code == "object" && !_object) type = _type, object = _code;
	if(typeof _type == "number" && typeof _code == "object" && !_object) object = _code, code = _type;
	if(typeof _type == "string" && typeof _code == "number" && typeof _object == "object") type = _type, code = _code, object = _object;

	if(!type) type = "*";
	if(!code) code = "*";

	var name = ["schema", namespace, type, code].join("."),
		val = this.retrieve(name);

	return val ? this.define(name, this.merge(val, object)) : this.define(name, object);
};

/**
 * Compile a schema given a test
 * @param  {wrestle.Test} test The test to compile from
 * @param {String} namespace The namespace to compile from
 * @return {Object}      The compiled, merged schema
 */
wrestle.prototype.compileSchema = function(test, namespace) {
	var that = this,
		name = "schema." + namespace + ".",
		main = {};

	var schemas = [
		"*.*",
		test.method + ".*",
		"*." + test.status,
		test.method + "." + test.status
	].forEach(function(schema) {
		var value = that.retrieve(name + schema);

		if(value) main = that.merge(main, value);
	});

	return main;
};

/**
 * Merge an object into a host object
 * @param  {Object} host   Host object
 * @param  {Object} object 
 * @return {Object}        Merged object
 */
wrestle.prototype.merge = function(host, object) {
	for(var key in object) host[key] = object[key];

	return host;
};

/**
 * Clone an object
 * @param  {Object} object 
 * @return {Object}        
 */
wrestle.prototype.clone = function(object) {
    return this.merge({}, object);
};

/**
 * Encode object into get parameters
 * @param  {string} base       Base url
 * @param  {object} parameters Parameters as object
 * @return {string}            URL with encoded parameters
 */
wrestle.prototype.toURL = function(base, parameters) {
	return base + (/\?/.test(base) ? "&" : "?") + this.queryString(parameters);
};

/**
 * Convert an object to a queryString
 * Example input:
 * 	wrestle.queryString({
 * 		a: 1, 
 * 		b: {
 * 			r: [2, 3, 1, 2],
 * 			t: "hello",
 * 			f: { 
 * 				g: "lol"
 * 			}
 * 		}
 * 	});
 * 	
 * 	Output: a=1&b[r][0]=2&b[r][1]=3&b[r][2]=1&b[r][3]=2&b[t]=hello&b[f][g]=lol
 * 	
 * @param  {Object} object      Object with key values
 * @param  {String} parent      @private
 * @param  {String} queryString @private, for recursion
 * @return {String}             The query string
 */
wrestle.prototype.queryString = function(object, parent, queryString) {
	queryString = queryString || "";
	var that = this;
	return (function next(keys) {
		var key = keys.shift();

		if(key) {
			var value = object[key],
				_parent = parent ? (parent + "[" + key + "]") : key;

			if(value.constructor == Object) queryString = that.queryString(value, _parent, queryString);
			else {
				if(Array.isArray(value)) queryString += value.map(function(value, i) { return _parent + "[" + i + "]=" + encodeURIComponent(value); }).join("&") + "&"; //Little hack for the .slice
				else queryString += _parent + "=" + encodeURIComponent(value) + "&";
			}

			return next(keys);
		} else {
			if(!parent) queryString = queryString.slice(0, -1);
			return queryString;
		}
	})(Object.keys(object));
};

/*
 * Suite tools
 */
wrestle.prototype.initSuite = function() {
	this.buffer = this.queue.slice(0);
	this.report = new wrestle.Report;
	this.count = 0;
};

/**
 * Chop around the buffer to only run specific tests
 * @param  {Number|Array} bounds Number, [upper, lower], [specific, test, indexes]
 * @return {null}        
 */
wrestle.prototype.selectTests = function(bounds) {
	if(typeof bounds == "number" || bounds.length == 1) {
		bounds = Array.isArray(bounds) ? bounds[0] : bounds;
		bounds--;
		this.buffer = this.buffer.slice(bounds, bounds + 1);
	} else if(bounds.length == 2) {
		this.buffer = this.buffer.slice(bounds[0] - 1, bounds[1] - 1);
	} else {
		bounds = bounds.map(function(v) { return parseInt(v); });
		this.buffer = this.buffer.filter(function(v, i) {
			return bounds.indexOf(i + 1) !== -1;
		});
	}
};

/**
 * Start the testing suite
 * @return {null}
 */
wrestle.prototype.begin = function() {
	this.initSuite();

	//Apply the selection
	if(arguments.length) this.selectTests.apply(this, arguments);

	//Report timestamp
	this.report.startTime = new Date;

	this.emit("begin");
	this.run();
};

/**
 * Pause the testing suite (to resume, use #run)
 * @return {null} 
 */
wrestle.prototype.pause = function() {
	this.emit("paused");
	this.running = false;
};

/**
 * Run the testing suite
 * @return {null} 
 */
wrestle.prototype.run = function() {
	var that = this;
	that.running = true;

	(function next(queue) {
		if(!that.running) return;

		var test = queue.shift();

		if(test) {
			//Add the test start timestamp
			test.startTime = new Date;

			that.emit("test", test);
			that.emit("start", test);
			test.emit("start");

			that.test(test, function(err, code, data) {
				//Add the end timestamp
				test.endTime = new Date;
				test.duration = test.endTime - test.startTime;

				test.err = err;
				test.status = code;
				test.response = data;

				if(test.callback) test.callback(err, code, data);

				test.emit("finish", err, code, data);
				that.emit("finish", test, err, code, data);

				if(!err) {
					test.pass = true;

					test.emit("pass", code, data);
					that.emit("pass", test, code, data);
					that.report.pass(test);
				} else {
					test.pass = false;

					test.emit("fail", err, code, data);
					that.emit("fail", test, err, code, data);
					that.report.fail(test, err);
				}

				that.count++;
				next(queue);
			})

		} else {
			that.report.endTime = new Date;

			//Done
			that.emit("end", that.report.compile());
		}
	})(this.buffer);
};

/**
 * Main test function
 * @param  {wrestle.Test}   test     wrestle test function
 * @param  {Function} callback Callback (err, response)
 * @return {null}            
 */
wrestle.prototype.test = function(test, callback) {
	var that = this,
		baseurl = this.retrieve("url");

	if(!baseurl) throw new Error("Base url is not defined. Use wrestle.define('url', base_url).");

    var requestSchema = this.compileSchema(test, "request"),
	    headersSchema = this.compileSchema(test, "headers");

	try {
		// Merge the requestSchema with the test.data and expand the variables
		var data = this.expand(this.merge(this.clone(test.parameters), requestSchema));
        test.data = data;

        //Set the headers
        test.headers = this.compileHeaders(headersSchema);

		//Format the url
		var path = this.format(test.path);
	} catch(err) {
		return callback(err);
	}

	this.httpRequest(baseurl + path, test.method, test.headers, data, function(res, code, response) {
		//Parse the JSON
		try {
			response = JSON.parse(response);
		} catch(err) {
			return callback(err, code, response);
		}

        //If there's a cookie, set it
        if(res.headers["set-cookie"]) res.headers["set-cookie"].forEach(that.setCookie.bind(that));

        //Set the test status
        test.status = code;
        //Test the status code, break if they don't match
        if(test.code && test.code !== code) return callback(new Error("Reponse status code did not matched required status code"), code, response);

        //Test the reponse against the schema
        var responseSchema = that.compileSchema(test, "response");
        //Merge the response schema with the expectation
        if(test.schema) responseSchema = that.expand(that.merge(test.schema, responseSchema));

		try {
			var result = that.compare(responseSchema, response);
		} catch(err) {
			callback(err, code, response);
		} finally {
			if(result) {
				callback(false, code, response);
			}
		}
	});
};

/**
 * The main HTTP interface for outside interaction to be defined elsewhere.
 * @param  {String}   url      URL string
 * @param  {String}   method   HTTP method
 * @param  {Object}   headers     Headers object
 * @param  {Object}   data     Data to be sent alongside the request
 * @param  {Function} callback Callback with (err, statusCode, responseData)
 * @return {null}            
 */
wrestle.prototype.httpRequest = function(url, method, headers, data, callback) {
	throw new Error("wrestle#httpRequest is not defined. Please include an interface.js for the specific enviornment.");
};

/**
 * Set a cookie for later requests
 * @param {String} cookie Cookie string.
 */
wrestle.prototype.setCookie = function(cookie) {
    var valRegex = /([^=]+)=([^=]+)/,
        cookies = (this.retrieve("cookie") || "").split(";"),
        store = {};

    //Split up the passed cookie, take the first value and find the name and value
    cookie = valRegex.exec(cookie.split(";")[0]);

    //Create a key value store for the current cookies
    cookies.forEach(function(nookie) {
        nookie = valRegex.exec(nookie);

        if(nookie) store[nookie[1]] = nookie[2];
    });

    //Save or overwrite the cookie
    if(cookie) store[cookie[1]] = cookie[2];

    //Stringify the cookies
    this.define("cookie", Object.keys(store).map(function(key) {
        return key + "=" + store[key];
    }).join(";"));
};

/**
 * Compile the header object
 * @param  {Object} schema Cookie schema to merge with
 * @return {Object}        Compiled headers
 */
wrestle.prototype.compileHeaders = function(schema) {
    var headers = this.expand(schema);

    //Add the cookie
    var cookie = this.retrieve("cookie");
    if(cookie) test.headers["Cookie"] = cookie;

    if(!headers["User-Agent"]) headers["User-Agent"] = "wrestle/1.0";
    if(!headers["Accept"]) headers["Accept"] = "*/*";

    return headers;
};

/**
 * Deep compare a schema against an object
 * @param  {Object} schema Schema object
 * @param  {Object} object Object
 * @param  {String} level  The object level
 * @return {Boolean}       Schema works
 */
wrestle.prototype.compare = function(schema, object, level) {
	var that = this;
	return (function next(keys) {
		var key = keys.shift();

		if(key) {
			var schemaType = schema[key],
				value = object[key];

			var _level = (level || "") + ((!level) ? "" : ".") + key;

			if(Array.isArray(schemaType)) {
				// Totally different world if it's an array
				var type = schemaType[0];

				if(Array.isArray(value)) {

					var test = value.every(function(val, i) {
						if(val.constructor == Object) return that.compare(type, val, _level);
						else return that.isValue(type, val);
					});

					if(test) {
						return next(keys);
					} else throw new Error(_level + ": Each value in array does not match array schema");
				} else throw new Error(_level + ": Value is not an array.");
			} else if(value !== undefined) {

				// Maybe we have a schema WITHIN a schema, in that case, do the entire thing again
				// Other wise, test the type with the value
				var test = (schemaType.constructor == Object && value.constructor == Object) ? 
					that.compare(schemaType, value, _level) : that.isValue(schemaType, value);

				if(test) {
					//Woop, compared, go again
					return next(keys);
				} else {
					// Test failed, return false
					throw new Error(_level + ": Value does not match type.");
				}
			} else {
				// object doesn't have required property
				throw new Error(_level + ": Property does not exist.");	
			}
		} else {
			// We looped through and all tests passed
			return true;
		}

	})(Object.keys(schema));
};

/**
 * Test is value is of type
 * @param  {*}  type  Any type (String, Number etc.) or RegExp
 * @param  {*}  value The value to test against
 * @return {Boolean}       The test results
 */
wrestle.prototype.isValue = function(type, value) {
	return (value.constructor == type) 
		|| ((type instanceof RegExp) ? (function() { return type.test(value) }) : (function() { return false; }))() 
		|| type == value;
};

/**
 * Converts type to a string
 * @param  {*} type Any type. `Boolean`, `String` etc.
 * @return {String}      The type
 */
wrestle.prototype.toTypeString = function(type) {
	if(type.toString().match(/(\w+)\(\)/)) return RegExp.$1;
	else if(type instanceof RegExp) return type.toString();
	else return false;
};

/**
 * Pretty the schema object. Convert types to their Strings
 * @param  {Object} schema Schema to prettify
 * @return {Object}        Prettified schema
 */
wrestle.prototype.prettySchema = function(schema) {
	if(!schema) return undefined;

	var that = this, object = {};
	return (function next(keys) {
		var key = keys.shift();

		if(key) {
			var value = schema[key];

			if(value.constructor == Object) object[key] = that.prettySchema(value);
			else if(value.constructor == Array) object[key] = schema[key].map(that.prettySchema.bind(that));
			else object[key] = that.toTypeString(value) || value;

			return next(keys);
		} else {
			return object;
		}
	})(Object.keys(schema));
};

/**
 * Convert a response object to string. Shrink the arrays etc.
 * @param  {Object} response Reponse object
 * @return {Object}         Convert response object
 */
wrestle.prototype.prettyResponse = function(response) {
	if(!response) return undefined;

	var that = this, object = {};
	return (function next(keys) {
		var key = keys.shift();

		if(key) {
			var value = response[key];

			if(value.constructor == Object) object[key] = that.prettyResponse(value);
			else if(value.constructor == Array) object[key] = value.map(function(val, i, arr) {
				if(i == 0 || i == (arr.length - 1)) return that.prettyResponse(val);
				else if(i == 2) return "...";
			}).filter(function(val) { return !!val; });
			else object[key] = value;

			return next(keys);
		} else {
			return object;
		}
	})(Object.keys(response));
};

/**
 * Test definition API
 */

/**
 * Bind a test case to a HTTP method
 * @param  {String} method HTTP method
 * @param  {String} path   URL path
 * @param  {Object} data   Object data
 * @return {wrestle.Test} New test case
 */
wrestle.prototype.all = function(method, path, data) {
	return (new wrestle.Test(this.queue)).all(method, path, data);
};

//Function currying
wrestle.prototype.get = function(path, data) { return this.all("get", path, data); };
wrestle.prototype.post = function(path, data) { return this.all("post", path, data); };
wrestle.prototype.put = function(path, data) { return this.all("put", path, data); };
wrestle.prototype.delete = function(path, data) { return this.all("delete", path, data); };

/**
 * Describe a test case
 * @param  {String} description Test Description
 * @return {wrestle.Test}           New test
 */
wrestle.prototype.describe = function(description) {
    return (new wrestle.Test(this.queue)).describe(description);
};

/**
 * Test report class
 */
wrestle.Report = function() {
	this.tests = [];
	this.passed = [];
	this.failed = [];
};

/**
 * Pass a test
 * @param  {wrestle.Test} test Passed test object.
 * @return {null}      
 */
wrestle.Report.prototype.pass = function(test) {
	this.tests.push(test);
	this.passed.push(test);
};

/**
 * Fail a test
 * @param  {wrestle.test} test Failed test object.
 * @return {null}      
 */
wrestle.Report.prototype.fail = function(test) {
	this.tests.push(test);
	this.failed.push(test);
};

/**
 * Compile the report
 * @return {Object} Compiled report.
 */
wrestle.Report.prototype.compile = function() {
	return {
		failed: this.failed.length,
		passed: this.passed.length,
		total: this.passed.length + this.failed.length,
		duration: this.endTime - this.startTime,
		tests: {
			passed: this.passed,
			failed: this.failed,
			all: this.tests
		}
	}
};

/**
 * Test class
 */
wrestle.Test = function(queue) {
	this.queue = queue;
	this.index = this.queue.length;
	this.events = {};
};

/*
 * Sort of inherit an event emitter class
 */
wrestle.Test.prototype.on = wrestle.prototype.on;
wrestle.Test.prototype.emit = wrestle.prototype.emit;

/**
 * Handle a HTTP method
 * @param  {String} type The http method
 * @param  {String} url  The request url
 * @param  {Object} data The data to pass to the server
 * @return {self}      
 */
wrestle.Test.prototype.all = function(method, path, parameters) {
	this.method = method;
	this.path = path;
	this.parameters = parameters;

	return this;
};

// Proxying/currying for Test#all
wrestle.Test.prototype.get = function(url, data) { return this.all("get", url, data); };
wrestle.Test.prototype.post = function(url, data) { return this.all("post", url, data); };
wrestle.Test.prototype.put = function(url, data) { return this.all("put", url, data); };
wrestle.Test.prototype.delete = function(url, data) { return this.all("delete", url, data); };

/**
 * Test expectation parameters
 * 	Usage:
 * 		expect(200)
 * 		expect(200, {})
 * 		expect(200, {}, function() {})
 *   	expect(200, function() {})
 *   	expect({})
 *   	expect({}, function() {})
 *   	expect(function() {})
 * 
 * @param  {Number} code     The HTTP status code
 * @param  {Object} schema   The object schema the response has to adhere to
 * @param  {Function} callback The callback
 * @return {[type]}           [description]
 */
wrestle.Test.prototype.expect = function(_code, _schema, _callback) {
	var code = _code, schema = _schema, callback = _callback;

	if(typeof _code == "object") schema = _code, callback = _schema;
	if(typeof _schema == "function") callback = _schema;
	if(typeof _code == "function") callback = _code;

	this.code = (typeof code == "number") ? code : undefined;
	this.schema = (typeof schema == "object") ? schema : undefined;
	this.callback = (typeof callback == "function") ? callback : undefined;

	return this.compile();
};

/**
 * Describe the test.
 * @param  {String|Function} description Description of the test
 * @return {self}             
 */
wrestle.Test.prototype.describe = function(description) {
    // Support function() {/* NEWLINES! */}
    if(typeof description == "function") description = description.toString().replace(/(^[^\n]*\n)|(\n\*\/\})/g, ""); 

    this.description = description;

    return this;
};

/**
 * Compile the Test
 * @return {self} 
 */
wrestle.Test.prototype.compile = function() {
	//Add self to the queue
	this.queue.push(this);

	return this;
};


exports.wrestle = new wrestle;

})(typeof window == "undefined" ? module.exports : this.window); //Enable node/browser interoperability