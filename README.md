# rpug - Reactive client side pug templates.

* author: Onne Gorter
* licence: CC0

## notes

Event handlers are set only once. Creating closures in the template is just
wasting resources, and likely will not do what you expect. To pass in extra
data, place those on the dom, e.g.:

```
a(onclick=handler,data="somedata") test
```
```javascript
function handler(event) {
    var data = event.target.getAttribute("data")
    // do stuff
}
```

Some attributes are handled specially: `key`, `value`, `on*`, `on*-bind`

* `key`, specifically sets the vnode identifier, so it is unambigous when an
  element has moved or disappeared. The framework creates these automatically,
  but for lists (`each`, `while`), it is recommended to use. Otherwise the key
  will be its position.
* `value`, `on*`, all attributes are set using node.setAttribute(), except for
  `value` and event handlers. Plus event handlers get wrapped to trigger
  updates, and set only once.
* `on*-bind`, when postfixing an event handler with -bind, when it fires
  it will skip one update. Useful for native input elements.

```
input(oninput-bind=handler,value=text)
```
```javascript
var text = "lorem ipsum"
function handler(event) {
    text = event.target.value
}
```

## example

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
