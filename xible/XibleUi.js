const XibleEditor = require('./xibleEditor.js');
const XibleEditorConnector = require('./xibleEditorConnector.js');
const XibleEditorFlow = require('./xibleEditorFlow.js');
const XibleEditorNode = require('./xibleEditorNode.js');
const XibleEditorNodeSelector = require('./xibleEditorNodeSelector.js');
const TypeDef = require('./TypeDef');
const Node = require('./Node');

class Xible {
    constructor(elementSelector, options, model) {
        this.editor = new XibleEditor(model);
        this.model = model;
        this.initViewAndMore(elementSelector, options);
    }

    initViewAndMore(element, options){
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
                <ul class="flowList"></ul>
            </div>
            `;

        const toolbar = EL.querySelector('.toolbar');
        const flowButtons = EL.querySelector('.flowList');
        const zoomButtons = EL.querySelector('.zoomButtons');
        const flowListUl = EL.querySelector('.flowList');
        const flowEditorHolder = EL.querySelector('.flowEditorHolder');

        if(!options.modules.toolbar){
            toolbar.classList.add("hidden");
        }
        
        if(!options.modules.flows){
            flowButtons.classList.add('hidden');
        }
        
        if(options.modules.navigation) {
            this.editor.enableZoom();
            this.editor.enablePan();
        } else {
            zoomButtons.classList.add('hidden');
        }

        if(options.modules.logo) {
            const logo = document.createElement('div');
            logo.className = 'logo';
            logo.innerHTML = 'XIBLE';
        
            this.editor.element.appendChild(logo);
        }

        // this shouldnt be here
        let typeDefStyleEl = null;
        
          /**
          * Loads the style information (color) associated with typeDefs
          */
          function loadTypeDefStyles() {
            TypeDef.getAll().then((typeDefs) => {
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
        
          function setFlowTabState(flow, li) {
            li.classList.add('initialized');
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
        
              if (!this.editor.viewFlow(flow)) {
                return;
              }
            };
        
            // if in path, load it immediately
            const pathSplit = window.location.pathname.split('/');
            if (pathSplit.length > 1 && pathSplit[2] === encodeURIComponent(flow._id)) {
              a.click();
            }
        
            setFlowTabState.call(this, flow, li);

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

            const flowModel = this.model.createFlow();
            flowModel._id = flowName;

            this.model.addFlow(flowModel);
          };
        
          // get all flows and add them
          function loadFlows(flows) {
            // ensure all flows tabs are gone
            Array.from(flowListUl.querySelectorAll('li:not(.add)'))
            .forEach((li) => {
              flowListUl.removeChild(li);
            });

        
            for (var key in flows) {
              if (!flows.hasOwnProperty(key)) {
                continue;
              }

              var flow = flows[key];

              const flowModel = this.model.createFlow();
              flowModel._id = flowName;
              this.model.addFlow(flowModel);
            }
          }
        
          /* end: this shouldnt be here */

          this.model.on('flow-new', (flowModel) => {
            const flowTab = createFlowTab.call(this, flowModel);
            flowTab.firstChild.click();
          });

        // buttons
        EL.querySelector('.saveButton').onclick = () => { this.saveFlow() };
        EL.querySelector('.deleteButton').onclick = () => { this.deleteFlow(); };
        EL.querySelector('.zoomInButton').onclick = () => { this.zoomIn(); };
        EL.querySelector('.zoomOutButton').onclick = () => { this.zoomOut(); };
        EL.querySelector('.zoomResetButton').onclick = () => { this.zoomReset() };
        EL.querySelector('.zoomFitButton').onclick = () => { this.editor.zoomFit(); };

        // add the xibleEditor to the view
        flowEditorHolder.appendChild(this.editor.element);

        loadFlows.call(this, options.flows);
        loadTypeDefStyles.call(this);

        // reload the nodes
        this.editor.nodeSelector.fill();
    }

    saveFlow() {
        this.editor.loadedFlow.save();
    }

    deleteFlow() {
        if (!this.editor.loadedFlow) {
            return;
        }
    
        if (window.confirm(`Are you sure you wan't to permanently delete flow "${this.editor.loadedFlow.flow._id}"?`)) {
            this.editor.loadedFlow.delete();
    
            const flowTab = document.querySelector(`.flowList>li[data-flowid="${this.editor.loadedFlow.flow._id}"]`);

            if (flowTab) {
                flowTab.parentNode.removeChild(flowTab);
            }
        }
    }

    zoomIn() {
        if (this.editor.zoom >= 5) {
          return;
        }
    
        this.editor.zoom = (Math.round(this.editor.zoom * 10) + 1) / 10;
        this.editor.transform();
    }

    zoomOut() {
        if (this.editor.zoom < 0.2) {
            return;
        }

        this.editor.zoom = (Math.round(this.editor.zoom * 10) - 1) / 10;
        this.editor.transform();
    }

    zoomReset() {
        this.editor.zoom = 1;
        this.editor.transform();
    }
}

module.exports = Xible;
