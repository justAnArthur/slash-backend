## Structure

Structure wise this is closer to something like NestJS, since Elysia is not really opinionated on naming/structure it a higher level. This is an MVC pattern based structure, where each resource(article,user,etc) will have its own folder.

### src/api folder

- `*.controller.ts` denotes a controller file, which is an Elysia plugin (separated for each resource as recommended by [the docs](https://elysiajs.com/essential/plugin.html#plugin))
- `*.service.ts` will hold any logic, to keep controllers lean
- `*.schema.ts` file will hold related schema objects and types either inferred or generated from them, will be used in both controller and service files
- `*.utils.ts` optionally for even more granular logic related to a resource

### src/db folder

Will contain logic to create a database connection, a migration script and the schema definitions
Note that /sqlite folder will contain the DB files and the generated migrations

:warning: **Pro tip** In order to generate sql migration scripts one needs only to change the `schema.ts` file and run `bun migration:create`, drizzle-kit will figure out how to generate sql from those changes

### src/test folder

A few integration tests, using an in-memory sqlite database

### Config files

- `*.env` files that will automatically be loaded by Bun when running either the server or the tests
- `drizzle.config.ts` used to cofigure drizzle/sqlite integration
- `bunfig.toml` used for the tests setup
- Good old `package.json` and `tsconfig.json`

Last but not least this repo is not just a fork of the realworld starter kit but it has the realworld repo as a git submodule, to access all the extra goodies you might need

# Getting started

Install dependencies

> bun install

Setup

> bun migration:run

Start local server

> bun dev

Run local tests

> bun test

Run the integration tests(from the realworld submodule)
Requires the local server to be started
