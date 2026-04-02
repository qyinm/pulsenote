set shell := ["zsh", "-cu"]

default:
  @just --list

help:
  @just --list

dev: web-dev

build: web-build api-build

test: web-test api-test

lint: web-lint

typecheck: web-typecheck api-typecheck

check: lint typecheck test

api-dev:
  pnpm --dir apps/api dev

api-build:
  pnpm --dir apps/api build

api-start:
  pnpm --dir apps/api start

api-test:
  pnpm --dir apps/api test

api-typecheck:
  pnpm --dir apps/api typecheck

api-db-generate:
  pnpm --dir apps/api db:generate

api-db-migrate:
  pnpm --dir apps/api db:migrate

web-dev:
  pnpm --dir apps/web dev

web-build:
  pnpm --dir apps/web build

web-start:
  pnpm --dir apps/web start

web-test:
  pnpm --dir apps/web test

web-lint:
  pnpm --dir apps/web lint

web-typecheck:
  pnpm --dir apps/web typecheck

site-dev:
  pnpm --dir apps/site dev

site-build:
  pnpm --dir apps/site build

site-lint:
  pnpm --dir apps/site lint

site-preview:
  pnpm --dir apps/site preview
