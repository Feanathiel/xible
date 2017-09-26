
const Model = require('./Model');
const TypeDef = require('./TypeDef');
const Node = require('./Node');
const XibleUi = require('./XibleUi');

const apiFactory = (element, options) => {
    const model = new Model();
    const xibleUi = new XibleUi(element, options, model);
    const xibleEditor = xibleUi.editor;

    class XibleApi {
        fit() {
            xibleEditor.zoomFit();
        }

        center() {
            xibleEditor.center();
        }

        selectAll() {
            xibleEditor.selectAll();
        }

        deselectAll() {
            xibleEditor.deselect();
        }

        flowsJson() {
            var data = {};

            for (var key in xibleEditor.flows) {
                if (!xibleEditor.flows.hasOwnProperty(key)) {
                    continue;
                }

                var flow = xibleEditor.flows[key];

                // This should be done differently, but works for now
                // We need to check what we want to export.
                data[key] = JSON.parse(flow.toJson());
            }

            return JSON.stringify(data, null, 4);
        }
    }

    return XibleApi;
}

const staticFactory = () => {

    function StaticApi(element, options) {
        return apiFactory(element, options);
    }

    StaticApi.typeDef = function typeDef(definition) {
        const id = definition.id;
        TypeDef.register(id, definition);
    };

    StaticApi.nodeDef = function nodeDef(definition) {
        const id = definition.id;
        Node.register(id, definition);
    };

    return StaticApi;
};

module.exports = staticFactory();
