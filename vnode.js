"use strict"

// very simply virtual dom, pointing too, and updating the real dom
// because these nodes come from a template, most nodes have a static unique key
// except for list like nodes, where the template author is responsible for the uniqueness

// global state used
var context = {
    tick: 0,
    root: null, // the root node

    // working state while updating the virtual dom with dom
    current: null,
    iter: 0,
    stack: [], // [{node:VNode,iter:Number}]

    parentNode: function() { return this.current.dom },
    nextNode: function() { var vnode = this.current.subnodes[this.iter]; return vnode? vnode.dom : null },
}

function wrapEventHandler(value) {
    if (typeof(value) === "function") {
        return function(event) {
            let res = value.apply(this, arguments)
            render()
            return res
        }
    }
    return value
}

class VNode {
    constructor(key) {
        this.key = key
        this.dom = null // the actual dom node, if any
        this.data = null // either the nodes text, or the nodes attrs
        this.subnodes = [] // list of sub nodes
        // to keep the tree in sync, left out nodes will fail to update their tick
        this.tick = context.tick
    }

    create(tag, attrs, classes) {
        var dom = document.createElement(tag)
        for (var key in attrs) {
            if (key.startsWith("on")) {
                dom[key] = wrapEventHandler(attrs[key])
                continue
            }
            dom.setAttribute(key, attrs[key])
        }
        if (classes.length > 0) { var cl = dom.classList; cl.add.apply(cl, classes) }
        this.dom = dom
        this.data = attrs
        context.parentNode().insertBefore(dom, context.nextNode())
    }

    createText(text) {
        var dom = document.createTextNode(text)
        this.dom = dom
        this.data = text
        context.parentNode().insertBefore(dom, context.nextNode())
    }

    update(attrs, classes) {
        // TODO this can be optimized a lot, like knowing properties are only changed, or even knowing which are static
        this.tick = context.tick
        var dom = this.dom
        for (var key in attrs) {
            var value = attrs[key]
            if (value === this.data[key]) continue
            if (key.startsWith("on")) {
                console.warn("cannot update event handlers: ", key, "on: ", dom)
                continue
            }
            dom.setAttribute(key, attrs[key])
        }
        for (var key in this.data) {
            if (attrs[key]) continue
            dom.removeAttribute(key)
        }

        var cl = dom.classList
        if (classes.length > 0) cl.add.apply(cl, classes)
        var l = cl.length
        if (l !== classes.length) {
            for (var i = 0; i < l; i++) {
                var cls = cl.item(i)
                if (classes.indexOf(cls) < 0) {
                    cl.remove(cls)
                    i -= 1; l -= 1
                }
            }
        }
        this.data = attrs
    }

    updateText(text) {
        this.tick = context.tick
        if (this.data === text) return
        this.data = text
        this.dom.textContent = text
    }

    remove() {
        this.dom.parentNode.removeChild(this.dom)
        this.dom = null
    }
}

// returns the node with the same key, might find reordering, will change context.iter
function findSame(nodes, key) {
    for (var i = 0, il = nodes.length; i < il; i++) {
        var node = nodes[i]
        if (node.key === key) {
            if (i > context.iter) context.iter = i
            return node
        }
    }
    return null
}

function postProcess(nodes) {
    for (var i = 0, il = nodes.length; i < il; i++) {
        var node = nodes[i]
        if (node.tick !== context.tick) {
            node.remove()
            nodes.splice(i, 1)
            i -= 1; il -= 1
        }
    }
}

function bind(node) {
    context.stack.push({node:context.current,iter:context.iter})
    context.current = node
    context.iter = 0
}

function unbind(node) {
    postProcess(node.subnodes)
    var s = context.stack.pop()
    context.current = s.node
    context.iter = s.iter
}

function textNode(key, text) {
    var subnodes = context.current.subnodes
    var existing = findSame(subnodes, key)
    if (existing) {
        existing.updateText(text)
        return
    }

    context.iter += 1
    var vnode = new VNode(key)
    vnode.createText(text)
    subnodes.splice(context.iter, 0, vnode)
}

function beginNode(key, tag, attrs, classes) {
    var subnodes = context.current.subnodes
    var existing = findSame(subnodes, key)
    if (existing) {
        existing.update(attrs, classes)
        bind(existing)
        return
    }

    context.iter += 1
    var vnode = new VNode(key)
    vnode.create(tag, attrs, classes)
    subnodes.splice(context.iter, 0, vnode)
    bind(vnode)
}

function endNode(key) {
    //assert(context.current.key === key)
    unbind(context.current)
}

function render() {
    var start = +new Date
    context.tick += 1
    context.current = context.root
    context.iter = 0
    context.template(context.datacb())
    postProcess(context.root)
    console.log("render:", context.tick, (+new Date) - start, "millis")
}

function setupContext(dom, template, datacb) {
    context.template = template
    context.datacb = datacb
    context.root = new VNode(0)
    context.root.dom = dom
}

exports.textNode = textNode
exports.beginNode = beginNode
exports.endNode = endNode
exports.render = render
exports.setupContext = setupContext

