'use strict';

const editorView = (EL, options) => {
  EL.innerHTML = `
    <div id="sub">
      <header>XIBLE</header>
      <p id="connectionLost" class="status loading alert hidden">
        Connection lost
      </p>
      <p id="browserSupportAttachShadow" class="status alert hidden">
        Your browser does not support the necessary features to enable all editor functionality.
      </p>
      <section class="buttons editor">
        <button type="button" id="xibleFlowSaveButton">Save</button>
        <button type="button" id="xibleFlowDeleteButton">Delete</button>
      </section>
    </div>
    <div id="flowEditorHolder">
      <div class="zoomButtons">
        <button id="zoomOutButton" type="button" title="Zoom out">&#xe024;</button>
        <button id="zoomFitButton" type="button" title="Zoom to fit">&gt;</button>
        <button id="zoomResetButton" type="button" title="Reset zoom">&#xe01c;</button>
        <button id="zoomInButton" type="button" title="Zoom in">&#xe035;</button>
      </div>
      <ul id="flowList" class="flowList loading"></ul>
    </div>
  `;

  const xibleEditor = new Xible.XibleEditor(Xible.xibleWrapper);
  const connectionLost = document.getElementById('connectionLost');
  const permissionsValidate = document.getElementById('validateWritePermissions');
 
  // check if this browser supports attachShadow
  const browserSupportAttachShadowEl = document.getElementById('browserSupportAttachShadow');
  if (!xibleEditor.browserSupport) {
    browserSupportAttachShadowEl.classList.remove('hidden');

    // disable buttons that require input from content in the browser
    document.getElementById('xibleFlowSaveButton').disabled = true;
  }

  // hook buttons

  // save
  document.getElementById('xibleFlowSaveButton').onclick = () => {
    xibleEditor.loadedFlow.save();
  };

  // delete
  document.getElementById('xibleFlowDeleteButton').onclick = () => {
    if (!xibleEditor.loadedFlow) {
      return;
    }

    if (window.confirm(`Are you sure you wan't to permanently delete flow "${xibleEditor.loadedFlow._id}"?`)) {
      xibleEditor.loadedFlow.delete();

      const flowTab = document.querySelector(`.flowList>li[data-flowid="${xibleEditor.loadedFlow._id}"]`);
      if (flowTab) {
        flowTab.parentNode.removeChild(flowTab);
      }
    }
  };

  // holds the flowlist and editor
  const flowEditorHolder = document.getElementById('flowEditorHolder');

  // zoom and reset
  function zoomOut() {
    if (xibleEditor.zoom < 0.2) {
      return;
    }

    xibleEditor.zoom = (Math.round(xibleEditor.zoom * 10) - 1) / 10;
    xibleEditor.transform();
  }
  document.getElementById('zoomOutButton').onclick = zoomOut;
  function zoomReset() {
    xibleEditor.zoom = 1;
    xibleEditor.transform();
  }
  document.getElementById('zoomResetButton').onclick = zoomReset;
  function zoomIn() {
    if (xibleEditor.zoom >= 5) {
      return;
    }

    xibleEditor.zoom = (Math.round(xibleEditor.zoom * 10) + 1) / 10;
    xibleEditor.transform();
  }
  document.getElementById('zoomInButton').onclick = zoomIn;
  function zoomFit() {
    if (!xibleEditor.loadedFlow || !xibleEditor.loadedFlow.nodes.length) {
      return;
    }

    // get the min/max coordinates from the nodes
    let minLeft;
    let minTop;
    let maxLeft;
    let maxTop;
    for (let i = 0; i < xibleEditor.loadedFlow.nodes.length; i += 1) {
      const node = xibleEditor.loadedFlow.nodes[i];
      const nodeOffsetWidth = node.element.offsetWidth;
      const nodeOffsetHeight = node.element.offsetHeight;

      if (!minLeft || node.left < minLeft) {
        minLeft = node.left;
      }
      if (!maxLeft || node.left + nodeOffsetWidth > maxLeft) {
        maxLeft = node.left + nodeOffsetWidth;
      }
      if (!minTop || node.top < minTop) {
        minTop = node.top;
      }
      if (!maxTop || node.top + nodeOffsetHeight > maxTop) {
        maxTop = node.top + nodeOffsetHeight;
      }
    }

    // get editor size
    const xibleEditorBounding = xibleEditor.element.getBoundingClientRect();
    const xibleEditorWidth = xibleEditorBounding.width;
    const xibleEditorHeight = xibleEditorBounding.height;

    // add some padding to the found node coordinates;
    const PADDING = 40;
    minLeft -= PADDING;
    maxLeft += PADDING;
    minTop -= PADDING;
    maxTop += PADDING;

    // calculate the zoom factor and zoom to the lowest factor
    const widthZoomFactor = xibleEditorWidth / (maxLeft - minLeft);
    const heightZoomFactor = xibleEditorHeight / (maxTop - minTop);
    xibleEditor.zoom = Math.min(widthZoomFactor, heightZoomFactor);

    // set left and top properties for the editor
    if (widthZoomFactor < heightZoomFactor) {
      // set x
      xibleEditor.left = xibleEditor.zoom * -minLeft;

      // center y
      xibleEditor.top = (xibleEditor.zoom * -minTop) + (xibleEditorHeight / 2) -
        (xibleEditor.zoom * ((maxTop - minTop) / 2));
    } else {
      // center x
      xibleEditor.left = (xibleEditor.zoom * -minLeft) + (xibleEditorWidth / 2) -
        (xibleEditor.zoom * ((maxLeft - minLeft) / 2));

      // set y
      xibleEditor.top = xibleEditor.zoom * -minTop;
    }

    // apply the transormation
    xibleEditor.transform();
  }
  document.getElementById('zoomFitButton').onclick = zoomFit;

  let typeDefStyleEl = null;

  /**
  * Loads the style information (color) associated with typeDefs
  */
  function loadTypeDefStyles() {
    Xible.xibleWrapper.TypeDef.getAll()
    .then((typeDefs) => {
      // remove existing style el
      if (typeDefStyleEl && typeDefStyleEl.parentNode) {
        typeDefStyleEl.parentNode.removeChild(typeDefStyleEl);
      }

      // create new style el
      typeDefStyleEl = document.createElement('style');
      typeDefStyleEl.setAttribute('type', 'text/css');
      let styleText = '';
      for (const type in typeDefs) {
        if (typeDefs[type].color && /^\w+$/.test(typeDefs[type].color)) {
          styleText += `.xible .node>.io>ul>.${type.replace(/\./g, '\\.')} {border-color: ${typeDefs[type].color};}\n`;
        }
      }
      if (!styleText) {
        return;
      }

      // add to head
      typeDefStyleEl.appendChild(document.createTextNode(styleText));
      const head = document.head || document.getElementsByTagName('head')[0];
      head.appendChild(typeDefStyleEl);
    });
  }

  // add the flow names to the flow tab list
  const flowListUl = document.getElementById('flowList');

  // disable some buttons when this flow is notRunnable
  function setLoadedFlowState(flow) {
    if (flow !== xibleEditor.loadedFlow) {
      return;
    }
  }

  function setFlowTabState(flow, li) {
    li.classList.remove('initializing', 'initialized', 'direct');

    if (flow.directed) {
      li.classList.add('direct');
    }

    setLoadedFlowState(flow);

    switch (flow.state) {
      case Xible.xibleWrapper.Flow.STATE_INITIALIZING:
        li.classList.add('initializing');
        break;

      case Xible.xibleWrapper.Flow.STATE_INITIALIZED:
        li.classList.add('initialized');
        break;
    }
  }

  function createFlowTab(flow) {
    const li = flowListUl.appendChild(document.createElement('li'));
    li.setAttribute('data-flowId', flow._id);
    const a = li.appendChild(document.createElement('a'));
    a.appendChild(document.createTextNode(flow._id));
    a.setAttribute('title', flow._id);
    a.onclick = () => {
      //mainViewHolder.navigate(`/editor/${flow._id}`, true);

      Array.from(flowListUl.querySelectorAll('li.open'))
      .forEach((li) => {
        li.classList.remove('open');
      });
      li.classList.add('open');

      if (!xibleEditor.viewFlow(flow)) {
        return;
      }

      setLoadedFlowState(flow);
    };

    // if in path, load it immediately
    const pathSplit = window.location.pathname.split('/');
    if (pathSplit.length > 1 && pathSplit[2] === encodeURIComponent(flow._id)) {
      a.click();
    }

    setFlowTabState(flow, li);

    flow.on('loadJson', () => {
      setFlowTabState(flow, li);
    });

    flow.on('initializing', () => {
      setFlowTabState(flow, li);
    });

    flow.on('initialized', () => {
      setFlowTabState(flow, li);
    });

    return li;
  }

  // create button to add new flows
  const li = flowListUl.appendChild(document.createElement('li'));
  li.classList.add('add');
  const a = li.appendChild(document.createElement('a'));
  a.setAttribute('title', 'Add a flow');
  a.appendChild(document.createTextNode('+'));
  a.onclick = () => {
    const flowName = window.prompt('Enter the flow name:');
    if (flowName.substring(0, 1) === '_') {
      window.alert('The flow name may not start with an underscore');
      return;
    } else if (/[/\\:?<>"]/.test(flowName)) {
      window.alert('The flow name may not contain any of the following characters: /\\:?<>');
      return;
    }

    Array.from(document.querySelectorAll('.flowList>li.open'))
    .forEach((li) => {
      li.classList.remove('open');
    });

    const flow = new Xible.XibleEditorFlow({
      _id: flowName
    });
    const flowTab = createFlowTab(flow);
    flowTab.classList.add('open', 'loading');
    flowTab.firstChild.click();

    flow.save(true).then(() => {
      xibleEditor.flows[flow._id] = flow;

      flowTab.addEventListener('animationiteration', () => {
        flowTab.classList.remove('loading');
      }, {
        once: true
      });
    }).catch((err) => {
      // TODO: give feedback about what went wrong

      flowTab.classList.add('notRunnable');

      flowTab.addEventListener('animationiteration', () => {
        flowListUl.removeChild(flowTab);
      }, {
        once: true
      });
    });
  };

  // get all flows and add them
  function loadFlows(flows) {
    flowListUl.classList.add('loading');

    // ensure all flows tabs are gone
    Array.from(flowListUl.querySelectorAll('li:not(.add)'))
    .forEach((li) => {
      flowListUl.removeChild(li);
    });

    var objFlows = xibleEditor.getFlows(flows);
	Object.keys(objFlows).forEach((id) => {
        createFlowTab(objFlows[id]);
      });

      flowListUl.addEventListener('animationiteration', () => {
        flowListUl.classList.remove('loading');
      }, {
        once: true
      });
  }

  function loadTypeDefs(typeDefs) {
      Object.keys(typeDefs).forEach((id) => {
        Xible.xibleWrapper.TypeDef.register(id, typeDefs[id]);
      });
  }

  function loadNodes(nodes) {
    Object.keys(nodes).forEach((id) => {
        Xible.xibleWrapper.Node.register(id, nodes[id]);
      });
  }

  // add the xibleEditor to the view
  flowEditorHolder.appendChild(xibleEditor.element);

// typedefs
loadTypeDefs(options.typeDefs);

loadNodes(options.nodes);

// reload the flows
loadFlows(options.flows);

// reload the typeDef styles
loadTypeDefStyles();

// reload the nodes
xibleEditor.nodeSelector.fill();
};

var element = document.getElementById('mainContent');
var options = {
  typeDefs: {
    "boolean": {
      "color":"purple",
      "extends":"object",
      "name":"boolean"
    },
    "object": {
      "color":"green",
      "name":"object"
    },
    "string": {
      "color":"yellow",
      "extends":"object",
      "name":"string"
    },
    "variable": {
      "color":"darkslategrey",
      "name":"variable"
    },
    "xible.flow": {
      "color":"goldenrod",
      "extends":"object",
      "name":"xible.flow"
    }
  },
  nodes: {
    "boolean": {
      "name": "boolean",
      "type": "object",
      "description": "A boolean representation.",
      "nodeExists": true,
      "hostsEditorContent": true,
      "top": 0,
      "left": 0,
      "data": {
        
      },
      "inputs": {
        
      },
      "outputs": {
        "result": {
          "name": "result",
          "type": "boolean",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      }
    },
    "cast": {
      "name": "cast",
      "type": "object",
      "description": "Change data type into another.",
      "nodeExists": true,
      "hostsEditorContent": true,
      "top": 0,
      "left": 0,
      "data": {
        
      },
      "inputs": {
        "values": {
          "name": "values",
          "type": null,
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      },
      "outputs": {
        "result": {
          "name": "result",
          "type": "string",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      }
    },
    "conditional": {
      "name": "conditional",
      "type": "object",
      "description": "Return the selected value(s) based on the condition.",
      "nodeExists": true,
      "top": 0,
      "left": 0,
      "data": {
        
      },
      "inputs": {
        "condition": {
          "name": "condition",
          "type": "boolean",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        },
        "if true": {
          "name": "if true",
          "type": null,
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        },
        "if false": {
          "name": "if false",
          "type": null,
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      },
      "outputs": {
        "value": {
          "name": "value",
          "type": null,
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      }
    },
    "filter": {
      "name": "filter",
      "type": "object",
      "description": "Filters data based on an input condition.",
      "nodeExists": true,
      "top": 0,
      "left": 0,
      "data": {
        
      },
      "inputs": {
        "any": {
          "name": "any",
          "type": null,
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": "The values to filter based on the condition result."
        },
        "condition": {
          "name": "condition",
          "type": "boolean",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      },
      "outputs": {
        "filtered": {
          "name": "filtered",
          "type": null,
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": "Values from the 'any' input with a corresponding truthy condition."
        },
        "dropped": {
          "name": "dropped",
          "type": null,
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": "Values from the 'any' input with a corresponding falsy condition."
        }
      }
    },
    "group": {
      "name": "group",
      "type": "object",
      "description": "Groups multiple input values together.",
      "nodeExists": true,
      "top": 0,
      "left": 0,
      "data": {
        
      },
      "inputs": {
        "any": {
          "name": "any",
          "type": null,
          "singleType": true,
          "assignsOutputType": "grouped",
          "assignsInputType": null,
          "maxConnectors": null,
          "description": "The values to be grouped."
        }
      },
      "outputs": {
        "grouped": {
          "name": "grouped",
          "type": null,
          "singleType": true,
          "assignsOutputType": null,
          "assignsInputType": "any",
          "maxConnectors": null,
          "description": "List of all values connected to the 'any' input."
        },
        "count": {
          "name": "count",
          "type": "math.number",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": "The amount of connectors to the 'any' input."
        }
      }
    },
    "if": {
      "name": "if",
      "type": "action",
      "description": "Triggers an output based on a condition.",
      "nodeExists": true,
      "top": 0,
      "left": 0,
      "data": {
        
      },
      "inputs": {
        "trigger": {
          "name": "trigger",
          "type": "trigger",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        },
        "condition": {
          "name": "condition",
          "type": "boolean",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      },
      "outputs": {
        "then": {
          "name": "then",
          "type": "trigger",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        },
        "else": {
          "name": "else",
          "type": "trigger",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      }
    },
    "store": {
      "name": "store",
      "type": "object",
      "description": "Stores one or multiple values allowing direct re-use.",
      "nodeExists": true,
      "top": 0,
      "left": 0,
      "data": {
        
      },
      "inputs": {
        "refresh": {
          "name": "refresh",
          "type": "trigger",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        },
        "value": {
          "name": "value",
          "type": null,
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      },
      "outputs": {
        "refreshed": {
          "name": "refreshed",
          "type": "trigger",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        },
        "value": {
          "name": "value",
          "type": null,
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      }
    },
    "waitfor": {
      "name": "waitfor",
      "type": "action",
      "description": "Waits for all the input triggers to have triggered, before continuing.",
      "nodeExists": true,
      "top": 0,
      "left": 0,
      "data": {
        
      },
      "inputs": {
        "trigger": {
          "name": "trigger",
          "type": "trigger",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      },
      "outputs": {
        "done": {
          "name": "done",
          "type": "trigger",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      }
    },
    "compare.smaller": {
      "name": "compare.smaller",
      "type": "object",
      "description": "Checks if all the inputs of 'a' or smaller than any of the inputs of 'b'.",
      "nodeExists": true,
      "top": 0,
      "left": 0,
      "data": {
        
      },
      "inputs": {
        "a": {
          "name": "a",
          "type": "math.number",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        },
        "b": {
          "name": "b",
          "type": "math.number",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      },
      "outputs": {
        "result": {
          "name": "result",
          "type": "boolean",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      }
    },
    "compare.equal": {
      "name": "compare.equal",
      "type": "object",
      "description": "Compares all inputs and verifies that they equal.",
      "nodeExists": true,
      "top": 0,
      "left": 0,
      "data": {
        
      },
      "inputs": {
        "values": {
          "name": "values",
          "type": null,
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      },
      "outputs": {
        "result": {
          "name": "result",
          "type": "boolean",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      }
    },
    "compare.differ": {
      "name": "compare.differ",
      "type": "object",
      "description": "Compares all inputs and checks if they differ from eachother.",
      "nodeExists": true,
      "top": 0,
      "left": 0,
      "data": {
        
      },
      "inputs": {
        "values": {
          "name": "values",
          "type": null,
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      },
      "outputs": {
        "result": {
          "name": "result",
          "type": "boolean",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      }
    },
    "compare.greater": {
      "name": "compare.greater",
      "type": "object",
      "description": "Checks if all the inputs of 'a' or greater than any of the inputs of 'b'.",
      "nodeExists": true,
      "top": 0,
      "left": 0,
      "data": {
        
      },
      "inputs": {
        "a": {
          "name": "a",
          "type": "math.number",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        },
        "b": {
          "name": "b",
          "type": "math.number",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      },
      "outputs": {
        "result": {
          "name": "result",
          "type": "boolean",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      }
    },
    "console.clear": {
      "name": "console.clear",
      "type": "action",
      "description": "When standard out is a TTY, this node will attempt to clear the TTY. When standard out is not a TTY, this node does nothing.",
      "nodeExists": true,
      "top": 0,
      "left": 0,
      "data": {
        
      },
      "inputs": {
        "trigger": {
          "name": "trigger",
          "type": "trigger",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      },
      "outputs": {
        "done": {
          "name": "done",
          "type": "trigger",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      }
    },
    "console.log": {
      "name": "console.log",
      "type": "action",
      "description": "Prints to standard out with newline.",
      "nodeExists": true,
      "hostsEditorContent": true,
      "top": 0,
      "left": 0,
      "data": {
        
      },
      "inputs": {
        "trigger": {
          "name": "trigger",
          "type": "trigger",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        },
        "value": {
          "name": "value",
          "type": null,
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      },
      "outputs": {
        "done": {
          "name": "done",
          "type": "trigger",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      }
    },
    "console.error": {
      "name": "console.error",
      "type": "action",
      "description": "Prints to standard error with newline.",
      "nodeExists": true,
      "hostsEditorContent": true,
      "top": 0,
      "left": 0,
      "data": {
        
      },
      "inputs": {
        "trigger": {
          "name": "trigger",
          "type": "trigger",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        },
        "value": {
          "name": "value",
          "type": null,
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      },
      "outputs": {
        "done": {
          "name": "done",
          "type": "trigger",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      }
    },
    "document": {
      "name": "document",
      "type": "object",
      "description": "A document containing (nested) key-value pairs.",
      "nodeExists": true,
      "top": 0,
      "left": 0,
      "data": {
        
      },
      "inputs": {
        "variable": {
          "name": "variable",
          "type": "variable",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      },
      "outputs": {
        "document": {
          "name": "document",
          "type": "document",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      }
    },
    "document.assign": {
      "name": "document.assign",
      "type": "object",
      "description": "Assigns new key/value pairs to an existing document. Returns a new document, does not update the existing document.",
      "nodeExists": true,
      "top": 0,
      "left": 0,
      "data": {
        
      },
      "inputs": {
        "document": {
          "name": "document",
          "type": "document",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        },
        "variable": {
          "name": "variable",
          "type": "variable",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      },
      "outputs": {
        "document": {
          "name": "document",
          "type": "document",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      }
    },
    "document.property": {
      "name": "document.property",
      "type": "object",
      "description": "Returns a specific value from a document key as a new document.",
      "nodeExists": true,
      "hostsEditorContent": true,
      "top": 0,
      "left": 0,
      "data": {
        
      },
      "inputs": {
        "document": {
          "name": "document",
          "type": "document",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      },
      "outputs": {
        "document": {
          "name": "document",
          "type": "document",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      }
    },
    "document.stringify": {
      "name": "document.stringify",
      "type": "object",
      "description": "Converts a document into a JSON string.",
      "nodeExists": true,
      "top": 0,
      "left": 0,
      "data": {
        
      },
      "inputs": {
        "document": {
          "name": "document",
          "type": "document",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      },
      "outputs": {
        "json": {
          "name": "json",
          "type": "string",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      }
    },
    "object.assign": {
      "name": "object.assign",
      "type": "object",
      "description": "Assigns the values of the source objects to the target object. Returns a new object, does not update the target object.",
      "nodeExists": true,
      "top": 0,
      "left": 0,
      "data": {
        
      },
      "inputs": {
        "target": {
          "name": "target",
          "type": "object",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": 1,
          "description": null
        },
        "sources": {
          "name": "sources",
          "type": "object",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      },
      "outputs": {
        "object": {
          "name": "object",
          "type": "object",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      }
    },
    "object.stringify": {
      "name": "object.stringify",
      "type": "object",
      "description": "Converts one or more objects into a JSON string. If multiple objects are provided, the array containing them will be part of the JSON output.",
      "nodeExists": true,
      "top": 0,
      "left": 0,
      "data": {
        
      },
      "inputs": {
        "objects": {
          "name": "objects",
          "type": "object",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      },
      "outputs": {
        "json": {
          "name": "json",
          "type": "string",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      }
    },
    "object.keys": {
      "name": "object.keys",
      "type": "object",
      "description": "Returns a list of all keys in the given object(s).",
      "nodeExists": true,
      "top": 0,
      "left": 0,
      "data": {
        
      },
      "inputs": {
        "objects": {
          "name": "objects",
          "type": "object",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      },
      "outputs": {
        "keys": {
          "name": "keys",
          "type": "string",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      }
    },
    "object": {
      "name": "object",
      "type": "object",
      "description": "An object containing (nested) key-value pairs.",
      "nodeExists": true,
      "top": 0,
      "left": 0,
      "data": {
        
      },
      "inputs": {
        "variables": {
          "name": "variables",
          "type": "variable",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      },
      "outputs": {
        "object": {
          "name": "object",
          "type": "object",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      }
    },
    "object.value": {
      "name": "object.value",
      "type": "object",
      "description": "Returns a specific value from an object key as a new object.",
      "nodeExists": true,
      "hostsEditorContent": true,
      "top": 0,
      "left": 0,
      "data": {
        
      },
      "inputs": {
        "objects": {
          "name": "objects",
          "type": "object",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      },
      "outputs": {
        "objects": {
          "name": "objects",
          "type": "object",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      }
    },
    "string": {
      "name": "string",
      "type": "object",
      "description": "A string representation.",
      "nodeExists": true,
      "hostsEditorContent": true,
      "top": 0,
      "left": 0,
      "data": {
        
      },
      "inputs": {
        "concat": {
          "name": "concat",
          "type": "string",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      },
      "outputs": {
        "result": {
          "name": "result",
          "type": "string",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      }
    },
    "string.template": {
      "name": "string.template",
      "type": "object",
      "description": "Parses a template string with input variables. Variables can be addressed by their name like so: ${variableName}",
      "nodeExists": true,
      "hostsEditorContent": true,
      "top": 0,
      "left": 0,
      "data": {
        
      },
      "inputs": {
        "variables": {
          "name": "variables",
          "type": "variable",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      },
      "outputs": {
        "result": {
          "name": "result",
          "type": "string",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      }
    },
    "string.concat": {
      "name": "string.concat",
      "type": "object",
      "description": "Concatenates strings a and b together in that order.",
      "nodeExists": true,
      "top": 0,
      "left": 0,
      "data": {
        
      },
      "inputs": {
        "a": {
          "name": "a",
          "type": "string",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        },
        "b": {
          "name": "b",
          "type": "string",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      },
      "outputs": {
        "string": {
          "name": "string",
          "type": "string",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      }
    },
    "string.trim": {
      "name": "string.trim",
      "type": "object",
      "description": "Trims whitespace from both ends of a string. Whitespace in this context is all the whitespace characters (space, tab, no-break space, etc.) and all the line terminator characters (LF, CR, etc.).",
      "nodeExists": true,
      "top": 0,
      "left": 0,
      "data": {
        
      },
      "inputs": {
        "strings": {
          "name": "strings",
          "type": "string",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": "If multiple inputs are given, they are concatenated after the trim action on each string."
        }
      },
      "outputs": {
        "result": {
          "name": "result",
          "type": "string",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      }
    },
    "variable": {
      "name": "variable",
      "type": "object",
      "description": "Represents a named variable.",
      "nodeExists": true,
      "hostsEditorContent": true,
      "top": 0,
      "left": 0,
      "data": {
        
      },
      "inputs": {
        "value": {
          "name": "value",
          "type": null,
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      },
      "outputs": {
        "variable": {
          "name": "variable",
          "type": "variable",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      }
    },
    "variable.value": {
      "name": "variable.value",
      "type": "object",
      "description": "Extracts the value from a variable.",
      "nodeExists": true,
      "top": 0,
      "left": 0,
      "data": {
        
      },
      "inputs": {
        "variable": {
          "name": "variable",
          "type": "variable",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      },
      "outputs": {
        "value": {
          "name": "value",
          "type": null,
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      }
    },
    "variable.name": {
      "name": "variable.name",
      "type": "object",
      "description": "Extracts the name from a variable.",
      "nodeExists": true,
      "top": 0,
      "left": 0,
      "data": {
        
      },
      "inputs": {
        "variable": {
          "name": "variable",
          "type": "variable",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      },
      "outputs": {
        "name": {
          "name": "name",
          "type": "string",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      }
    },
    "xible.flow": {
      "name": "xible.flow",
      "type": "object",
      "description": "Defines a flow.",
      "nodeExists": true,
      "hostsEditorContent": true,
      "top": 0,
      "left": 0,
      "data": {
        
      },
      "inputs": {
        
      },
      "outputs": {
        "flow": {
          "name": "flow",
          "type": "xible.flow",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        },
        "timing": {
          "name": "timing",
          "type": "object",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": "Returns the timing object on the flow."
        }
      }
    },
    "xible.flow.onstart": {
      "name": "xible.flow.onstart",
      "type": "event",
      "description": "Triggered whenever this flow is started.",
      "nodeExists": true,
      "top": 0,
      "left": 0,
      "data": {
        
      },
      "inputs": {
        
      },
      "outputs": {
        "trigger": {
          "name": "trigger",
          "type": "trigger",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      }
    },
    "xible.flow.stop": {
      "name": "xible.flow.stop",
      "type": "action",
      "description": "Stops this flow.",
      "nodeExists": true,
      "top": 0,
      "left": 0,
      "data": {
        
      },
      "inputs": {
        "trigger": {
          "name": "trigger",
          "type": "trigger",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      },
      "outputs": {
        
      }
    },
    "xible.flow.start": {
      "name": "xible.flow.start",
      "type": "action",
      "description": "Starts another flow.",
      "nodeExists": true,
      "hostsEditorContent": true,
      "top": 0,
      "left": 0,
      "data": {
        
      },
      "inputs": {
        "trigger": {
          "name": "trigger",
          "type": "trigger",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        },
        "flow": {
          "name": "flow",
          "type": "xible.flow",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      },
      "outputs": {
        "done": {
          "name": "done",
          "type": "trigger",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      }
    },
    "xible.node.onerror": {
      "name": "xible.node.onerror",
      "type": "event",
      "description": "Triggered whenever a node in the flow triggers an error.",
      "nodeExists": true,
      "top": 0,
      "left": 0,
      "data": {
        
      },
      "inputs": {
        
      },
      "outputs": {
        "trigger": {
          "name": "trigger",
          "type": "trigger",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        },
        "error": {
          "name": "error",
          "type": "error",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      }
    },
    "xible.versions": {
      "name": "xible.versions",
      "type": "object",
      "description": "Returns the versions associated with XIBLE.",
      "nodeExists": true,
      "top": 0,
      "left": 0,
      "data": {
        
      },
      "inputs": {
        
      },
      "outputs": {
        "versions": {
          "name": "versions",
          "type": "object",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      }
    },
    "xible.node.error": {
      "name": "xible.node.error",
      "type": "action",
      "description": "Trigger a node error event.",
      "nodeExists": true,
      "hostsEditorContent": true,
      "top": 0,
      "left": 0,
      "data": {
        
      },
      "inputs": {
        "trigger": {
          "name": "trigger",
          "type": "trigger",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      },
      "outputs": {
        "done": {
          "name": "done",
          "type": "trigger",
          "singleType": false,
          "assignsOutputType": null,
          "assignsInputType": null,
          "maxConnectors": null,
          "description": null
        }
      }
    }
  },
	flows: {
		"flowflow": {
			"_id": "flowflow",
			"name": "flowflow",
			"nodes": [{
				"name": "conditional",
				"type": "object",
				"description": "Return the selected value(s) based on the condition.",
				"nodeExists": true,
				"top": 77.5,
				"left": 376,
				"data": {
					
				},
				"_id": "c2e093f9-9708-72c1-43c9-16c00f237659",
				"inputs": {
					"condition": {
						"name": "condition",
						"type": "boolean",
						"singleType": false,
						"assignsOutputType": null,
						"assignsInputType": null,
						"maxConnectors": null,
						"description": null,
						"_id": "479efb2a-96ac-912b-70bd-12a1e2a5ab97"
					},
					"if true": {
						"name": "if true",
						"type": null,
						"singleType": false,
						"assignsOutputType": null,
						"assignsInputType": null,
						"maxConnectors": null,
						"description": null,
						"_id": "e52b4019-0219-0282-cf5f-cc05708ac88c"
					},
					"if false": {
						"name": "if false",
						"type": null,
						"singleType": false,
						"assignsOutputType": null,
						"assignsInputType": null,
						"maxConnectors": null,
						"description": null,
						"_id": "336208bc-7342-1dd5-d0b7-9e35c1215081"
					}
				},
				"outputs": {
					"value": {
						"name": "value",
						"type": null,
						"singleType": false,
						"assignsOutputType": null,
						"assignsInputType": null,
						"maxConnectors": null,
						"description": null,
						"_id": "226936b6-1d68-4b6f-1f5a-154523cb7411",
						"global": false
					}
				}
			},
			{
				"name": "boolean",
				"type": "object",
				"description": "A boolean representation.",
				"nodeExists": true,
				"hostsEditorContent": true,
				"top": 156.16666666666669,
				"left": -28.000000000000036,
				"data": {
					
				},
				"_id": "cb3ddbdc-97b3-7d39-ce88-26e9be34b70d",
				"inputs": {
					
				},
				"outputs": {
					"result": {
						"name": "result",
						"type": "boolean",
						"singleType": false,
						"assignsOutputType": null,
						"assignsInputType": null,
						"maxConnectors": null,
						"description": null,
						"_id": "ac55d8d7-e79c-01f5-c9a1-7c0b05444811",
						"global": false
					}
				}
			}],
			"connectors": [{
				"origin": "ac55d8d7-e79c-01f5-c9a1-7c0b05444811",
				"destination": "479efb2a-96ac-912b-70bd-12a1e2a5ab97",
				"type": "boolean"
			}],
			"viewState": {
				"left": 235.2,
				"top": 46.53571428571428,
				"zoom": 0.6,
				"backgroundLeft": 0,
				"backgroundTop": 0
			},
			"runnable": true,
			"directed": false,
			"state": 0
		}
	}
};

editorView(element, options);
