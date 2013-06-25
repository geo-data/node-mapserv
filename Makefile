##
# Node-mapserv development targets
#
# This Makefile contains the following primary targets intended to facilitate
# Linux based development:
#
#  - `make build`: create a Debug build of the module
#  - `make test`: run the tests
#  - `make cover`: perform the code coverage analysis
#  - `make clean`: remove generated files
#

# The location of the mapserver build directory
ifeq ($(strip $(npm_config_mapserv_build_dir)),)
	npm_config_mapserv_build_dir = $(shell npm config get mapserv:build_dir)
endif

# The location of the `vows` test command
VOWS = ./node_modules/.bin/vows

# The location of the `node-gyp` module builder. Try and get a globally
# installed version, falling back to a local install.
NODE_GYP = $(shell which node-gyp)
ifeq ($(NODE_GYP),)
	NODE_GYP = ./node_modules/.bin/node-gyp
endif

# The location of the `istanbul` JS code coverage framework. Try and get a
# globally installed version, falling back to a local install.
ISTANBUL=$(shell which istanbul)
ifeq ($(ISTANBUL),)
	ISTANBUL = ./node_modules/.bin/istanbul
endif

# Dependencies for the test target
test_deps=build \
./test/*.js \
./test/*.map \
lib/*.js \
$(VOWS)


# Build the module
all: build
build: build/Debug/bindings.node
build/Debug/bindings.node: $(NODE_GYP) src/*.hpp src/*.cpp src/*.h src/*.c
	npm_config_mapserv_build_dir=$(npm_config_mapserv_build_dir) $(NODE_GYP) -v --debug configure build

# Test the module
test: $(test_deps)
	$(VOWS) --spec ./test/mapserv-test.js

# Perform the code coverage
cover: coverage/index.html
coverage/index.html: coverage/node-mapserv.info
	genhtml --output-directory coverage coverage/node-mapserv.info
	@echo "\033[0;32mPoint your browser to \`coverage/index.html\`\033[m\017"
coverage/node-mapserv.info: coverage/bindings.info
	lcov --test-name node-mapserv \
	--add-tracefile coverage/lcov.info \
	--add-tracefile coverage/bindings.info \
	--output-file coverage/node-mapserv.info
coverage/bindings.info: coverage/addon.info
	lcov --extract coverage/addon.info '*node-mapserv/src/*' --output-file coverage/bindings.info
coverage/addon.info: coverage/lcov.info
	lcov --capture --base-directory src/ --directory . --output-file coverage/addon.info
coverage/lcov.info: $(test_deps) $(ISTANBUL)
	node --nouse_idle_notification --expose-gc $(ISTANBUL) cover --report lcovonly $(VOWS) -- test/mapserv-test.js

# Install required node modules
$(NODE_GYP):
	npm install node-gyp

$(VOWS): package.json
	npm install vows
	@touch $(VOWS)

$(ISTANBUL): package.json
	npm install istanbul
	@touch $(ISTANBUL)

# Clean up any generated files
clean: $(NODE_GYP)
	$(NODE_GYP) clean
	rm -rf coverage

.PHONY: test
