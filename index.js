"use strict"

var vnode = require("./vnode.js")
var rpug = require("./rpug.js")

function rpug2(dom, text, datacb) {
    vnode.setupContext(dom, rpug.compile(text), datacb)
    vnode.render()
}

// exports
function rpug1(datacb) {
    var script = document.querySelector("script[type*=rpug]")
    var parent = script.parentNode
    var dom = document.createElement("div")
    parent.insertBefore(dom, script)
    var text = script.textContent
    return rpug2(dom, text, datacb)
}

function update() {
    vnode.render()
}

function compile(text) {
    rpug.compile(text)
}

exports.update = update
exports.app = rpug1
exports.compile = compile

/*
;(function() {
    var str = "button(onclick=incClicks) click\n"
            + "p Click count: #{clicks}\n"

    var clicks = 0
    function incClicks() {
        clicks += 1
        update() // TODO can be removed when we wrap all callbacks
    }
    rpug2(str, function(){ return {clicks:clicks, incClicks:incClicks} })
    incClicks()
    incClicks()
})()
*/

