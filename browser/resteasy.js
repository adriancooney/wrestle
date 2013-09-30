;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var request = require((typeof window == "undefined") ? "browser-request" : "request");

var resteasy = function(url) {
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
resteasy.prototype.schema = function(namespace, type, code, object) {
	if(typeof type == "object" && !code && !object) object = type;
	if(typeof type == "string" && typeof code == "object" && !object) object = code;
	if(typeof type == "number" && typeof code == "object" && !object) object = code, code = type;

	var name = [namespace, type, code].join("."),
		val = this.get(name);

	return val ? this.define(name, val.push(object)) : this.define(name, [object]);
};

resteasy.prototype.testSchema = function(response) {
	
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

if(module) module.exports = function(url) {
	return new resteasy(url);
};
},{}]},{},[1])
;