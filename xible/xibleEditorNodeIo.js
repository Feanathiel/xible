
const NodeIo = require('./Io');
const XibleEditorConnector = require('./XibleEditorConnector');

class XibleEditorNodeIo extends NodeIo {
    constructor(name, obj, isOutput) {
      const el = document.createElement('li');
      el.appendChild(document.createElement('div'));
  
      super(name, Object.assign({}, obj, {
        element: el
      }), isOutput);
  
      // double click for global
      this.element.addEventListener('dblclick', () => {
        const globalValue = !this.global;
        if (
          !this.isOutput &&
          !this.node.flow.getGlobalOutputs()
          .find(gOutput => gOutput.type === this.type)
        ) {
          return;
        }
  
        this.setGlobal(globalValue);
      });
  
      // enable mousedown -> mousemove handler for creating new connections
      this.enableHook();
    }
  
    setSingleType(bool) {
      super.setSingleType(bool);
  
      // TODO: unhook eventlisteners when changing singleType
  
      if (this.singleType) {
        this.on('attach', (conn) => {
          const connLoc = conn[!this.isOutput ? 'origin' : 'destination'];
          if (connLoc && connLoc.type) {
            this.setType(connLoc.type);
          }
        });
  
        this.on('detach', () => {
          if (!this.connectors.length) {
            this.setType(null);
          }
        });
      }
  
      this.verifyConnectors();
    }
  
    setGlobal(global) {
      super.setGlobal(global);
  
      if (global) {
        this.element.classList.add('global');
      } else {
        this.element.classList.remove('global');
      }
  
      if(this.isOutput){
        if (this.node && this.node.flow) {
          this.node.flow.emit('global', this);
        }
      }
    }
  
    setType(type) {
      // remove old type
      if (this.type) {
        this.element.classList.remove(this.type);
      }
  
      super.setType(type);
  
      // set new type
      if (type) {
        this.element.classList.add(type);
      }
  
      return this;
    }
  
    setName(name) {
      // remove old name
      if (this.element.firstChild.firstChild) {
        this.element.firstChild.removeChild(this.element.firstChild.firstChild);
      }
  
      super.setName(name);
  
      // set new name
      this.element.firstChild.appendChild(document.createTextNode(name));
  
      return this;
    }
  
    hide() {
      super.hide();
      this.element.style.display = 'none';
    }
  
    unhide() {
      super.unhide();
      this.element.style.display = '';
    }
  
    enableHook() {
      const el = this.element;
  
      // handle whenever someone inits a new connector on this action
      el.addEventListener('mousedown', (event) => {
        // we only take action from the first mousebutton
        if (event.button !== 0) {
          return;
        }
  
        // if there's nothing to move, return
        if (event.shiftKey && this.connectors.length === 0) {
          return;
        }
  
        event.stopPropagation();
  
        // only start a connector after we moved a little
        // this prevents picking up double click
        const initPageX = event.pageX;
        const initPageY = event.pageY;
  
        let mouseMoveListener;
        document.addEventListener('mousemove', mouseMoveListener = (event) => {
          // confirm that we moved
          const pageX = event.pageX;
          const pageY = event.pageY;
          if (Math.abs(pageX - initPageX) > 2 || Math.abs(pageY - initPageY) > 2) {
            document.removeEventListener('mousemove', mouseMoveListener);
            mouseMoveListener = null;
  
            // create a dummy action that acts as the input parent while moving
            let dummyNode = this.node.editor.createDummyNode();
  
            // hide the dummy
            dummyNode.element.style.visibility = 'hidden';
            dummyNode.element.style.zIndex = -1;
  
            let outGoing = this.isOutput;
            outGoing = event.shiftKey ? !outGoing : outGoing;
  
            let dummyIo;
            // create a dummyinput that acts as the connector endpoint
            if (outGoing) {
              dummyIo = this.node.editor.createDummyIo(false);
              dummyNode.addInput(dummyIo);
            } else {
              dummyIo = this.node.editor.createDummyIo(true);
              dummyNode.addOutput(dummyIo);
            }
  
            // add the dummy to the editor
            this.node.editor.addNode(dummyNode);
  
            // get window offsets for viewport
            const actionsOffset = this.node.editor.getOffsetPosition();
  
            // set the initial position at the mouse position
            const left = ((event.pageX - actionsOffset.left - this.node.editor.left) / this.node.editor.zoom) -
              dummyIo.element.offsetLeft - (outGoing ? 0 : dummyIo.element.offsetWidth + 2);
            const top = ((event.pageY - actionsOffset.top - this.node.editor.top) / this.node.editor.zoom) -
              dummyIo.element.offsetTop - (dummyIo.element.offsetHeight / 2);
  
              dummyNode.setPosition(left, top);
  
            // append the connector
            if (event.shiftKey) {
              // find selected connectors
              const selectedConnectors = this.node.editor.selection
              .filter(sel => sel instanceof XibleEditorConnector && (sel.origin === this || sel.destination === this));
              this.node.editor.dummyXibleConnectors = selectedConnectors.length ?
                selectedConnectors : this.connectors.slice(0);
  
              if (outGoing) {
                this.node.editor.dummyXibleConnectors
                .forEach(conn => conn.setDestination(dummyIo));
              } else {
                this.node.editor.dummyXibleConnectors
                .forEach(conn => conn.setOrigin(dummyIo));
              }
            } else {
              this.node.editor.dummyXibleConnectors = [
                this.node.editor.addConnector(new XibleEditorConnector({
                  origin: outGoing ? this : dummyIo,
                  destination: outGoing ? dummyIo : this,
                  type: this.type
                }))
              ];
            }
  
            // make the dummy action drag
            this.node.editor.deselect();
            this.node.editor.select(dummyNode);
            this.node.editor.initDrag(event);
  
            // keep track of these for snap ins
            this.node.editor.dummyXibleConnectors.originalOrigin =
              this.node.editor.dummyXibleConnectors[0].origin;
            this.node.editor.dummyXibleConnectors.originalDestination =
              this.node.editor.dummyXibleConnectors[0].destination;
          }
        });
  
        document.addEventListener('mouseup', () => {
          if (mouseMoveListener) {
            document.removeEventListener('mousemove', mouseMoveListener);
            mouseMoveListener = null;
          }
        }, {
          once: true
        });
      });
  
      // handle whenever someone drops a new connector on this nodeio
      el.addEventListener('mouseup', () => {
        const connectors = this.node.editor.dummyXibleConnectors;
        if (!connectors) {
          return;
        }
  
        const outGoing = this.isOutput;
        const end = connectors[0][(outGoing ? 'origin' : 'destination')];
        if (
          end !== this.node.editor.dummyIo &&
          end !== this
        ) {
          return;
        }
  
        this.matchesConnectors(connectors)
        .then((matchesConnectors) => {
          if (!matchesConnectors) {
            return;
          }
  
          // create the new connectors
          connectors.forEach((conn) => {
            const newConn = new XibleEditorConnector({
              origin: outGoing ? this : conn.origin,
              destination: outGoing ? conn.destination : this
            });
  
            if (newConn.destination.global) {
              newConn.destination.setGlobal(undefined);
            }
  
            this.node.editor.loadedFlow.flow.connectors.push(newConn);
            this.node.editor.addConnector(newConn);
          });
  
          // ensure we deselect
          this.node.editor.deselect();
  
          // destroy the temporary connector & dummyXibleNode
          this.node.editor.dummyXibleConnectors = null;
          this.node.editor.dummyIo = null;
          this.node.editor.dummyXibleNode.delete();
          this.node.editor.dummyXibleNode = null;
        });
      });
  
      // handle snap-to whenever a new connector is hovered over this io
      el.addEventListener('mouseover', () => {
        const connectors = this.node.editor.dummyXibleConnectors;
        if (!connectors) {
          return;
        }
  
        // we don't allow snap-in if the selected connectors are of multiple types,
        // while the input/output only allows a single type to be connected
        if (this.singleType) {
          const multiType = !this.isOutput ?
            connectors
            .some(conn => conn.origin.type !== connectors[0].origin.type) :
            connectors
            .some(conn => conn.destination.type !== connectors[0].destination.type);
          if (multiType) {
            return;
          }
        }
  
        const outGoing = this.isOutput;
        const end = connectors[0][(outGoing ? 'origin' : 'destination')];
        if (
          end !== this.node.editor.dummyIo &&
          end !== this
        ) {
          return;
        }
  
        this.matchesConnectors(connectors)
        .then((matchesConnectors) => {
          if (!matchesConnectors) {
            return;
          }
  
          if (!this.isOutput) {
            connectors.forEach(conn => conn.setDestination(this));
          } else {
            connectors.forEach(conn => conn.setOrigin(this));
          }
        });
      });
  
      // handle snap-out
      el.addEventListener('mouseout', () => {
        const connectors = this.node.editor.dummyXibleConnectors;
        if (
          !this.isOutput && connectors &&
          connectors[0].destination === this &&
          connectors[0].destination !== connectors.originalDestination
        ) {
          connectors.forEach(conn => conn.setDestination(this.node.editor.dummyIo));
        } else if (
          this.isOutput && connectors &&
          connectors[0].origin === this &&
          connectors[0].origin !== connectors.originalOrigin
        ) {
          connectors.forEach(conn => conn.setOrigin(this.node.editor.dummyIo));
        }
      });
    }
  }

module.exports = XibleEditorNodeIo;
