const Node = require('../xible/Node');
const NodeIo = require('../xible/Io');

describe("Xible.Node", function() {
    it("initializer", function() {
        var node = new Node({
            id: "some-id",
            name: "some-name",
            type: "some-type",
            description: "some-description",
            editorContent: "some-editorContent"
        });

        expect(node.id).toBe("some-id");
        expect(node.name).toBe("some-name");
        expect(node.type).toBe("some-type");
        expect(node.description).toBe("some-description");
        expect(node.editorContent).toBe("some-editorContent");
    });
});

describe("Xible.Io", function() {
    it("initializer", function() {
        var node = new NodeIo("test-name", {
            type: "some-type",
            global: false,
            singleType: true,
            maxConnectors: 2,
            hidden: false
        }, true);
        
        expect(node.name).toBe("test-name");
        expect(node.type).toBe("some-type");
        expect(node.global).toBe(false);
        expect(node.singleType).toBe(true);
        expect(node.maxConnectors).toBe(2);
        expect(node.hidden).toBe(false);
        expect(node.isOutput).toBe(true);
    });
});