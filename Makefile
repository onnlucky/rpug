bundle.js: index.js vnode.js rpug.js Makefile
	browserify -r ./index.js:rpug > bundle.js

run: bundle.js
	node index.js
