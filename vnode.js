"use strict"

// Very simply virtual dom, pointing too, and updating a real dom.
//
// The nodes are updated using a javascript function that walks the tree for
// nodes that are visible. But this function is compiled from a templating
// language. That yields a few advantages:
//
// * all nodes have a static predefined identifier (key) except for each/while
//   nodes, which have them created at runtime or by template author
// * updating requires almost no memory, and no recursion

// run eval in an empty environment
// not, eval itself will have access to all javascript globals
var _evalfn = null
function minimalEval(text) {
    if (!_evalfn) _evalfn = new Function("__t", "return eval(__t)")
    return _evalfn(text)
}

var entityMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    //"'": '&#39;',
    //'/': '&#x2F;',
    //'`': '&#x60;',
    //'=': '&#x3D;'
}
function fromEntityMap(s) { return entityMap[s] }
function encodeHTML(text) { if (typeof(text) === "function") return text; return String(text).replace(/[&<>"]/g, fromEntityMap) }

// passed along while synchronizing, there will ever by only one object it is reused with clear() and set()
class State {
    constructor() {
        this.context = null // Context
        this.tick = 0
        this.current = null // VNode
        this.iter = 0       // VNode.subnodes index
        this.nodestack = [] // [VNode]
        this.iterstack = [] // [iter]
    }

    clear() {
        this.current = null
        this.iter = 0
        if (this.nodestack.length) { this.nodestack.length = 0; this.iterstack.length = 0 }
    }

    set(context, current) {
        this.context = context
        this.tick = context.tick
        this.current = current
        if (this.nodestack.length) { this.nodestack.length = 0; this.iterstack.length = 0 }
    }

    push(vnode) {
        this.nodestack.push(this.current)
        this.iterstack.push(this.iter)
        this.current = vnode
        this.iter = 0
    }

    pop() {
        this.current = this.nodestack.pop()
        this.iter = this.iterstack.pop()
    }

    parentNode() {
        return this.current.dom
    }

    nextNode() {
        var vnode = this.current.subnodes[this.iter]
        return vnode? vnode.dom : null
    }
}

// there is only one state, it is clear()'d every time
var _state = new State()

class Context {
    constructor() {
        this.tick = 0
        this.roots = []
        this.templates = []
    }

    update() {
        // TODO this should be postponed, or at least check for recursion
        var start = +new Date
        this.tick += 1
        for (var i = 0, il = this.roots.length; i < il; i++) {
            var root = this.roots[i]
            _state.set(this, root)
            this.templates[i](beginNode, endNode, textNode, encodeHTML)
            postProcess(root.subnodes)
            _state.clear()
        }
        console.log("rpug update:", this.tick, (+new Date) - start, "millis")
    }

    mount(where, template) {
        if (typeof(where) === "string") {
            where = document.getElementById(where)
            if (!where) throw new Error("unabled to find element: "+ where)
        }
        if (!where) throw new Error("no mount point")
        if (typeof(template) === "string") throw new Error("template is a string, forgot to run eval()?")
        if (typeof(template) !== "function") throw new Error("template is not valid")

        var root = new VNode(null)
        root.dom = where
        this.roots.push(root)
        this.templates.push(template)
        this.update()
    }

    findAndMount(type) {
        // dynamically check if we can load rpug (our 'mother' package, not "./rpug.js")
        var rpug = window["require"]("rpug")
        if (!rpug.compile) return

        type = type || "text/rpug"
        var scripts = document.querySelectorAll("script[type='"+ type +"']")

        for (var i = 0; i < scripts.length; i++) {
            var script = scripts[i]
            var parent = script.parentNode
            var dom = document.createElement("div")
            parent.insertBefore(dom, script)
            var text = script.textContent
            console.log("compiling:", text)
            var code = rpug.compile(text)
            console.log("function:", code)
            var template = minimalEval(code +";_template")
            this.mount(dom, template)
        }
        this.update()
    }
}

function context() {
    if (typeof(window) !== "undefined") {
        if (window._rpug_context) return window._rpug_context
        return window._rpug_context = new Context()
    }
    return new Context()
}

function wrapEventHandler(value) {
    if (typeof(value) === "function") {
        var context = _state.context
        return function(event) {
            var res = value.apply(this, arguments)
            context.update()
            return res
        }
    }
    return value
}

function wrapBindHandler(value, vnode) {
    if (typeof(value) === "function") {
        var context = _state.context
        return function(event) {
            var res = value.apply(this, arguments)
            vnode.tick = context.tick + 1
            context.update()
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
        this.tick = _state.tick
    }

    create(tag, attrs, classes) {
        var dom = document.createElement(tag)
        for (var key in attrs) {
            if (key.startsWith("on")) {
                if (key.endsWith("-bind")) {
                    dom[key.slice(0, -5)] = wrapBindHandler(attrs[key], this)
                    continue
                }
                dom[key] = wrapEventHandler(attrs[key])
                continue
            }
            if (key === "value") {
                dom.value = attrs[key]
                continue
            }
            dom.setAttribute(key, attrs[key])
        }
        if (classes.length > 0) { var cl = dom.classList; cl.add.apply(cl, classes) }
        this.dom = dom
        this.data = attrs
        _state.parentNode().insertBefore(dom, _state.nextNode())
    }

    update(attrs, classes) {
        // bind=handler will update the tick, so we don't update the bound element
        if (this.tick == _state.tick) return
        if (this.tick > _state.tick) console.log("warning: tick too large:", this.tick, _state.tick)

        // TODO this can be optimized a lot, like knowing properties are only changed, or even knowing which are static
        this.tick = _state.tick
        var dom = this.dom
        for (var key in attrs) {
            var value = attrs[key]
            if (value === this.data[key]) continue
            if (key.startsWith("on")) {
                console.warn("cannot update event handlers: ", key, "for: ", dom)
                continue
            }
            if (key === "value") {
                dom.value = attrs[key]
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

    createText(text) {
        var dom = document.createTextNode(text)
        this.dom = dom
        this.data = text
        _state.parentNode().insertBefore(dom, _state.nextNode())
    }

    updateText(text) {
        this.tick = _state.tick
        if (this.data === text) return
        this.data = text
        this.dom.textContent = text
    }

    remove() {
        this.dom.parentNode.removeChild(this.dom)
        this.dom = null
    }
}

// returns the node with the same key, might find reordering, will change _state.iter
function findSame(nodes, key) {
    for (var i = 0, il = nodes.length; i < il; i++) {
        var node = nodes[i]
        if (node.key === key) {
            if (i > _state.iter) _state.iter = i
            return node
        }
    }
    return null
}

function postProcess(nodes) {
    for (var i = 0, il = nodes.length; i < il; i++) {
        var node = nodes[i]
        if (node.tick !== _state.tick) {
            node.remove()
            nodes.splice(i, 1)
            i -= 1; il -= 1
        }
    }
}

function textNode(key, text) {
    var subnodes = _state.current.subnodes
    var existing = findSame(subnodes, key)
    if (existing) {
        existing.updateText(text)
        return
    }

    _state.iter += 1
    var vnode = new VNode(key)
    vnode.createText(text)
    subnodes.splice(_state.iter, 0, vnode)
}

function beginNode(key, tag, attrs, classes) {
    var subnodes = _state.current.subnodes
    var existing = findSame(subnodes, key)
    if (existing) {
        existing.update(attrs, classes)
        _state.push(existing)
        return
    }

    _state.iter += 1
    var vnode = new VNode(key)
    vnode.create(tag, attrs, classes)
    subnodes.splice(_state.iter, 0, vnode)
    _state.push(vnode)
}

function endNode(key) {
    postProcess(_state.current.subnodes)
    _state.pop()
}

exports.encodeHTML = encodeHTML
exports.context = context

