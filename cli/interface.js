var http = require("http"),
	URL = require("url"),
	color = require("colors"),
	resteasy = require("../index.js").resteasy;

/**
 * resteasy node HTTP interface
 */
resteasy.httpRequest = function(url, method, data, callback) {
	var headers = {};
	url = URL.parse(url);
	method = method.toLowerCase();

	if(data && method !== "get") {
		headers["content-type"] = "application/x-www-form-urlencoded; charset=utf-8";
	}

	var request = http.request({
		hostname: url.hostname,
		port: url.port,
		path: (method == "get" && data ? resteasy.toURL(url.path, data) : url.path),
		method: method.toUpperCase(),
		headers: headers
	}, function(res) {
		res.setEncoding("utf8");
		res.on("data", function(body) {
			try {
				var json = JSON.parse(body);
				callback(false, res.statusCode, json);
			} catch(err) {
				callback(err, res.statusCode, body);
				resteasy.emit("error", err);
			}
		})
	});

	request.setTimeout(100);

	request.write((method !== "get" && data) ? resteasy.queryString(data) : "");
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
	if(resteasy.options.display.info) console.log(("Test #" + (test.index + 1) + ": ").magenta 
		+ test.method.toUpperCase().blue + " " + test.path.cyan, test.data || "");

	if(resteasy.options.display.expect) console.log("Expect:  ".magenta + (test.code || 200), (test.schema || ""));
});

resteasy.on("finish", function(test, err, code, data) {
	if(resteasy.options.display.response) console.log("Reponse:".magenta, code, data);
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