const https = require('https');

function getWeatherInfo(location, date, unit, callback) {

	https.get(`https://query.yahooapis.com/v1/public/yql?format=json&q=` + encodeURIComponent(`select * from weather.forecast where woeid in (select woeid from geo.places(1) where text="${location}") and u="${unit}"`), res => {

		let body = '';
		res.setEncoding('utf8');

		res.on('data', chunk => {
			body += chunk;
		});

		res.on('end', () => {

			let json = JSON.parse(body);

			let weather = null;
			if (json.query && json.query.results && json.query.results.channel) {
				weather = {
					atmosphere: json.query.results.channel.atmosphere,
					condition: json.query.results.channel.item.condition
				};
			}

			callback(weather);

		});

	});

}

module.exports = function(NODE) {

	let locationIn = NODE.getInputByName('location');
	let dateIn = NODE.getInputByName('date');

	let tempOut = NODE.getOutputByName('temperature');
	tempOut.on('trigger', (conn, state, callback) => {

		locationIn.getValues(state).then((locations) => {

			dateIn.getValues(state).then((dates) => {

				var result = [];

				if (!locations.length && NODE.data.location) {
					locations.push(NODE.data.location);
				}

				if (!dates.length) {
					dates.push(new Date());
				}

				let doneCount = 0;
				let resultCount = locations.length * dates.length;

				locations.forEach((location) => {

					dates.forEach((date) => {

						getWeatherInfo(location, date, 'c', (weather) => {

							if (weather) {
								result.push(weather.condition.temp);
							}

							//text (cloud)

							if (++doneCount === resultCount) {
								callback(result);
							}

						});
					});

				});

				if (!locations.length) {
					callback(result);
				}

			});

		});

	});

};
