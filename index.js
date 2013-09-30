(function(exports) {
"use strict";

var resteasy = function() {
	this.store = {};
	this.events = {};
	this.queue = [];

	//Runtime variables
	this.running = false;
	this.buffer = [];

	// Test definition API extensions
	this.response = {};
	this.response.schema = this.schema.bind(this, "response");

	this.request = {};
	this.request.schema = this.schema.bind(this, "request");
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
	return this.store[name] = value;
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
	return string.replace(/\$(\w+)/g, function(match, name) {
		var value = that.store[name];

		if(!value) throw new Error("Variable '" + name + "' not defined in resteasy#format.");
		else return value;
	});
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
	var namespace, type, code, object;
	if(typeof _type == "object" && !_code && !_object) object = _type;
	if(typeof _type == "string" && typeof _code == "object" && !_object) object = _code;
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
		test.type + ".*",
		"*." + test.code,
		test.type + "." + test.code
	].forEach(function(schema) {
		// console.log("Getting schema", name + schema);
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
 * Encode object into get parameters
 * @param  {string} base       Base url
 * @param  {object} parameters Parameters as object
 * @return {string}            URL with encoded parameters
 */
resteasy.prototype.toURL = function(base, parameters) {
	return base + (/\?/.test(base) ? "&" : "?") + Object.keys(parameters).map(function(key) {
		return key + "=" + parameters[key];
	}).join("&");
};

/*
 * Suite tools
 */

/**
 * Start the testing suite
 * @return {null}
 */
resteasy.prototype.begin = function() {
	this.buffer = this.queue.slice(0);
	this.report = new resteasy.Report;

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

		var item = queue.shift();

		if(item) {
			that.emit("start", item);
			that.test(item, function(err, data) {
				console.log("Test complete: ", err, data);
				if(!err) {
					that.emit("completion", data);
					that.report.pass(item);

					next(queue);
				} else {
					that.emit("failure", err);
					that.report.fail(item);
				}
			})

		} else {
			//Done
			that.emit("end");
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
		requestSchema = this.compileSchema(test, "request"),
		responseSchema = this.compileSchema(test, "response");

	// Merge the requestSchema with the test.data
	var data = this.merge(test.data, requestSchema);

	console.log("Testing: ", test.url, test.type, data, responseSchema);
	this.httpRequest(test.url, test.type, data, function(response) {
		try {
			var result = that.compare(responseSchema, response);
		} catch(e) {
			callback(e, response);
		} finally {
			if(result) {
				callback(true, response);
			}
		}
	});
};

resteasy.prototype.httpRequest = function(url, method, data, callback) {
	callback({
		a: "beep",
		b: "boop",
		age: [{
			name: "Tom",
			friends: [{
				name: "lol"
			}]
		}]
	});
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
			} else if(value) {

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
				throw new Error(level + ": Property does not exist.");	
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
resteasy.prototype.all = function(type, url, data) {
	return (new resteasy.Test(this.queue)).all(type, url, data);
};

//Function currying
resteasy.prototype.get = function(url, data) { return this.all("get", url, data); };
resteasy.prototype.post = function(url, data) { return this.all("post", url, data); };
resteasy.prototype.put = function(url, data) { return this.all("put", url, data); };
resteasy.prototype.update = function(url, data) { return this.all("update", url, data); };

/**
 * Test report class
 */
resteasy.Report = function() {
	this.results = [];
};

resteasy.Report.prototype.add = function(result) {
	this.results.push(result);
};

resteasy.Report.prototype.pass = function(result) {
	this.results.push(["pass", result]);
};

resteasy.Report.prototype.fail = function(result) {
	this.results.push(["fail", result]);
};

resteasy.Report.prototype.compile = function() {

};

/**
 * Test class
 */
resteasy.Test = function(queue) {
	this.queue = queue;
};

/**
 * Handle a HTTP method
 * @param  {String} type The http method
 * @param  {String} url  The request url
 * @param  {Object} data The data to pass to the server
 * @return {self}      
 */
resteasy.Test.prototype.all = function(type, url, data) {
	this.type = type;
	this.url = url;
	this.data = data;

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
 * Compile the Test
 * @return {self} 
 */
resteasy.Test.prototype.compile = function() {
	//Add self to the queue
	this.queue.push(this);

	return this;
};

exports.resteasy = new resteasy;

})(module.exports || window);