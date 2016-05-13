"use strict"

var lex = require("pug-lexer")
var parse = require("pug-parser")
var vnode = require("./vnode.js")

// templates from pug

var __indent = ""
function indent(n) {
    while (__indent.length < n) __indent += "          "
    return __indent.slice(0, n)
}

function line(n) {
    return "\n" + indent(n)
}

var entityMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
}
function fromEntityMap(s) { return entityMap[s] }
function encodeHTML(text) { if (typeof(text) === "function") return text; return String(text).replace(/[&<>"'`=\/]/g, fromEntityMap) }

var isStaticString = /["'][^"']*["']/
function walkattrs(attrs) {
    var res = []
    for (var i = 0; i < attrs.length; i++) {
        var attr = attrs[i]
        // TODO we filter out "key" to use for the vnodes, is that wise?
        if (attr.name === "key") continue
        res.push(attr.name, ":")
        if (attr.mustEscape) {
            var val = attr.val
            // if it looks like a plain string, aka, "test", then no need to runtime encode that html
            if (val.match(isStaticString)) {
                res.push(JSON.stringify(encodeHTML(eval(val))))
            } else {
                res.push("_e(", val, ")")
            }
        } else {
            res.push(attr.val)
        }
    }
    return "{"+ res.join("") +"}"
}

var keys = 1
var code = []

function key(attrs) {
    for (var i = 0; i < attrs.length; i++) {
        var attr = attrs[i]
        if (attr.name === "key") return attr.val
    }
    return String(keys++)
}

function walk(ast, n) {
    if (!ast) return
    n = n || 0
    switch (ast.type) {
        case "Block":
            for (var i = 0; i < ast.nodes.length; i++) walk(ast.nodes[i], n + 1)
            break
        case "Tag":
            // TODO walkattrs should tell us if they are static, if so, we can pre-create them, so attrs === attrs, while diffing
            // TODO or we treat id/class/attrs seperately
            var k = key(ast.attrs)
            code.push(line(n), "_h(", k, ", \"", ast.name, "\", ", walkattrs(ast.attrs), ")")
            walk(ast.block, n + 1)
            code.push(line(n), "_x(", k, ", \"/", ast.name, "\")")
            break
        case "Text":
            var k = key([])
            code.push(line(n), "_t(", k, ", ", JSON.stringify(encodeHTML(ast.val)), ")")
            break
        case "Code":
            var k = key([])
            if (ast.buffer) {
                if (ast.mustEscape) {
                    code.push(line(n), "_t(", k, ", _e(", ast.val, "))")
                } else {
                    code.push(line(n), "_t(", k, ", ", ast.val, ")")
                }
            } else {
                code.push(line(n), ast.val)
            }
            break
        case "Conditional":
            code.push(line(n), "if (", ast.test, ") {")
            walk(ast.consequent, n + 1)
            if (ast.alternative) {
                code.push(line(n), "} else {")
                walk(ast.alternative, n + 1)
            }
            code.push(line(n), "}")
            break
        case "While":
            code.push(line(n), "while (", ast.test, ") {")
            walk(ast.block, n + 1)
            code.push(line(n), "}")
            break
        default:
            throw new Error("unknown pug type: "+ ast.type)
    }
}

var envnames = "_h,_x,_t,_e"
var envfuncs = [vnode.beginNode, vnode.endNode, vnode.textNode, encodeHTML]
var __cache = []
var __cachefn = []
function makeTemplate(body) {
    return function(locals) {
        var keys = Object.keys(locals).sort()
        var key = keys.join(",") // TODO can we elide creating this string?
        var at = __cache.indexOf(key)
        if (at < 0) {
            if (keys.indexOf("_h") >= 0 || keys.indexOf("_t") >= 0 || keys.indexOf("_x") >= 0 || keys.indexOf("_e") >= 0) {
                throw new Error("cannot use locals called _h, _t, _x or _e")
            }
            at = __cache.length
            __cache.push(key)
            var fn = new Function(envnames, key, body)
            __cachefn.push(fn)
            console.log("template created:", at, "\n", body)
        } else {
            console.log("template cache hit:", at)
        }

        // prepare arguments to the template, first 4 are for the mechanism
        var l = keys.length
        var args = new Array(l + 4)
        for (var i = 0; i < 4; i++) {
            args[i] = envfuncs[i]
        }
        for (var i = 0; i < l; i++) {
            args[i + 4] = locals[keys[i]]
        }
        return __cachefn[at].apply(null, args)
    }
}

function compile(text) {
    var ast = parse(lex(text))
    keys = 1
    code = []
    walk(ast)
    var body = code.join("")
    return makeTemplate(body)
}

exports.compile = compile

