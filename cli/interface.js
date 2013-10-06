var http = require("http"),
	URL = require("url"),
	color = require("colors"),
	resteasy = require("../index.js").resteasy;

/**
 * resteasy node HTTP interface
 */
resteasy.httpRequest = function(url, method, headers, data, callback) {
	headers = headers || {};
	url = URL.parse(url);
	method = method.toLowerCase();

	var requestData = (method !== "get" && data) ? resteasy.queryString(data) : "",
		path = (method == "get" && data ? resteasy.toURL(url.path, data) : url.path);

	if(data && method !== "get") {
		headers["Content-Type"] = "application/x-www-form-urlencoded; charset=utf-8";
		headers["Content-Length"] = requestData.length;
	}

	//Set the host
	headers["Host"] = url.hostname;

	//Display the request debug
	if(resteasy.DEBUG) {
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

			if(resteasy.DEBUG) {
				var lines = [];
				lines.push("DEBUG: Response.".bold);
				lines.push("HTTP/" + res.httpVersion + " " + res.statusCode);

				//Headers
				Object.keys(res.headers).forEach(function(header) {
					lines.push(header + ": " + res.headers[header]);
				});

				//The data
				lines.push(body);

				console.log(""); //New line
				lines.forEach(function(line) { console.log(("> " + line + " ").yellow.inverse); });
			}

			try {
				var json = JSON.parse(body);
				callback(false, res, res.statusCode, json);
			} catch(err) {
				throw err;
				callback(err, res, res.statusCode, body);
				resteasy.emit("error", err);
			}
		})
	});

	request.setTimeout(10000);

	//Send the request
	request.write(requestData);
	request.end();

	request.on("error", function(err) {
		resteasy.emit("error", err);
	});
};

resteasy.on("begin", function() {
	if(resteasy.options.display.begin) console.log("Beginning tests.\n");
});

resteasy.on("end", function(report) {
	if(resteasy.options.display.report) {
		console.log(report.tests.all.map(function(test) { return "*"[test.pass ? "green" : "red"]; }).join(""))
		console.log("Testing complete.", (report.passed + " passed.").green, (report.failed + " failed.").red, report.total + " in total.");
	}
});

resteasy.on("start", function(test) {
	if(resteasy.options.display.info) console.log(("Test " + ("#" + (test.index + 1)).underline + ": ").magenta 
		+ test.method.toUpperCase().blue + " " + test.path.cyan, test.parameters || "");

	if(resteasy.options.display.expect) console.log("Expect:  ".magenta + (test.code || 200), (resteasy.prettySchema(test.schema) || ""));
});

resteasy.on("finish", function(test, err, code, data) {
	if(resteasy.options.display.response) console.log("Reponse:".magenta, code);
	if(resteasy.options.display.responseData) console.log(JSON.stringify(resteasy.prettyResponse(data), null, 4));
});

resteasy.on("pass", function(test, code, data) {
	if(resteasy.options.display.pass) console.log("Test passed.\n".green);
});

resteasy.on("fail", function(test, err, code, data) {
	if(resteasy.options.display.fail) console.log("Test failed.".red, err.message, "\n");
});

resteasy.on("error", function(err) {
	var msg = err.toString().replace(/^Error\:/, "");

	switch(err.code || err.type) {
		case "ECONNREFUSED":
			msg = "Cannot reach server"
		break;

		case "ECONNRESET":
			msg = "Request timeout"
		break;

		case "unexpected_token":
			msg = "Invalid JSON response"
		break;
	}

	console.log(("\nError: " + msg + (err.code ? ", " + err.code : "")).red.inverse);
})

module.exports = resteasy;