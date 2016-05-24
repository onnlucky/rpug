# rpug - Reactive client side pug templates.

* author: Onne Gorter
* licence: CC0

```javascript
// create app
var counter = 0
var collection = ["Apples", "Bananas", "Coconuts", "Dades"]

// an event handler, app will update automatically
function increment() {
    counter += 1
}

// event handlers receive normal dom events
// and you can use the dom in a read-only manner
function add(event) {
    var input = document.getElementById("name")
    var name = input.textValue
    input.textValue = ""
    collection.push(name)
}

// if you add extra properties to the dom node, you can get those back
function remove(event) {
    var index = Number(event.target.getAttribute("data"))
    collection.splice(index, 1)
}

// start the rpug virtual dom by importing and creating a context
var rpug = require("rpug")
var context = rpug.context()

// mount a template, if not precompiled, needs to go through eval()
context.mount("rootid", eval(rpug.compile(`
button(onclick=increment)= counter

input#name(type=text,placeholder="item)
button(onclick=add)
ul
  each val, index in collection
    li val
      button(onclick=remove,data=index) -
`)))

// any updates to the app data outside of event handlers will need to call context.update()
setTimeout(function() {
    counter = 999
    context.update()
}, 5000)

// any precompiled script will result in code something like this:
//<div id="_rpug123")
//<script>
//window._rpug_context.mount(document.getElementById("_rpug123"), function(_h, _x, _t, _e) {
// ... lots of template code ...
//})
//</script>
// if all scripts are precompiled you only need rpug_runtime.min.js
```
