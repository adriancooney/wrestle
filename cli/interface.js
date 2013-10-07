var http = require("http"),
	URL = require("url"),
	color = require("colors"),
	wrestle = require("../index.js").wrestle;

/**
 * wrestle node HTTP interface
 */
wrestle.httpRequest = function(url, method, headers, data, callback) {
	headers = headers || {};
	url = URL.parse(url);
	method = method.toLowerCase();

	var requestData = (method !== "get" && data) ? wrestle.queryString(data) : "",
		path = (method == "get" && data ? wrestle.toURL(url.path, data) : url.path);

	if(data && method !== "get") {
		headers["Content-Type"] = "application/x-www-form-urlencoded; charset=utf-8";
		headers["Content-Length"] = requestData.length;
	}

	//Set the host
	headers["Host"] = url.hostname;

	//Display the request debug
	if(wrestle.DEBUG) {
		var lines = [];

		lines.push("DEBUG: Beginning request.".bold);
		//Host
		lines.push(method.toUpperCase() + " " + url.hostname + path);

		//Headers
		Object.keys(headers).forEach(function(header) {
			lines.push(header + ": " + headers[header]);
		});

		//The data
		lines.push(requestData);

		lines.forEach(function(line) { console.log(("> " + line + " ").yellow.inverse); });
	}

	var request = http.request({
		hostname: url.hostname,
		port: url.port,
		path: path,
		method: method.toUpperCase(),
		headers: headers
	}, function(res) {
		res.setEncoding("utf8");
		res.on("data", function(body) {

			if(wrestle.DEBUG) {
				var lines = [];
				lines.push("DEBUG: Response.".bold);
				lines.push("HTTP/" + res.httpVersion + " " + res.statusCode);

				//Headers
				Object.keys(res.headers).forEach(function(header) {
					lines.push(header + ": " + res.headers[header]);
				});

				//The data
				lines = lines.concat(body.split("\n"));

				console.log(""); //New line
				lines.forEach(function(line) { console.log(("> " + line + " ").yellow.inverse); });
			}

			callback(res, res.statusCode, body);
		})
	});

	request.setTimeout(10000);

	//Send the request
	request.write(requestData);
	request.end();

	request.on("error", function(err) {
		wrestle.emit("error", err);
	});
};

/*
 * CLI Interface. All based on events.
 */

wrestle.on("begin", function() {
	if(wrestle.options.display.begin) console.log("Beginning tests.\n");
});

wrestle.on("end", function(report) {
	if(wrestle.options.display.report) {
		console.log(report.tests.all.map(function(test) { return "*"[test.pass ? "green" : "red"]; }).join(""))
		console.log("Testing complete in " + (report.duration/1000).toFixed(3) + "s.", (report.passed + " passed.").green, (report.failed + " failed.").red, report.total + " in total.");
	}
});

wrestle.on("test", function(test) {
	test.on("start", function() {
		if(wrestle.options.display.info) console.log(("Test " + ("#" + (this.index + 1)).underline + ": ").magenta 
			+ this.method.toUpperCase().blue + " " + this.path.cyan, this.parameters || "");

		if(wrestle.options.display.expect) console.log("Expect:  ".magenta + (this.code || 200), (wrestle.prettySchema(this.schema) || ""));
	});

	test.on("finish", function(err, code, data) {
		if(wrestle.options.display.response) console.log("Reponse:".magenta, code);
		if(wrestle.options.display.responseData) console.log(JSON.stringify(wrestle.prettyResponse(data), null, 4));
	});

	test.on("pass", function(code, data) {
		if(wrestle.options.display.pass) console.log(("Test passed. (" + (this.duration.toFixed(3)/1000) + "s)\n").green);
	});

	test.on("fail", function(err, code, data) {
		// Pretty error
		switch(err.type) {
			case "unexpected_token":
				err.message = "Invalid JSON response."
			break;
		}

		if(wrestle.options.display.fail) {
			console.log(("Test failed. (" + (this.duration.toFixed(3)/1000) + "s)\n").red + err.message.red.inverse, "\n");
		}
	});
});

wrestle.on("error", function(err) {
	var msg = err.toString().replace(/^Error\:/, "");

	switch(err.code || err.type) {
		case "ECONNREFUSED":
			msg = "Cannot reach server"
		break;

		case "ECONNRESET":
			msg = "Request timeout"
		break;
	}

	console.log(("\nError: " + msg + (err.code ? ", " + err.code : "")).red.inverse);
})

module.exports = wrestle;