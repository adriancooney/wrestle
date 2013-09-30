resteasy.define("url", "http://api.localhost:8000");

resteasy.get("/api").expect({

});

resteasy.get("/lawl").expect(404);

resteasy.post("/option", {
	"auth": "$user.id"
}).expect({
	name: String,
	age: Number,
	field: /.*/,
	age: [{
		date: {
			
		}
	}]
});