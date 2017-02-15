module.exports = function(NODE) {

	let used = false;
	let refreshing = false;
	let values;

	let refreshIn = NODE.getInputByName('refresh');
	let valueIn = NODE.getInputByName('value');

	let refreshOut = NODE.getOutputByName('refreshed');
	let valueOut = NODE.getOutputByName('value');

	refreshIn.on('trigger', (conn, state) => {

		//get the input values
		refreshing = true;
		valueIn.getValues(state).then(vals => {

			//
			used = true;
			refreshing = false;
			values = vals;

			//save the state
			state.set(this, {
				values: vals
			});

			refreshOut.trigger(state);

		});

	});

	valueOut.on('trigger', (conn, state, callback) => {

		//state handling (if refresh complete was used)
		let thisState = state.get(this);
		if (thisState) {

			callback(thisState.values);
			return;

		}

		//callback immeditialy if we already have this value(s) in store
		if (used) {

			callback(values);
			return;

		}

		//wait to callback when we're currently refreshing the value(s)
		if (refreshing) {

			valueOut.once('triggerdone', () => {
				callback(values);
			});

			return;

		}

		//perform a refresh of all inputs and return those values
		refreshing = true;
		valueIn.getValues(state).then((vals) => {

			values = vals;
			used = true;
			refreshing = false;
			callback(values);

		});

	});

};
