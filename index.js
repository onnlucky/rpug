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
// to test code server-side, it only requires a minimal dom framework
var root = require("simple-dom").Document().createElement("div")

// example code
var rpug = require("rpug")

// start with your data, any shape or form you like
var name = "World"
var counter = 0
var collection = ["Apples", "Bananas", "Coconuts", "Dades"]

// and your event handlers, the event is a normal dom event
function increment(event) {
    counter += 1
}

// event handlers will only be set at creation time
// to pass on dynamic data, you can use attributes
function remove(event) {
    var index = Number(event.target.getAttribute(index))
    collection.splice(index, 1)
}

// create a context, by eval'ing the result of rpug.init([HTMLElement], [String|Function])
var context = rpug.context(eval(rpug.init(root, `
p Hello #{name}!
button(onclick=increment,data=10)= counter
ul
  each val, index in collection
    li val
      button(onclick=remove,data=index) -
`)))

// event handlers will be automatically wrapped to update the dom tree
// but when modifying data outside of event handlers, use context.update()
setTimeout(function(){ counter = 1337; context.update() }, 5 * 1000)

// in production you can precompile scripts in the following pattern
<script>
//app code
</script>
<script type="text/rpug" name="context">
rpug template
// the precompiled version will result in a single global: `window.context = ...`
<script>

*/

