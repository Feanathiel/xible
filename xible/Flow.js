'use strict';

const EventEmitter = require('events').EventEmitter;

const Node = require('./Node');
const Connector = require('./Connector');

  var FLOWS = [];
  const http = {};

  class Flow extends EventEmitter {
    constructor(obj) {
      super();

      this._id = null;
      this.state = Flow.STATE_STOPPED;

      if (obj) {
        Object.assign(this, obj);
      }

      this.removeAllListeners();

      // setup viewstate
      this.viewState = {
        left: obj && obj.viewState && obj.viewState.left ? obj.viewState.left : 0,
        top: obj && obj.viewState && obj.viewState.top ? obj.viewState.top : 0,
        zoom: obj && obj.viewState && obj.viewState.zoom ? obj.viewState.zoom : 1,
        backgroundLeft: obj && obj.viewState &&
          obj.viewState.backgroundLeft ? obj.viewState.backgroundLeft : 0,
        backgroundTop: obj && obj.viewState &&
          obj.viewState.backgroundTop ? obj.viewState.backgroundTop : 0
      };

      // setup nodes
      if (obj && obj.nodes) {
        this.initNodes(obj.nodes);
      } else {
        this.nodes = [];
      }

      // setup connectors
      if (obj && obj.connectors) {
        this.initConnectors(obj.connectors);
      } else {
        this.connectors = [];
      }
    }

    initNodes(nodes) {
      this.nodes = [];
      nodes.forEach(node => this.addNode(new Node(node)));
    }

    initConnectors(connectors) {
      this.connectors = [];
      connectors.forEach((conn) => {
        conn.origin = this.getOutputById(conn.origin);
        conn.destination = this.getInputById(conn.destination);

        this.addConnector(new Connector(conn));
      });
    }

    static getById(id) {
      return Promise.resolve(FLOWS[id]);
    }

    static getAll() {
      return Promise.resolve(FLOWS);
    }

    static get STATE_STOPPED() {
      return 0;
    }

    delete() {
      this.undirect();

      if (!this._id) {
        return Promise.resolve();
      }

      this.emit('delete');

// TODO delete
      return Promise.resolve();
    }

    save(asNew) {
      this.undirect();

      return new Promise((resolve, reject) => {
        resolve(this);
// TODO generate id
//this._id = reqJson._id;
//const json = this.toJson();
      });
    }

    undirect() {
      this.emit('undirect');
    }

    direct(related) {
      // throttle
      if (this._lastPostDirectFunction || this._lastDirectPromise) {
        const hasFunction = !!this._lastPostDirectFunction;

        this._lastPostDirectFunction = () => {
          this.direct(related);
          this._lastPostDirectFunction = null;
        };

        if (!hasFunction) {
          this._lastDirectPromise.then(this._lastPostDirectFunction);
        }

        return Promise.resolve();
      }

      // ensure this flow is saved first
      if (!this._id) {
        return this.save()
        .then(() => this.direct(related));
      }

      if (!related) {
        return Promise.reject('related argument missing');
      }

      this._lastDirectPromise = new Promise((resolve, reject) => {
        const nodes = related.nodes.map(node => ({
          _id: node._id,
          data: node.data
        }));

        const req = http.request('PATCH', `/api/flows/${encodeURIComponent(this._id)}/direct`);
        req.toString(nodes)
        .then(() => {
          resolve(this);
          this._lastDirectPromise = null;

          this.emit('direct');
        })
        .catch((err) => {
          reject(err);
        });
      });

      return this._lastDirectPromise;
    }

    // TODO: this functions isn't 'pretty'
    // and it should be toJSON().
    toJson(nodes, connectors) {
      // the nodes
      const NODE_WHITE_LIST = ['_id', 'name', 'type', 'left', 'top', 'inputs', 'outputs', 'hidden', 'global'];
      let dataObject;
      let inputsObject;
      let outputsObject;
      const nodeJson = JSON.stringify(nodes || this.nodes, function jsonStringify(key, value) {
        switch (key) {
          case 'inputs':
            inputsObject = value;
            return value;

          case 'outputs':
            outputsObject = value;
            return value;

          case 'data':
            if (this !== inputsObject && this !== outputsObject) {
              dataObject = value;
              return value;
            }

          default: // eslint-disable-line no-fallthrough
            if (this !== inputsObject && this !== outputsObject && this !== dataObject
              && key && isNaN(key) && NODE_WHITE_LIST.indexOf(key) === -1
            ) {
              return; // eslint-disable-line consistent-return
            }
            return value;
        }
      });

      // the connectors
      const CONNECTOR_WHITE_LIST = ['_id', 'origin', 'destination', 'type', 'hidden'];
      const connectorJson = JSON.stringify(connectors || this.connectors, (key, value) => {
        if (key && isNaN(key) && CONNECTOR_WHITE_LIST.indexOf(key) === -1) {
          return;
        } else if (value && (key === 'origin' || key === 'destination')) {
          return value._id; // eslint-disable-line consistent-return
        }
        return value; // eslint-disable-line consistent-return
      });

      return `{"_id":${JSON.stringify(this._id)},"nodes":${nodeJson},"connectors":${connectorJson},"viewState":${JSON.stringify(this.viewState)}}`;
    }

    /**
    * Sets the viewstate of a flow
    * @param {Object} viewState
    * @param {Number} viewState.left
    * @param {Number} viewState.top
    * @param {Number} viewState.backgroundLeft
    * @param {Number} viewState.backgroundTop
    * @param {Number} viewState.zoom
    */
    setViewState(viewState) {
      this.viewState = viewState;
    }

    getNodeById(id) {
      return this.nodes.find(node => node._id === id);
    }

    addConnector(connector) {
      if (connector.flow) {
        throw new Error('connector already hooked up to other flow');
      }

      this.connectors.push(connector);
      connector.flow = this;
      return connector;
    }

    deleteConnector(connector) {
      const index = this.connectors.indexOf(connector);
      if (index > -1) {
        this.connectors.splice(index, 1);
      }
      connector.flow = null;
    }

    addNode(node) {
      if (node.flow) {
        throw new Error('node already hooked up to other flow');
      }

      this.nodes.push(node);
      node.flow = this;

      return node;
    }

    deleteNode(node) {
      const index = this.nodes.indexOf(node);
      if (index > -1) {
        this.nodes.splice(index, 1);
      }
      node.flow = null;
    }

    getInputById(id) {
      for (let i = 0; i < this.nodes.length; i += 1) {
        const node = this.nodes[i];
        for (const name in node.inputs) {
          if (node.inputs[name]._id === id) {
            return node.inputs[name];
          }
        }
      }
      return null;
    }

    getOutputById(id) {
      for (let i = 0; i < this.nodes.length; i += 1) {
        const node = this.nodes[i];
        for (const name in node.outputs) {
          if (node.outputs[name]._id === id) {
            return node.outputs[name];
          }
        }
      }
      return null;
    }

    /**
    * returns an array of all nodes in this flow that contain at least one global output
    * @returns {Node[]} list of nodes
    */
    getGlobalNodes() {
      return this.nodes.filter(node => node.getOutputs().some(output => output.global));
    }

    /**
    * returns an array of all outputs in this flow that are global
    * @returns {Output[]} list of nodes
    */
    getGlobalOutputs() {
      let globalOutputs = [];
      for (let i = 0; i < this.nodes.length; i += 1) {
        globalOutputs = globalOutputs.concat(this.nodes[i].getGlobalOutputs());
      }
      return globalOutputs;
    }

    removeAllStatuses() {
      this.nodes.forEach((node) => {
        node.removeAllStatuses();
      });
    }
  }

  module.exports = Flow;
