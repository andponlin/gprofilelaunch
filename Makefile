# Copyright 2020, Andrew Lindesay. All Rights Reserved.
# Distributed under the terms of the MIT License.
#
# Authors:
#		Andrew Lindesay, apl@lindesay.co.nz

NAME=profilelaunch
VERSION=$(shell jq .version profilelaunch@lindesay.co.nz/metadata.json)

all: target target/gprofilelaunch-$(VERSION).tgz

target:
	mkdir $@

target/gprofilelaunch-$(VERSION).tgz:
	tar -czf $@ profilelaunch@lindesay.co.nz

clean:
	rm -rf target

