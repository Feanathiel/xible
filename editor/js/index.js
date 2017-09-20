'use strict';

const editorView = (element, options) => {

  const EL = document.querySelector(element);

  EL.innerHTML = `
  <div class="xibleView">
    <div class="toolbar">
      <section class="buttons editor">
        <button type="button" class="saveButton">Save</button>
        <button type="button" class="deleteButton">Delete</button>
      </section>
    </div>
    <div class="flowEditorHolder">
      <div class="zoomButtons">
        <button class="zoomOutButton" type="button" title="Zoom out">&#xe024;</button>
        <button class="zoomFitButton" type="button" title="Zoom to fit">&gt;</button>
        <button class="zoomResetButton" type="button" title="Reset zoom">&#xe01c;</button>
        <button class="zoomInButton" type="button" title="Zoom in">&#xe035;</button>
      </div>
      <ul class="flowList loading"></ul>
    </div>
  `;


  const toolbar = EL.querySelector('.toolbar');
  const flowButtons = EL.querySelector('.flowList');
  const zoomButtons = EL.querySelector('.zoomButtons');

  if(!options.modules.toolbar){
    toolbar.classList.add("hidden");
  }

  if(!options.modules.flows){
    flowButtons.classList.add('hidden');
  }

  const xibleEditor = new Xible.XibleEditor(Xible.xibleWrapper);
  
  if(options.modules.navigation) {
    xibleEditor.enableZoom();
    xibleEditor.enablePan();
  } else {
    zoomButtons.classList.add('hidden');
  }
 
  // hook buttons

  // save
  EL.querySelector('.saveButton').onclick = () => {
    xibleEditor.loadedFlow.save();
  };

  // delete
  EL.querySelector('.deleteButton').onclick = () => {
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
  const flowEditorHolder = EL.querySelector('.flowEditorHolder');

  // zoom and reset
  function zoomOut() {
    if (xibleEditor.zoom < 0.2) {
      return;
    }

    xibleEditor.zoom = (Math.round(xibleEditor.zoom * 10) - 1) / 10;
    xibleEditor.transform();
  }
  EL.querySelector('.zoomOutButton').onclick = zoomOut;
  function zoomReset() {
    xibleEditor.zoom = 1;
    xibleEditor.transform();
  }
  EL.querySelector('.zoomResetButton').onclick = zoomReset;
  function zoomIn() {
    if (xibleEditor.zoom >= 5) {
      return;
    }

    xibleEditor.zoom = (Math.round(xibleEditor.zoom * 10) + 1) / 10;
    xibleEditor.transform();
  }
  EL.querySelector('.zoomInButton').onclick = zoomIn;
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
  EL.querySelector('.zoomFitButton').onclick = zoomFit;

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
  const flowListUl = EL.querySelector('.flowList');

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

  if(options.modules.logo){
    const logo = document.createElement('div');
    logo.className = 'logo';
    logo.innerHTML = 'XIBLE';

    xibleEditor.element.appendChild(logo);
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

