Xible.nodeDef({
    "id": "boolean",
    "name": "boolean",
    "type": "object",
    "description": "A boolean representation.",
    "outputs": {
      "result": {
        "type": "boolean"
      }
    },
    "editorContent": `
        <label data-description="The boolean value, true or false.">
            <input type="checkbox" value="true" data-outputvalue="value" />value<span></span>
        </label>
    `
});

Xible.nodeDef({
    "id": "cast",
    "name": "cast",
    "type": "object",
    "description": "Change data type into another.",
    "inputs": {
      "values": {
        "type": null
      }
    },
    "outputs": {
      "result": {
        "type": "string"
      }
    },
    "editorContent": `
    <selectcontainer>
    <select data-outputvalue="castType">
      <option selected>string</option>
      <option>boolean</option>
      <option>number</option>
    </select>
  </selectcontainer>
  <script>
    let castTypeSelect = document.querySelector('select');
    castTypeSelect.onchange = () => {
      this.getOutputByName('result').setType(castTypeSelect.value);
    };
  </script>
    `
});

Xible.nodeDef({
    "id": "compare.differ",
    "name": "compare.differ",
    "type": "object",
    "description": "Compares all inputs and checks if they differ from eachother.",
    "inputs": {
      "values": {
        "type": null
      }
    },
    "outputs": {
      "result": {
            "type": "boolean"
        }
    }
});

Xible.nodeDef({
    "id": "compare.equal",
	"name": "compare.equal",
	"type": "object",
	"description": "Compares all inputs and verifies that they equal.",
	"inputs": {
		"values": {
			"type": null
		}
	},
	"outputs": {
		"result": {
			"type": "boolean"
		}
	}
});

Xible.nodeDef({
    "id": "compare.greater",
    "name": "compare.greater",
    "type": "object",
    "description": "Checks if all the inputs of 'a' or greater than any of the inputs of 'b'.",
    "inputs": {
      "a": {
        "type": "math.number"
      },
      "b": {
        "type": "math.number"
      }
    },
    "outputs": {
      "result": {
        "type": "boolean"
      }
    }
});

Xible.nodeDef({
    "id": "compare.smaller",
    "name": "compare.smaller",
    "type": "object",
    "description": "Checks if all the inputs of 'a' or smaller than any of the inputs of 'b'.",
    "inputs": {
      "a": {
            "type": "math.number"
        },
      "b": {
        "type": "math.number"
      }
    },
    "outputs": {
      "result": {
            "type": "boolean"
        }
    }
});

Xible.nodeDef({
    "id": "conditional",
    "name": "conditional",
    "type": "object",
    "description": "Return the selected value(s) based on the condition.",
    "inputs": {
      "condition": {
        "type": "boolean"
      },
      "if true": {
        "type": null,
        "desciption": "If the condition is truthy, this input is passed to the 'value' output."
      },
      "if false": {
        "type": null,
        "desciption": "If the condition is falsy, this input is passed to the 'value' output."
      }
    },
    "outputs": {
      "value": {
        "type": null
      }
    }
});

Xible.nodeDef({
    "id": "filter",
    "name": "filter",
    "type": "object",
    "description": "Filters data based on an input condition.",
    "inputs": {
      "any": {
        "type": null,
        "description": "The values to filter based on the condition result."
      },
      "condition": {
        "type": "boolean"
      }
    },
    "outputs": {
      "filtered": {
        "type": null,
        "description": "Values from the 'any' input with a corresponding truthy condition."
      },
      "dropped": {
        "type": null,
        "description": "Values from the 'any' input with a corresponding falsy condition."
      }
    }
});

Xible.nodeDef({
    "id": "group",
    "name": "group",
    "type": "object",
    "description": "Groups multiple input values together.",
    "inputs": {
      "any": {
        "type": null,
            "singleType": true,
        "assignsOutputType": "grouped",
        "description": "The values to be grouped."
        }
    },
    "outputs": {
      "grouped": {
        "type": null,
        "singleType": true,
        "assignsInputType": "any",
        "description": "List of all values connected to the 'any' input."
      },
      "count": {
        "type": "math.number",
        "description": "The amount of connectors to the 'any' input."
      }
    }
});

Xible.nodeDef({
    "id": "if",
    "name": "if",
    "type": "action",
    "description": "Triggers an output based on a condition.",
    "inputs": {
      "trigger": {
        "type": "trigger"
      },
      "condition": {
        "type": "boolean"
      }
    },
    "outputs": {
      "then": {
        "type": "trigger"
      },
      "else": {
        "type": "trigger"
      }
    }
});

Xible.nodeDef({
    "id": "object",
    "name": "object",
    "type": "object",
    "description": "An object containing (nested) key-value pairs.",
    "inputs": {
      "variables": {
        "type": "variable"
      }
    },
    "outputs": {
      "object": {
        "type": "object"
      }
    }
});

Xible.nodeDef({
    "id": "object.assign",
    "name": "object.assign",
    "type": "object",
    "description": "Assigns the values of the source objects to the target object. Returns a new object, does not update the target object.",
    "inputs": {
      "target": {
        "type": "object",
        "maxConnectors": 1
      },
      "sources": {
        "type": "object"
      }
    },
    "outputs": {
      "object": {
        "type": "object"
      }
    }
});

Xible.nodeDef({
    "id": "object.keys",
    "name": "object.keys",
    "type": "object",
    "description": "Returns a list of all keys in the given object(s).",
    "inputs": {
      "objects": {
        "type": "object"
      }
    },
    "outputs": {
      "keys": {
        "type": "string"
      }
    }
});

Xible.nodeDef({
    "id": "object.value",
    "name": "object.value",
    "type": "object",
    "description": "Returns a specific value from an object key as a new object.",
    "inputs": {
      "objects": {
        "type": "object"
      }
    },
    "outputs": {
      "objects": {
        "type": "object"
      }
    },
    "editorContent": `
        <input type="text" data-outputvalue="key" data-description="The key to fetch the value for." placeholder="key" />
    `
})

Xible.nodeDef({
    "id": "string",
    "name": "string",
    "type": "object",
    "description": "A string representation.",
    "inputs": {
      "concat": {
        "type": "string"
      }
    },
    "outputs": {
      "result": {
        "type": "string"
      }
    },
    "editorContent": `
        <input type="text" data-outputvalue="value" />
    `
});

Xible.nodeDef({
    "id": "string.concat",
    "name": "string.concat",
    "type": "object",
    "description": "Concatenates strings a and b together in that order.",
    "inputs": {
      "a": {
        "type": "string"
      },
      "b": {
        "type": "string"
      }
    },
    "outputs": {
      "string": {
        "type": "string"
      }
    }
});

Xible.nodeDef({
    "id": "variable",
    "name": "variable",
    "type": "object",
    "description": "Represents a named variable.",
    "inputs": {
      "value": {
        "type": null
      }
    },
    "outputs": {
      "variable": {
        "type": "variable"
      }
    },
    "editorContent": `
        <input type="text" placeholder="name" data-outputvalue="name" />
    `
});

Xible.nodeDef({
    "id": "variable.name",
    "name": "variable.name",
    "type": "object",
    "description": "Extracts the name from a variable.",
    "inputs": {
      "variable": {
        "type": "variable"
      }
    },
    "outputs": {
      "name": {
        "type": "string"
      }
    }
});

Xible.nodeDef({
    "id": "variable.value",
    "name": "variable.value",
    "type": "object",
    "description": "Extracts the value from a variable.",
    "inputs": {
      "variable": {
        "type": "variable"
      }
    },
    "outputs": {
      "value": {
        "type": null
      }
    }
});

Xible.nodeDef({
    "id": "waitfor",
    "name": "waitfor",
    "type": "action",
    "description": "Waits for all the input triggers to have triggered, before continuing.",
    "inputs": {
      "trigger": {
        "type": "trigger"
      }
    },
    "outputs": {
      "done": {
        "type": "trigger"
      }
    }
});