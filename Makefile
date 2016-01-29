deps:
	npm install

build:
	make clean
	node_modules/.bin/babel -e 0 -d lib/ src/

watch:
	make clean
	node_modules/.bin/babel -w -e 0 -d lib/ src/

publish:
	make deps
	make build
	npm publish

clean:
	rm -rf lib
