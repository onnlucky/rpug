all: rpug.bundle.js rpug_runtime.bundle.js

rpug.bundle.js: index.js vnode.js rpug.js Makefile
	browserify -r ./index.js:rpug > $@

rpug_runtime.bundle.js: vnode.js Makefile
	browserify -r ./vnode.js:rpug > $@

clean:
	rm -f *.bundle.js *.bundle.min.js

run:
	node index.js
