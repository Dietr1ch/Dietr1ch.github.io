
build:
	bundle exec rake build

publish: build
	bundle exec rake publish BRANCH_NAME=master
