"use strict"

var lex = require("pug-lexer")
var parse = require("pug-parser")
var encodeHTML = require("./vnode.js").encodeHTML

// templates from pug

var __indent = ""
function indent(n) {
    while (__indent.length < n) __indent += "          "
    return __indent.slice(0, n)
}

function line(n) {
    return "\n" + indent(n)
}

var isStaticString = /^["'][^"']*["']$/

function walkattrs(attrs) {
    var res = []
    for (var i = 0; i < attrs.length; i++) {
        var attr = attrs[i]
        // TODO we filter out "key" to use for the vnodes, is that wise?
        if (attr.name === "key") continue
        if (attr.name === "class") continue
        if (res.length > 0) res.push(",")
        res.push("\"", attr.name, "\":")
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

function walkclass(attrs) {
    var res = []
    for (var i = 0; i < attrs.length; i++) {
        var attr = attrs[i]
        if (attr.name !== "class") continue
        if (res.length > 0) res.push(",")
        if (attr.mustEscape) {
            var val = attr.val
            if (val.match(isStaticString)) {
                res.push(JSON.stringify(encodeHTML(eval(val))))
            } else {
                res.push("_e(", val, ")")
            }
        } else {
            res.push(attr.val)
        }
    }
    return "["+ res.join("") +"]"
}

var keys = 1
var code = []

function key(attrs, dynamickey) {
    for (var i = 0; i < attrs.length; i++) {
        var attr = attrs[i]
        if (attr.name === "key") return attr.val
    }
    if (dynamickey) return "_k"
    return String(keys++)
}

function walk(ast, n, dynamickey) {
    if (!ast) return
    n = n || 0
    switch (ast.type) {
        case "Block":
            for (var i = 0; i < ast.nodes.length; i++) walk(ast.nodes[i], n + 1, dynamickey)
            break
        case "Tag":
            // TODO split attrs into static and dynamic attributes
            var k = key(ast.attrs, dynamickey)
            code.push(line(n), "_h(", k, ", \"", ast.name, "\", ", walkattrs(ast.attrs), ", ", walkclass(ast.attrs), ")")
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
            if (ast.alternate) {
                code.push(line(n), "} else {")
                walk(ast.alternate, n + 1)
            }
            code.push(line(n), "}")
            break
        case "Each":
            code.push(line(n), "for (var _k in ", ast.obj, ") {")
            if (ast.key) code.push(line(n + 1), "var ", ast.key, " = _k;")
            code.push(line(n + 1), "var ", ast.val, " = ", ast.obj, "[_k];")
            walk(ast.block, n + 1, true/*dynamickey*/)
            code.push(line(n), "}")
            break
        case "While":
            code.push(line(n), "var _k = 0; while (", ast.test, ") { _k += 1;")
            walk(ast.block, n + 1, true/*dynamickey*/)
            code.push(line(n), "}")
            break;
        default:
            throw new Error("unknown pug type: "+ ast.type)
    }
}

function compile(text, keys) {
    var ast = parse(lex(text))
    keys = 1
    code = []
    walk(ast)
    var body = code.join("")
    return "function _template(_h, _x, _t, _e) {"+ body +"\n}"
}

exports.encodeHTML = encodeHTML
exports.compile = compile

