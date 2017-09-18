'use strict';

const XibleEditorNode = require('./XibleEditorNode.js');

class XibleEditorNodeSelector {
  /**
  * Create a new nodeSelector.
  * @param {XibleEditor} XIBLE_EDITOR
  */
  constructor(XIBLE_EDITOR) {
    this.xibleEditor = XIBLE_EDITOR;

    // indicates if the selector was opened above or below the mouse position
    // and left or right
    this.openTop = false;
    this.openLeft = false;

    // x & y position the selector was opened
    this.openYPosition = 0;
    this.openXPosition = 0;

    // the div containing the node list
    let div = this.div = document.body.appendChild(document.createElement('div'));
    div.setAttribute('id', 'nodeSelector');
    div.classList.add('hidden');

    // this list will be populated with the local installed nodes
    const nodesUl = this.nodesUl = document.createElement('ul');

    const filterInput = this.filterInput = div.appendChild(document.createElement('input'));
    filterInput.setAttribute('type', 'text');
    filterInput.setAttribute('placeholder', 'filter nodes');
    filterInput.addEventListener('input', (event) => {
      const filterInputValue = filterInput.value.toLowerCase();
      const searchWords = this.getSearchWords();

      let noResults = true;
      nodesUl.querySelectorAll('li').forEach((li) => {
        if (this.setListVisibility(li, filterInputValue, searchWords)) {
          noResults = false;
        }
      });

      if (noResults) {
        div.classList.add('noresults');
      } else {
        div.classList.remove('noresults');
      }

      this.position();
    });

    div.appendChild(nodesUl);

    // open the node menu on double click
    const openOnMouseEvent = (event) => {
      if (
        !event.ctrlKey && XIBLE_EDITOR.loadedFlow && XIBLE_EDITOR.browserSupport &&
        (event.target === XIBLE_EDITOR.element || event.target === XIBLE_EDITOR.element.firstChild)
      ) {
        this.open(event);
        event.preventDefault();
      }
    };
    this.xibleEditor.element.addEventListener('contextmenu', openOnMouseEvent);
    this.xibleEditor.element.addEventListener('dblclick', openOnMouseEvent);

    // hide the nodeSelector element if selection moves elsewhere
    let mouseDownEventHandler;
    document.body.addEventListener('mousedown', mouseDownEventHandler = (event) => {
      if (!div.classList.contains('hidden') && !div.contains(event.target)) {
        this.close();
      }
    });
	
	// clean out elements/handlers hooked to document.body
    // when this view gets removed
	function cleanUp(){
      if (div && div.parentNode) {
        document.body.removeChild(div);
        div = null;
      }

      document.body.removeEventListener('mousedown', mouseDownEventHandler);
	}

    this.fill();
  }

  getSearchWords() {
    return this.filterInput.value.toLowerCase().replace(/[\W_]+/g, ' ').split(' ');
  }

  /**
  * Changes the visibility on a node in the list, based on the search conditions.
  * @param {HTMLElement} li
  * @param {String} filterInputValue The search value.
  * @param {String[]} searchWords Search keywords.
  * @returns {Boolean} Visible or not.
  */
  setListVisibility(li, filterInputValue, searchWords) {
    const textContent = li.textContent.toLowerCase();

    li.classList.remove('headerMatchExact', 'headerMatchPartial');
    if (!filterInputValue || searchWords.every(searchWord => textContent.indexOf(searchWord) > -1)) {
      // specify more relevant search results
      const headerTextContent = li.firstChild.textContent.toLowerCase();
      if (headerTextContent === filterInputValue) {
        li.classList.add('headerMatchExact');
      } else if (searchWords.every(searchWord => headerTextContent.indexOf(searchWord) > -1)) {
        li.classList.add('headerMatchPartial');
      }

      li.classList.remove('hidden');
      return true;
    }

    li.classList.add('hidden');
    return false;
  }

  /**
  * Builds a node for the nodeSelector.
  * @param {String} nodeName
  * @param {xibleWrapper.Node} node
  * @returns {HTMLLIElement} The created HTML element, an LI.
  */
  buildNode(nodeName, node) {
    // list element containing the node heading and description
    const li = document.createElement('li');

    // the heading element containing the node name
    const h1 = li.appendChild(document.createElement('h1'));
    h1.appendChild(document.createTextNode(nodeName));
    h1.setAttribute('title', nodeName);

    // scroll text if it overflows
    li.addEventListener('mouseenter', (event) => {
      if (h1.scrollWidth > h1.offsetWidth) {
        h1.classList.add('overflow');
      }
    });

    li.addEventListener('mouseleave', (event) => {
      h1.classList.remove('overflow');
    });

    // description
    const description = node.description;
    if (description) {
      li.appendChild(document.createElement('p')).appendChild(document.createTextNode(description));
    }

    return li;
  }

  /**
  * Hooks relevant listeners to a node in the selector.
  */
  hookNode(li, node) {
    // onmousedown so the user can drag the newly inserted node immediately
    li.addEventListener('mousedown', (event) => {
      const actionsOffset = this.xibleEditor.getOffsetPosition();
      const editorNode = this.xibleEditor.addNode(new XibleEditorNode(node));
      this.xibleEditor.loadedFlow.addNode(editorNode);
      editorNode.setPosition(((event.pageX - actionsOffset.left - this.xibleEditor.left) / this.xibleEditor.zoom) - (editorNode.element.firstChild.offsetWidth / 2), ((event.pageY - actionsOffset.top - this.xibleEditor.top) / this.xibleEditor.zoom) - (editorNode.element.firstChild.offsetHeight / 2));
      this.xibleEditor.deselect();
      this.xibleEditor.select(editorNode);
      this.xibleEditor.initDrag(event);

      this.close();
    });
  }

  /**
  * Fetches the nodes from xible and places them in the nodeSelector ul.
  * Keeps visible state correct if this functions is called multiple times.
  * @returns {Promise.<undefined>} Resolves when complete.
  */
  fill() {
    // track all nodeNames currently visible
    let visibleNodeNames;
    if (Array.from(this.nodesUl.querySelectorAll('li.hidden')).length) {
      visibleNodeNames = Array.from(this.nodesUl
      .querySelectorAll('li:not(.hidden) h1'))
      .map(header => header.getAttribute('title'));
    }

    this.nodesUl.innerHTML = '';

    // get the installed nodes
    return this.xibleEditor.xibleWrapper.Node.getAll().then((nodes) => {
      Object.keys(nodes).forEach((nodeName) => {
        const li = this.buildNode(nodeName, nodes[nodeName]);
        this.hookNode(li, nodes[nodeName]);

        if (visibleNodeNames) {
          li.classList.add('hidden');
        }

        this.nodesUl.appendChild(li);
      });

      // make items visible that were so before
      if (visibleNodeNames) {
        for (let i = 0; i < visibleNodeNames.length; i += 1) {
          const h1 = this.nodesUl.querySelector(`li h1[title="${visibleNodeNames[i]}"]`);
          if (h1) {
            h1.parentNode.classList.remove('hidden');
          }
        }
      }
    });
  }

  /**
  * Positions the nodeSelector according to some vars indicating where to open.
  */
  position() {
    const clientRect = this.div.getBoundingClientRect();
    if (this.openTop) {
      this.div.style.top = `${this.openYPosition - clientRect.height}px`;
    } else {
      this.div.style.top = `${this.openYPosition}px`;
    }

    if (this.openLeft) {
      this.div.style.left = `${this.openXPosition - clientRect.width}px`;
    } else {
      this.div.style.left = `${this.openXPosition}px`;
    }
  }

  /**
  * Opens the main node selector (not the detail one).
  * @param {MouseEvent} event Event which triggered the open. Used to set the correct position.
  */
  open(event) {
    // unhide all nodes,
    // so the correct height is checked against the window height and mouse pos
    // they will be hidden again later on
    Array.from(this.nodesUl.querySelectorAll('li.hidden')).forEach((li) => {
      li.classList.remove('hidden');
    });

    // track the positions where the selector was originally opened
    this.openXPosition = event.pageX;
    this.openYPosition = event.pageY;

    // unhide and position the nodeselector for the first overflow check
    this.div.classList.remove('hidden');
    this.div.style.left = `${this.openXPosition}px`;
    this.div.style.top = `${this.openYPosition}px`;

    // ensure we are not overflowing the chrome
    // this needs to be checked with a non-filtered list
    // otherwise changing the filter might still overflow y
    const clientRect = this.div.getBoundingClientRect();
    this.openTop = this.openLeft = false;
    if (clientRect.top + clientRect.height > window.innerHeight) {
      this.openTop = true;
    }
    if (clientRect.left + clientRect.width > window.innerWidth) {
      this.openLeft = true;
    }

    // focus!
    if (this.filterInput.value) {
      this.filterInput.select();
    }
    this.filterInput.focus();

    // filter the results
    if (this.filterInput.value) {
      Array.from(this.nodesUl.querySelectorAll('li')).forEach((li) => {
        if (this.filterInput.value && li.textContent.indexOf(this.filterInput.value) === -1) {
          li.classList.add('hidden');
        }
      });
    }

    // reposition
    if (this.openTop || this.openLeft) {
      this.position();
    }
  }

  /**
  * Closes all the node selectors,
  * both the main node list and the detail/download view.
  */
  close() {
    this.div.classList.add('hidden');
  }
}

module.exports = XibleEditorNodeSelector;
