module.exports = function(FLUX) {

	function constr(NODE) {

		let triggerIn = NODE.getInputByName('trigger');
		triggerIn.on('trigger', (conn, state) => {

			FLUX.Node.getValuesFromInput(NODE.getInputByName('value'), state).then((strs) => {

				if (!strs.length) {
					strs.push(NODE.data.value || '');
				}

				strs.forEach(str => {

					console.log(str);

					NODE.addStatus({
						message: str + '',
						timeout: 3000
					});

				});

				FLUX.Node.triggerOutputs(NODE.getOutputByName('done'), state);

			});

		});

	}

	FLUX.addNode('consoleLog', {
		type: "action",
		level: 0,
		groups: ["basics", "logging"],
		inputs: {
			"trigger": {
				type: "trigger"
			},
			"value": {}
		},
		outputs: {
			"done": {
				type: "trigger"
			}
		}
	}, constr);

};
