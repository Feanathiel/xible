
function apiFactory(xibleEditor) {
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

module.exports = apiFactory;
