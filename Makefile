# Map-Editor — Makefile
#
# All Node-running targets go through scripts/with-node.sh, which installs and
# uses the version pinned in .nvmrc — so you don't have to `nvm use` yourself.

.PHONY: help start watch-lib build build-lib lint preview clean install release

WITH_NODE := ./scripts/with-node.sh
BUMP ?= patch

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-14s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

start: ## Start the standalone demo dev server
	$(WITH_NODE) npm run dev -- --host

watch-lib: ## Rebuild the library on change (for npm link into a host app)
	$(WITH_NODE) npm run dev:lib

build: ## Build the standalone demo app
	$(WITH_NODE) npm run build

build-lib: ## Build the publishable library (dist/)
	$(WITH_NODE) npm run build:lib

lint: ## Run ESLint
	$(WITH_NODE) npm run lint

preview: ## Preview the production demo build
	$(WITH_NODE) npm run preview

clean: ## Remove node_modules
	rm -rf node_modules

install: clean ## Clean-install dependencies (husky sets up git hooks via prepare)
	$(WITH_NODE) npm install

release: ## Bump version, push tag, trigger publish [BUMP=patch|minor|major]
	@set -e; \
	current=$$($(WITH_NODE) node -p "require('./package.json').version"); \
	branch=$$(git rev-parse --abbrev-ref HEAD); \
	if [ "$$branch" != "main" ]; then \
		echo "✗ You are on '$$branch', not 'main'. Releases must be cut from main."; \
		exit 1; \
	fi; \
	if [ -n "$$(git status --porcelain)" ]; then \
		echo "✗ Working tree is not clean. Commit, stash, or discard changes first."; \
		exit 1; \
	fi; \
	echo "→ Fetching latest main..."; \
	git pull --ff-only origin main; \
	echo ""; \
	echo "  Current version : $$current"; \
	echo "  Bump type       : $(BUMP)"; \
	echo ""; \
	echo "  This will:"; \
	echo "    1. npm version $(BUMP)  — bump package.json + create a git tag"; \
	echo "    2. push main and the new tag to origin"; \
	echo "    3. trigger the Publish Package workflow → publishes to GitHub Packages"; \
	echo ""; \
	printf "  Type 'yes' to proceed: "; \
	read confirm; \
	if [ "$$confirm" != "yes" ]; then \
		echo "Aborted — nothing changed."; \
		exit 1; \
	fi; \
	new=$$($(WITH_NODE) npm version $(BUMP) -m "release: v%s"); \
	echo "→ Bumped to $$new"; \
	git push origin main; \
	git push origin "$$new"; \
	echo ""; \
	echo "✓ Pushed $$new. Watch the Publish Package workflow in the Actions tab:"; \
	echo "  https://github.com/pheedloop/Map-Editor/actions"
