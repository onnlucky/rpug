# rpug - Reactive client side pug templates.

* author: Onne Gorter
* licence: CC0

Use pug[1] templates as a self updating virtual dom. Much like facebooks react[2].

Minimal example:
```
title rpug demo
script(src="node_modules/rpug/rpug_runtime.bundle.js")
p Some normal pug template
script.
  // javascript app
  var clicks = 0
  function addclick() { clicks += 1}
  // must be done before any :rpug statement
  require("rpug").context()
:rpug
  p Reactive pug template here.
  p You clicked #{clicks} times.
  button(onclick=addclick) click me!
```

```
$ npm install -g pug
$ npm install rpug jstransformer-rpug
$ pug example.pug
$ open example.html
```

[1] http://jade-lang.com
[2] http://facebook.github.io/react/


## work in progress

It works for what I use it for. But it can use some optimizations.

### TODO
* precompiled templates should nor require rpug to have loaded already
* context.update() should schedule update, not immediately trigger one
* optimize static properties vs dynamic properties, easy enough to do from pug
* pass along the virtual node, so you can do things like
  `vnode.hold(deep=false: Bool)` to prevent updates for a while
* find vnode.key faster, and postProcess faster
* stop using node.classList, it is a horrible interface
* optimize certain patterns, like `p Hello` does not need _t(p); _t("Hello"); _x();
* optmize static parts of the tree, no need to run down a tree when we know it can only
  appear/disappear, never change
* animations
* do rpug_runtime.js, no require, no classes, as minimalist as possible

## notes

Use the actual dom as a read-only source, that is perfectly fine pattern.

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

