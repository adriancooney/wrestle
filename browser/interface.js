/*
 * Resteasy browser interface. This file includes
 * definition for resteasy#httpRequest and the GUI
 * for the browser testing suite.
 */
resteasy.httpRequest = function(url, method, data, callback) {
	if(!url || !method || !callback) throw new Error("Please supply all params for resteasy#httpRequest.")
	var request = new XMLHttpRequest();

	request.open(method.toUpperCase(), url);

	if(data) {
		if(method == "get") url = resteasy.toURL(url, data);
		else {
			request.setRequestHeader("content-type", "application/x-www-form-urlencoded; charset=utf-8");
		}
	}

	request.onreadystatechange = function(event) {
		if(request.readyState == 4) {
			// Since resteasy currently only supports JSON APIs, we convert to json
			var json, err;
			try {
				json = JSON.parse(request.responseText);
			} catch(e) {
				err = e;
			} finally {
				callback(err, request.status, err ? request.responseText : json);
			}
		}
	};


	request.send((method !== "get" && data) ? resteasy.queryString(data) : undefined);
};

resteasy.addEventListener("begin", function() {
	console.log("Beginning tests.");
});

resteasy.addEventListener("end", function(report) {
	console.log("Testing complete. %c" + report.passed + " passed. %c" + report.failed + " failed. %c" + report.total + " in total.", "color: green", "color: red", "color: black");
});

resteasy.addEventListener("start", function(test) {
	console.group("Test #" + (test.index + 1) + ": " + test.type.toUpperCase() + " " + test.url);
});

resteasy.addEventListener("finish", function() {
	console.groupEnd();
});

resteasy.addEventListener("pass", function(test, data) {
	console.log("%cTest passed.", "color: green", data);
});

resteasy.addEventListener("fail", function(test, err) {
	console.log("%cTest failed.", "color: #d20e0e", err.message);
});

document.addEventListener("DOMContentLoaded", function() {
	resteasy.begin();
});