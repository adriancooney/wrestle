(function(exports) {
"use strict";

var resteasy = function() {
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
    this.headers.schema = this.schema.bind(this, "header");
};

/**
 * Add event listener to resteasy object
 * @param {string}   name     Name of event
 * @param {Function} callback Callback function
 */	
resteasy.prototype.addEventListener = function(name, callback) {
	if(typeof name == "function") this.events["*"] = name;
	else this.events[name] = callback;
};

resteasy.prototype.on = resteasy.prototype.addEventListener;

/**
 * Emit an event on the resteasy object
 * @param  {string} name Event Name
 * @param  {*[, ..]} Arguments to pass to callback
 */
resteasy.prototype.emit = function() {
	var args = Array.prototype.slice.call(arguments),
		name = args[0],
		data = args.slice(1);

	if(this.events["*"]) this.events["*"].apply(this, args);
	if(this.events[name]) this.events[name].apply(this, data);
};

/**
 * Some sugar for resteasy.store[name] = value
 * @param  {string} name  Var name
 * @param  {*} value Value to store
 * @return {*}       Value stored
 */
resteasy.prototype.define = function(name, value) {
	if(typeof name == "object") {
		for(var key in name) {
			this.store[key] = name[key];
		}
	} else return this.store[name] = value;
};

/**
 * Proxy for resteasy.store[name]
 * @param  {string} name Variable name
 * @return {*}      The stored value
 */
resteasy.prototype.retrieve = function(name) {
	return this.store[name];
};

/**
 * Format a string with #define
 * @param  {string} string The string to format
 * @return {string}        The formatted string
 */
resteasy.prototype.format = function(string) {
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
resteasy.prototype.expand = function(object) {
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
resteasy.prototype.schema = function(namespace, _type, _code, _object) {
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
 * @param  {resteasy.Test} test The test to compile from
 * @param {String} namespace The namespace to compile from
 * @return {Object}      The compiled, merged schema
 */
resteasy.prototype.compileSchema = function(test, namespace) {
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
resteasy.prototype.merge = function(host, object) {
	for(var key in object) host[key] = object[key];

	return host;
};

/**
 * Clone an object
 * @param  {Object} object 
 * @return {Object}        
 */
resteasy.prototype.clone = function(object) {
    return this.merge({}, object);
};

/**
 * Encode object into get parameters
 * @param  {string} base       Base url
 * @param  {object} parameters Parameters as object
 * @return {string}            URL with encoded parameters
 */
resteasy.prototype.toURL = function(base, parameters) {
	return base + (/\?/.test(base) ? "&" : "?") + this.queryString(parameters);
};

/**
 * Convert an object to a queryString
 * Example input:
 * 	resteasy.queryString({
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
resteasy.prototype.queryString = function(object, parent, queryString) {
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
resteasy.prototype.initSuite = function() {
	this.buffer = this.queue.slice(0);
	this.report = new resteasy.Report;
	this.count = 0;
};

/**
 * Chop around the buffer to only run specific tests
 * @param  {Number|Array} bounds Number, [upper, lower], [specific, test, indexes]
 * @return {null}        
 */
resteasy.prototype.selectTests = function(bounds) {
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
resteasy.prototype.begin = function() {
	this.initSuite();
	if(arguments.length) this.selectTests.apply(this, arguments);
	this.emit("begin");
	this.run();
};

/**
 * Pause the testing suite (to resume, use #run)
 * @return {null} 
 */
resteasy.prototype.pause = function() {
	this.emit("paused");
	this.running = false;
};

/**
 * Run the testing suite
 * @return {null} 
 */
resteasy.prototype.run = function() {
	var that = this;
	that.running = true;

	(function next(queue) {
		if(!that.running) return;

		var test = queue.shift();

		if(test) {

			that.emit("start", test);
			that.test(test, function(err, code, data) {
				test.err = err;
				test.status = code;
				test.response = data;

				if(test.callback) test.callback(err, code, data);

				that.emit("finish", test, err, code, data);

				if(!err) {
					test.pass = true;
					that.emit("pass", test, code, data);
					that.report.pass(test);
				} else {
					test.pass = false;
					that.emit("fail", test, err, code, data);
					that.report.fail(test, err);
				}

				that.count++;
				next(queue);
			})

		} else {
			//Done
			that.emit("end", that.report.compile());
		}
	})(this.buffer);
};

/**
 * Main test function
 * @param  {resteasy.Test}   test     Resteasy test function
 * @param  {Function} callback Callback (err, response)
 * @return {null}            
 */
resteasy.prototype.test = function(test, callback) {
	var that = this,
		baseurl = this.retrieve("url");

	if(!baseurl) throw new Error("Base url is not defined. Use resteasy.define('url', base_url).");

    var requestSchema = this.compileSchema(test, "request"),
	    headersSchema = this.compileSchema(test, "Headers");

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

	this.httpRequest(baseurl + path, test.method, test.headers, data, function(err, res, code, response) {
		if(err) {
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
resteasy.prototype.httpRequest = function(url, method, headers, data, callback) {
	throw new Error("resteasy#httpRequest is not defined. Please include an interface.js for the specific enviornment.");
};

/**
 * Set a cookie for later requests
 * @param {String} cookie Cookie string.
 */
resteasy.prototype.setCookie = function(cookie) {
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

resteasy.prototype.compileHeaders = function(schema) {
    var headers = this.expand(schema);

    //Add the cookie
    var cookie = this.retrieve("cookie");
    if(cookie) test.headers["Cookie"] = cookie;

    if(!headers["User-Agent"]) headers["User-Agent"] = "resteasy/1.0";
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
resteasy.prototype.compare = function(schema, object, level) {
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
					} else throw new Error(level + ": Each value in array does not match array schema");
				} else throw new Error(level + ": Value is not an array.");
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
					throw new Error(level + ": Value does not match type.");
				}
			} else {
				// object doesn't have required property
				throw new Error(key + ": Property does not exist.");	
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
resteasy.prototype.isValue = function(type, value) {
	return (value.constructor == type) 
		|| ((type instanceof RegExp) ? (function() { return type.test(value) }) : (function() { return false; }))() 
		|| type == value;
};

/**
 * Converts type to a string
 * @param  {*} type Any type. `Boolean`, `String` etc.
 * @return {String}      The type
 */
resteasy.prototype.toTypeString = function(type) {
	if(type.toString().match(/(\w+)\(\)/)) return RegExp.$1;
	else return "Unknown";
};

/**
 * Test definition API
 */
resteasy.prototype.all = function(type, path, data) {
	return (new resteasy.Test(this.queue)).all(type, path, data);
};

resteasy.prototype.describe = function(description) {
    return (new resteasy.Test(this.queue)).describe(description);
};

//Function currying
resteasy.prototype.get = function(path, data) { return this.all("get", path, data); };
resteasy.prototype.post = function(path, data) { return this.all("post", path, data); };
resteasy.prototype.put = function(path, data) { return this.all("put", path, data); };
resteasy.prototype.delete = function(path, data) { return this.all("delete", path, data); };

/**
 * Test report class
 */
resteasy.Report = function() {
	this.tests = [];
	this.passed = [];
	this.failed = [];
};

resteasy.Report.prototype.pass = function(test) {
	this.tests.push(test);
	this.passed.push(test);
};

resteasy.Report.prototype.fail = function(test) {
	this.tests.push(test);
	this.failed.push(test);
};

resteasy.Report.prototype.compile = function() {
	return {
		failed: this.failed.length,
		passed: this.passed.length,
		total: this.passed.length + this.failed.length,
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
resteasy.Test = function(queue) {
	this.queue = queue;
	this.index = this.queue.length;
};

/**
 * Handle a HTTP method
 * @param  {String} type The http method
 * @param  {String} url  The request url
 * @param  {Object} data The data to pass to the server
 * @return {self}      
 */
resteasy.Test.prototype.all = function(method, path, parameters) {
	this.method = method;
	this.path = path;
	this.parameters = parameters;

	return this;
};

// Proxying/currying for Test#all
resteasy.Test.prototype.get = function(url, data) { return this.all("get", url, data); };
resteasy.Test.prototype.post = function(url, data) { return this.all("post", url, data); };
resteasy.Test.prototype.put = function(url, data) { return this.all("put", url, data); };
resteasy.Test.prototype.delete = function(url, data) { return this.all("delete", url, data); };

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
resteasy.Test.prototype.expect = function(_code, _schema, _callback) {
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
resteasy.Test.prototype.describe = function(description) {
    // Support function() {/* NEWLINES! */}
    if(typeof description == "function") description = description.toString().replace(/(^[^\n]*\n)|(\n\*\/\})/g, ""); 

    this.description = description;

    return this;
};

/**
 * Compile the Test
 * @return {self} 
 */
resteasy.Test.prototype.compile = function() {
	//Add self to the queue
	this.queue.push(this);

	return this;
};


exports.resteasy = new resteasy;

})(typeof window == "undefined" ? module.exports : this.window); //Enable node/browser interoperability