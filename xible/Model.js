
const EventEmitter = require('events').EventEmitter;

const Flow = require('./Flow');

class Model extends EventEmitter {
    constructor(){
        super();
        this.flows = [];
    }

    createFlow() {
        return new Flow();
    }

    addFlow(flow) {
        this.flows.push(flow);
        this.emit('flow-new', flow);
    }

    getFlows() {
        return this.flows;
    }
}

module.exports = Model;
