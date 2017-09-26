const Node = require('../xible/Node');

describe("Xible.Node", function() {
    it("initializer", function() {
        var node = new Node({
            id: "some-id",
            name: "some-name",
            type: "some-type",
            description: "some-description",
            editorContent: "some-editorContent"
        })

        expect(node.id).toBe("some-id");
        expect(node.name).toBe("some-name");
        expect(node.type).toBe("some-type");
        expect(node.description).toBe("some-description");
        expect(node.editorContent).toBe("some-editorContent");
    });
});