# Makefile need to indent with tab instead of space
# indent with spaces lead to this error: Makefile:5: *** missing separator.  Stop.
SHELL := /bin/bash
.PHONY: install clean test
# include default shell env for Makefile
include .make.env
# export all variable to sub Makefile as well
export


install:
	@echo "Install dependencies"
	npm install

run-worker:
	@echo "Run worker"
	npm run start

run-client:
	@echo "Run client"
	npm run workflow

temporal-server:
	@echo "Run temporal server locally"
	temporal server start-dev