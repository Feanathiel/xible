'use strict';

const Node = require('./Node');
const Utils = require('./utils');
const XibleEditorNodeIo = require('./XibleEditorNodeIo');

class XibleEditorNode extends Node {
  constructor(obj, ignoreData) {
    const el = document.createElement('div');
    el.classList.add('node');

    const headerEl = el.appendChild(document.createElement('h1'));

    // add ios
    const ios = el.appendChild(document.createElement('div'));
    ios.classList.add('io');

    // add input list
    const inputList = ios.appendChild(document.createElement('ul'));
    inputList.classList.add('input');

    // add output list
    const outputList = ios.appendChild(document.createElement('ul'));
    outputList.classList.add('output');

    super(Object.assign({}, obj), ignoreData);

    headerEl.appendChild(document.createTextNode(this.name));

    this.element = el;
    this.inputList = inputList;
    this.outputList = outputList;

    this.obj = obj;
  }

  init() {
    super.init();

        // add additional content
        if(this.obj.editorContent) {
          this.processEditorContent(this.obj.editorContent);
        }
    
        this.statusTimeouts = {};
        this.statusEl = null;
    
        // selection handlers
        this.element.addEventListener('mousedown', (event) => {
          if (this.editor) {
            this.editor.toggleSelectionOnMouseEvent(event, this);
          }
        });
        this.element.addEventListener('mouseup', (event) => {
          if (this.editor) {
            this.editor.toggleSelectionOnMouseEvent(event, this);
          }
        });
  }

  initInputs(inputs) {
    this.inputs = {};
    if (inputs) {
      for (const name in inputs) {
        this.addInput(new XibleEditorNodeIo(name, inputs[name], false));
      }
    }
  }

  initOutputs(outputs) {
    this.outputs = {};
    if (outputs) {
      for (const name in outputs) {
        this.addOutput(new XibleEditorNodeIo(name, outputs[name], true));
      }
    }
  }

  processEditorContent(content) {
    this.editorContent = content;

    const proc = () => {
      const div = document.createElement('div');
      div.classList.add('content');

      // if attachShadow shadow DOM v1) is not supported, simply don't show contents
      if (typeof div.attachShadow !== 'function') {
        return;
      }

      // create the shadow and set the contents including the nodeContent.css
      const shadow = div.attachShadow({
        mode: 'open'
      });
      shadow.innerHTML = `<style>@import url("css/nodeContent.css");</style>${this.editorContent}`;

      // check if style element has loaded
      let stylesLoaded = false;
      let scriptsLoaded = false;
      let emittedLoad = false;

      // emit a load event
      const checkForEmitLoad = () => {
        if (!emittedLoad && stylesLoaded && scriptsLoaded) {
          this.emit('editorContentLoad');
          emittedLoad = true;
        }
      };

      // hook an eventlistener to check if the style element has loaded
      const styleEl = shadow.querySelector('style');
      styleEl.onload = () => {
        stylesLoaded = true;
        checkForEmitLoad();
      };

      // append the div & shadowroot to the node
      this.element.appendChild(div);
      this.editorContentEl = shadow;

      // trigger some convenience stuff
      this.convenienceLabel();
      this.convenienceHideIfAttached();
      this.convenienceOutputValue();

      // run script elements
      Array.from(shadow.querySelectorAll('script'))
      .forEach((scriptEl) => {
        new Function('window', 'document', scriptEl.textContent).call(this, null, shadow); // eslint-disable-line no-new-func
      });

      scriptsLoaded = true;
      checkForEmitLoad();
    };

    if (this.editor) {
      proc();
    } else {
      this.once('beforeAppend', proc);
    }
  }

  setPosition(left = 0, top = 0) {
    super.setPosition(left, top);
    this.element.style.transform = `translate(${this.left}px, ${this.top}px)`;
  }

  duplicate(ignoreData) {
    const duplicateXibleNode = new XibleEditorNode(this, ignoreData);
    duplicateXibleNode.init();
    duplicateXibleNode.flow = null;
    duplicateXibleNode.editor = null;

    // create a unique id for the node
    duplicateXibleNode._id = Utils.generateObjectId();

    // create a unique id for the inputs
    for (const name in duplicateXibleNode.inputs) {
      duplicateXibleNode.inputs[name]._id = Utils.generateObjectId();
    }

    // create a unique id for the outputs
    for (const name in duplicateXibleNode.outputs) {
      duplicateXibleNode.outputs[name]._id = Utils.generateObjectId();
    }

    return duplicateXibleNode;
  }

  addInput(input) {
    super.addInput(input);
    this.inputList.appendChild(input.element);

    return input;
  }

  addOutput(output) {
    super.addOutput(output);
    this.outputList.appendChild(output.element);

    return output;
  }

  deleteInput(input) {
    super.deleteInput(input);
    this.inputList.removeChild(input.element);
    return input;
  }

  deleteOuput(output) {
    super.deleteOuput(output);
    this.outputList.removeChild(output.element);
    return output;
  }

  delete() {
    if (this.editor) {
      this.editor.deleteNode(this);
    }

    super.delete();
  }

  addProgressBar(status) {
    if (!status || !status._id) {
      return;
    }

    let ul = this.statusEl;
    if (!ul) {
      ul = this.statusEl = this.element.appendChild(document.createElement('ul'));
      ul.classList.add('statuses');
    }

    const li = ul.appendChild(document.createElement('li'));
    li.setAttribute('data-statusid', status._id);
    li.classList.add('bar');

    if (status.message) {
      li.appendChild(document.createTextNode(status.message));
    }

    const statusBarHolder = li.appendChild(document.createElement('div'));
    statusBarHolder.classList.add('holder');
    statusBarHolder.appendChild(document.createElement('div'));

    if (status.timeout) {
      // check when this progressbar should start (future)
      // or when it started (past)
      const startDiff = Date.now() - status.startDate + this.editor.serverClientDateDifference;

      this.statusTimeouts[status._id] = window.setTimeout(() => {
        this.removeStatusById(status._id);
      }, status.timeout - startDiff);
    }

    this.updateProgressBarById(status._id, status);
  }

  updateProgressBarById(statusId, status) {
    if (!this.statusEl || !statusId || !status || typeof status.percentage !== 'number') {
      return;
    }

    const li = this.statusEl.querySelector(`li.bar[data-statusid="${statusId}"]`);
    if (li) {
      const bar = li.querySelector('.holder>div');
      bar.style.transition = 'none';
      bar.style.width = `${status.percentage}%`;

      if (status.updateOverTime) {
        // check when this progressbar should start (future)
        // or when it started (past)
        let startDiff = Date.now() - status.startDate + this.editor.serverClientDateDifference;

        // max it out
        if (startDiff > status.updateOverTime) {
          startDiff = status.updateOverTime;
        }

        // if this progressbar should have started in the past
        // calculate where the width should be right now
        if (startDiff > 0) {
          bar.style.width = `${startDiff / status.updateOverTime * 100}%`;
        }

        bar.offsetWidth; // eslint-disable-line
        bar.style.transition = `width ${status.updateOverTime - (startDiff > 0 ? startDiff : 0)}ms ${startDiff < 0 ? Math.abs(startDiff) : 0}ms linear`;
        bar.style.width = '100%';
      }
    }
  }

  addStatus(status) {
    if (!status || !status._id) {
      return;
    }

    Promise.resolve(0).then((configMaxStatuses) => {
      let statusCount = 0;
      let ul = this.statusEl;
      if (!ul) {
        ul = this.statusEl = this.element.appendChild(document.createElement('ul'));
        ul.classList.add('statuses');
      } else {
        statusCount = ul.querySelectorAll('li:not(.bar)').length;
      }

      // remove all statuses above the max config setting
      if (typeof configMaxStatuses === 'number' && statusCount >= configMaxStatuses && ul.firstChild) {
        while (statusCount >= configMaxStatuses && ul.firstChild) {
          const removeChild = ul.firstChild;
          this.removeStatusById(removeChild.getAttribute('data-statusid'));
          statusCount -= 1;
        }
      }

      if (configMaxStatuses === 0) {
        return;
      }

      const li = ul.appendChild(document.createElement('li'));
      li.setAttribute('data-statusid', status._id);

      if (status.color) {
        li.classList.add(status.color);
      }

      if (typeof status.message === 'string') {
        let messageLineSplit = status.message.split('\n');
        for (let i = 0; i < messageLineSplit.length; i += 1) {
          if (i) {
            li.appendChild(document.createElement('br'));
          }
          li.appendChild(document.createTextNode(messageLineSplit[i]));
        }
        messageLineSplit = null;
      }

      if (status.timeout) {
        this.statusTimeouts[status._id] = window.setTimeout(() => {
          this.removeStatusById(status._id);
        }, status.timeout);
      }
    });
  }

  updateStatusById(statusId, status) {
    if (!this.statusEl) {
      return;
    }

    const li = this.statusEl.querySelector(`li[data-statusid="${statusId}"]`);
    if (li) {
      if (status.message) {
        if (li.lastChild) {
          li.removeChild(li.lastChild);
        }

        li.appendChild(document.createTextNode(status.message));
      }
    }
  }

  removeStatusById(statusId, timeout) {
    // clear timeout
    if (this.statusTimeouts[statusId]) {
      window.clearTimeout(this.statusTimeouts[statusId]);
      this.statusTimeouts[statusId] = null;
      delete this.statusTimeouts[statusId];
    }

    // get and delete li
    if (this.statusEl) {
      const li = this.statusEl.querySelector(`li[data-statusid="${statusId}"]`);
      if (li) {
        const fn = () => {
          if (this.statusEl) {
            this.statusEl.removeChild(li);
          }
        };

        if (timeout) {
          window.setTimeout(fn, timeout);
        } else {
          fn();
        }
      }
    }
  }

  removeAllStatuses() {
    // clear all timeouts
    let statusId;
    for (statusId in this.statusTimeouts) {
      window.clearTimeout(this.statusTimeouts[statusId]);
      this.statusTimeouts[statusId] = null;
      delete this.statusTimeouts[statusId];
    }

    // destroy the el
    if (this.statusEl) {
      if (this.statusEl.parentNode) {
        this.statusEl.parentNode.removeChild(this.statusEl);
      }
      this.statusEl = null;
    }
  }

  setTracker(status) {
    if (this.removeTrackerTimeout) {
      window.clearTimeout(this.removeTrackerTimeout);
      this.removeTrackerTimeout = null;
    }

    if (this.trackerEl) {
      if (this.trackerEl.parentNode) {
        this.trackerEl.parentNode.removeChild(this.trackerEl);
      }
      this.trackerEl = null;
    }

    if (status) {
      const div = this.trackerEl = document.createElement('div');
      div.classList.add('tracker');

      if (status.color) {
        div.classList.add(status.color);
      }

      if (status.message) {
        this.element.appendChild(div).appendChild(document.createTextNode(status.message));
      }

      if (status.timeout) {
        this.removeTrackerTimeout = window.setTimeout(() => {
          this.setTracker();
        }, status.timeout);
      }
    }
  }

  getRootLabelElements() {
    return Array.from(this.editorContentEl.querySelectorAll(':host>label'));
  }

  getRootInputElements() {
    return Array.from(this.editorContentEl.querySelectorAll(':host>input, :host>selectcontainer'));
  }

  /**
  * Creates a label for every input/selectcontainer element that doesn't have one.
  */
  convenienceLabel() {
    this.getRootInputElements().forEach((el) => {
      const label = document.createElement('label');
      this.editorContentEl.replaceChild(label, el);
      label.appendChild(el);

      // copy the description to the label
      const description = el.getAttribute('data-description');
      if (description) {
        label.setAttribute('data-description', description);
      }

      // add the label
      let placeholder = el.getAttribute('placeholder') || el.getAttribute('data-outputvalue');
      const span = document.createElement('span');

      // try to fetch a placeholder for a select input
      if (!placeholder && el.nodeName === 'SELECTCONTAINER') {
        const selectEl = el.querySelector('select');
        if (selectEl) {
          placeholder = selectEl.getAttribute('placeholder') || selectEl.getAttribute('data-outputvalue');
        }
      }

      if (!placeholder) {
        span.classList.add('unknown');
      }

      span.appendChild(document.createTextNode(placeholder || 'unknown'));
      label.appendChild(span);

      // ensure hideif attached is hooked properly
      const hideIfAttached = el.getAttribute('data-hideifattached');
      if (hideIfAttached) {
        label.setAttribute('data-hideifattached', hideIfAttached);
      }
    });
  }

  convenienceOutputValue() {
    const els = Array.from(this.editorContentEl.querySelectorAll('[data-outputvalue]'));
    els.forEach((el) => {
      const attr = el.getAttribute('data-outputvalue');
      const type = el.getAttribute('type');

      // set the default value
      if (this.data[attr]) {
        if (type === 'checkbox' && el.getAttribute('value') === this.data[attr]) {
          el.checked = true;
        } else if (el.nodeName === 'SELECT') {
          Array.from(el.querySelectorAll('option')).forEach((option) => {
            if ((option.getAttribute('value') || option.textContent) === this.data[attr]) {
              option.selected = true;
            } else {
              option.selected = false;
            }
          });
        } else {
          el.setAttribute('value', this.data[attr]);
        }
      } else if (typeof this.data[attr] === 'undefined') {
        if (type === 'checkbox') {
          el.checked = false;
        } else {
          this.data[attr] = el.value;
        }
      }

      switch (type) {
        // hidden inputs don't trigger 'onchange' or 'oninput'
        case 'hidden': {
          const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              if (mutation.attributeName === 'value') {
                this.setData(attr, el.value);
              }
            });
          });

          observer.observe(el, {
            attributes: true,
            childList: false,
            characterData: false
          });
          break;
        }

        // checkbox and radio both don't trigger input event
        case 'checkbox':
        case 'radio':
          el.addEventListener('change', () => {
            if (el.checked) {
              this.setData(attr, el.value);
            } else {
              this.setData(attr, null);
            }
          });
          break;

        default:
          el.addEventListener('input', () => {
            this.setData(attr, el.value);
          });
          break;
      }
    });
  }

  convenienceHideIfAttached() {
    const els = Array.from(this.editorContentEl.querySelectorAll('[data-hideifattached]'));
    els.forEach((el) => {
      const attr = el.getAttribute('data-hideifattached');
      let matchArray;
      const ioArray = [];

      const re = /(input|output)\s*\[\s*name\s*=\s*"?(\w*)"?\s*\]/g;
      while ((matchArray = re.exec(attr))) { // eslint-disable-line no-cond-assign
        const io = this[`${matchArray[1]}s`][matchArray[2]];
        if (io) {
          ioArray.push(io);

          if (io.connectors.length) {
            el.style.display = 'none';
          }

          io.on('attach', () => {
            el.style.display = 'none';
          });

          io.on('detach', () => {
            if (ioArray.every(io => !io.connectors.length)) {
              el.style.display = '';
            }
          });
        }
      }
    });
  }
}

module.exports = XibleEditorNode;
