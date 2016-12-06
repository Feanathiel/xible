module.exports = function(FLUX) {

	function constr(NODE) {

		let triggerIn = NODE.addInput('trigger', {
			type: "trigger"
		});

		let swIn = NODE.addInput('switch', {
			type: "glow.switch"
		});

		let stateIn = NODE.addInput('state', {
			type: "boolean"
		});

		let doneOut = NODE.addOutput('done', {
			type: "trigger"
		});

		triggerIn.on('trigger', (conn, state) => {

			NODE.getValuesFromInput(swIn, state).then((sws) => {

				NODE.getValuesFromInput(stateIn, state).then((states) => {

					let switchState = NODE.data.state === 'true';
					if (states.length) {
						switchState = states.indexOf(false) === -1;
					}

					Promise.all(sws.map((sw) => sw.connected && (switchState ? sw.switchOn() : sw.switchOff())))
						.then(() => FLUX.Node.triggerOutputs(doneOut, state));

				});

			});

		});

	}

	FLUX.addNode('glow.switch.setstate', {
		type: "action",
		level: 0,
		groups: ["glow"],
		description: "Toggles a switch registrered in Glow."
	}, constr);

};