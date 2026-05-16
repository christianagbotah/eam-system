// This file intentionally uses .js (not .ts) and CommonJS require()
// to avoid Turbopack's module analysis of @prisma/adapter-mariadb.
// Turbopack crashes when it tries to bundle the native MariaDB adapter
// as a dependency of a server component or API route.

"use strict";

function createAdapter(config) {
  const { PrismaMariaDb } = require("@prisma/adapter-mariadb");
  return new PrismaMariaDb(config);
}

module.exports = { createAdapter };
