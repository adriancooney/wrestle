(function(exports) {
"use strict";

var resteasy = function() {
	this.schemas = {};
	this.store = {};
	this.events = {};
	this.queue = [];

	//Runtime variables
	this.running = false;
	this.buffer = [];

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
resteasy.prototype.get = function(name) {
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
		val = this.get(name);

	return val ? this.define(name, this.merge(val, object)) : this.define(name, object);
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

resteasy.prototype.test = function() {

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
						else return that.isType(type, val);
					});

					if(test) {
						return next(keys);
					} else throw new Error(level + ": Each value in array does not match array schema");
				} else throw new Error(level + ": Value is not an array.");
			} else if(value) {

				// Maybe we have a schema WITHIN a schema, in that case, do the entire thing again
				// Other wise, test the type with the value
				var test = (schemaType.constructor == Object && value.constructor == Object) ? 
					that.compare(schemaType, value, _level) : that.isType(schemaType, value);

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
resteasy.prototype.isType = function(type, value) {
	return (value.constructor == type) || ((type instanceof RegExp) ? type.test : (function() { return false; }))(value);
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

exports.resteasy = new resteasy;

})(module.exports || window);