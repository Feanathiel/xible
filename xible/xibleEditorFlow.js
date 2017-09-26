'use strict';

const EventEmitter = require('events').EventEmitter;

const Flow = require('./Flow');
const XibleEditorNode = require('./XibleEditorNode.js');
const XibleEditorConnector = require('./XibleEditorConnector.js');

class XibleEditorFlow extends EventEmitter {
  constructor(obj, flow) {
    super(obj);
    this.flow = flow;

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

    // set global appropriately when it's changed
    this.on('global', (output) => {
      this.setGlobalFromOutput(output);
    });
  }

  setGlobalFromOutput(output) {
    // if we have another global of this type, ignore
    let globalOutputsByType = this.getGlobalOutputs()
    .filter(gOutput => gOutput.type === output.type);
    if (
      (!output.global && globalOutputsByType.length) ||
      (output.global && globalOutputsByType.length > 1)
    ) {
      return;
    }
    globalOutputsByType = null;

    for (let i = 0; i < this.nodes.length; i += 1) {
      this.nodes[i].getInputs().forEach((input) => {
        if (
          input.type === output.type && !input.connectors.length &&
          input.global !== false
        ) {
          input.setGlobal(output.global ? true : undefined);
        }
      });
    }
  }

  initNodes(nodes) {
    this.nodes = [];
    nodes.forEach(node => this.addNode(new XibleEditorNode(node)));
  }

  initConnectors(connectors) {
    this.connectors = [];
    connectors.forEach((conn) => {
      conn.origin = this.getOutputById(conn.origin);
      conn.destination = this.getInputById(conn.destination);

      this.addConnector(new XibleEditorConnector(conn));
    });
  }

  // TODO: simply have XibleEditor set viewState to loadedFlow directly?
  toJson(nodes, connectors) {
    // the viewstate
    const viewState = {
      left: this.editor.left,
      top: this.editor.top,
      zoom: this.editor.zoom,
      backgroundLeft: this.editor.backgroundLeft,
      backgroundTop: this.editor.backgroundTop
    };

    return this.flow.toJson(nodes, connectors, viewState);
  }
}

module.exports = XibleEditorFlow;
