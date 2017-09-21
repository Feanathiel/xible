module.exports = (xibleEditor) => {
    class XibleApi {
        fit() {
            xibleEditor.zoomFit();
        }

        center() {
            xibleEditor.center();
        }
    }

    return XibleApi;
};
