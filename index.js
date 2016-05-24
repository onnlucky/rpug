"use strict"

var rpug = require("./rpug.js")
var vnode = require("./vnode.js")

exports.compile = rpug.compile
exports.context = vnode.context

exports.precompile = function(text, id) {
    // try to get some stable unique id if none was given
    if (!id) {
        id = "_rpug"+ (text.length
              ^ (13 * text.charCodeAt(7 % text.length))
              ^ (34 * text.charCodeAt(text.length - 1)))
    }
    return "<div id=\""
           + id +"\"></div><script>\nwindow._rpug_context.mount(document.getElementById(\""
           + id +"\"), " + rpug.compile(text) +"</script>\n"
}
