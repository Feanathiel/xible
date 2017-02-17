module.exports = function(NODE) {

	let triggerIn = NODE.getInputByName('trigger');
	let ansibleIn = NODE.getInputByName('ansible');
	let hostIn = NODE.getInputByName('hostgroup');
	let pathIn = NODE.getInputByName('path');

	let triggerOut = NODE.getOutputByName('done');

	triggerIn.on('trigger', (conn, state) => {

		if (!hostIn.isConnected() || !ansibleIn.isConnected()) {
			return;
		}

		Promise.all([ansibleIn.getValues(state), hostIn.getValues(state), pathIn.getValues(state)])
			.then(([ansibles, hosts, paths]) => {

				if (!paths.length) {
					paths = [NODE.data.path];
				}

				return Promise.all(ansibles.map((ansible) => {

					return Promise.all(hosts.map((host) => {

						return Promise.all(paths.map((path) => {

							let args = {
								path: path
							};

							if (NODE.data.state) {
								args.state = NODE.data.state;
							}

							if (NODE.data.owner) {
								args.owner = NODE.data.owner;
							}

							if (NODE.data.group) {
								args.group = NODE.data.group;
							}

							if (NODE.data.permissions) {
								args.mode = NODE.data.permissions;
							}

							let cmd = ansible
								.module('file')
								.hosts(host.groupName)
								.args(args);

							cmd.on('stdout', (data) => {

								data = data.toString();
								if (!data || !data.replace(/[\r\n]/g, '').trim()) {
									return;
								}

								//let this be handlded by the generic fail handler
								if (data.indexOf('| FAILED ') > -1) {
									return;
								}

								NODE.addStatus({
									message: data,
									timeout: 5000,
									color: data.indexOf('| FAILED ') > -1 ? 'red' : (data.indexOf('| success ') > -1 ? 'green' : null)
								});

							});

							return cmd.exec();

						}));

					}));

				}));

			}).then(() => {
				triggerOut.trigger(state);
			}).catch((err) => {

				err = err.toString();

				NODE.addStatus({
					message: err,
					timeout: 5000,
					color: 'red'
				});

				NODE.fail(err, state);

			});

	});

};