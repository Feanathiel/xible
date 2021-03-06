'use strict';

const EventEmitter = require('events').EventEmitter;
const NodeInput = require('./Io').Input;
const NodeOutput = require('./Io').Output;
const Utils = require('./utils');

// This shouldn't be here
  const NODES = [];

  class Node extends EventEmitter {
    constructor(obj = {}, ignoreData = false) {
      super();

      Object.assign(this, obj);
      this.removeAllListeners();

      if (!this._id) {
        this._id = Utils.generateObjectId();
      }

      // copy data
      this.data = null;
      if (obj.data && !ignoreData) {
        this.data = Object.assign({}, obj.data);
      } else {
        this.data = {};
      }

      // add inputs
      this.initInputs(obj.inputs);

      // add outputs
      this.initOutputs(obj.outputs);

      this.setPosition(obj.left, obj.top);
    }

    initInputs(inputs) {
      this.inputs = {};
      if (inputs) {
        for (const name in inputs) {
          this.addInput(new NodeInput(name, inputs[name]));
        }
      }
    }

    initOutputs(outputs) {
      this.outputs = {};
      if (outputs) {
        for (const name in outputs) {
          this.addOutput(new NodeOutput(name, outputs[name]));
        }
      }
    }

    static register(nodeName, nodeDef) {
      NODES[nodeName] = new Node(nodeDef);
    }

    static getAll() {
      return Promise.resolve(NODES);
    }

    static getAllInputObjectNodes(node) {
      const resultNodes = [node];
      const resultConnectors = [];
      const objectInputs = node.getInputs().filter(input => input.type !== 'trigger');
      objectInputs.forEach((objectInput) => {
        resultConnectors.push(...objectInput.connectors);
        objectInput.connectors.forEach((connector) => {
          const objs = Node.getAllInputObjectNodes(connector.origin.node);
          resultNodes.push(...objs.nodes);
          resultConnectors.push(...objs.connectors);
        });
      });

      return {
        nodes: resultNodes,
        connectors: resultConnectors
      };
    }

    setData(attr, value) {
      if (typeof value === 'undefined') {
        Object.assign(this.data, attr);
      } else {
        this.data[attr] = value;
      }

      this.emit('setdata', attr, value);
      return this;
    }

    getData(attr) {
      return this.data[attr];
    }

    setPosition(left = 0, top = 0) {
      this.left = left;
      this.top = top;

      this.emit('position', this);
    }

    addInput(input) {
      this.addIo(input);
      this.inputs[input.name] = input;

      return input;
    }

    addOutput(output) {
      this.addIo(output);
      this.outputs[output.name] = output;

      return output;
    }

    addIo(child) {
      child.node = this;

      if (!child._id) {
        child._id = Utils.generateObjectId();
      }

      child.node = this;
      return child;
    }

    deleteInput(input) {
      delete this.inputs[input.name];
      input.node = null;

      return input;
    }

    deleteOutput(output) {
      delete this.outputs[output.name];
      output.node = null;

      return output;
    }

    delete() {
      for (const name in this.inputs) {
        this.inputs[name].delete();
      }

      for (const name in this.outputs) {
        this.outputs[name].delete();
      }

      if (this.flow) {
        const nodeIndex = this.flow.nodes.indexOf(this);
        if (nodeIndex > -1) {
          this.flow.nodes.splice(nodeIndex, 1);
        }
      }
    }

    getInputByName(name) {
      return this.inputs[name];
    }

    getOutputByName(name) {
      return this.outputs[name];
    }

    getInputs() {
      return Object.keys(this.inputs)
      .map(key => this.inputs[key]);
    }

    getOutputs() {
      return Object.keys(this.outputs)
      .map(key => this.outputs[key]);
    }

    getGlobalOutputs() {
      return this.getOutputs().filter(output => output.global);
    }

    getInputsByType(type = null) {
      const inputs = [];
      for (const name in this.inputs) {
        if (this.inputs[name].type === type) {
          inputs.push(this.inputs[name]);
        }
      }
      return inputs;
    }

    getOutputsByType(type = null) {
      const outputs = [];
      for (const name in this.outputs) {
        if (this.outputs[name].type === type) {
          outputs.push(this.outputs[name]);
        }
      }
      return outputs;
    }

    removeAllStatuses() { // eslint-disable-line class-methods-use-this
    }
  }

module.exports = Node;

