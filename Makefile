STACK_NAME ?= gani-timeblock
REGION     ?= us-east-1

.PHONY: build deploy frontend upload all

build:
	sam build

deploy: build
	sam deploy \
		--stack-name $(STACK_NAME) \
		--region $(REGION) \
		--capabilities CAPABILITY_IAM \
		--resolve-s3 \
		--parameter-overrides AnthropicApiKey=$(ANTHROPIC_API_KEY)

frontend:
	cd frontend && npm run build

upload: frontend
	$(eval BUCKET := $(shell aws cloudformation describe-stacks \
		--stack-name $(STACK_NAME) --region $(REGION) \
		--query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" \
		--output text))
	aws s3 sync frontend/dist s3://$(BUCKET) --delete

all: deploy upload
