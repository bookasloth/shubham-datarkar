// Preload (not committed): neutralize `server-only` so server modules import
// under tsx for local one-off scripts. Server context is fine here.
const Module = require("module");
const orig = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "server-only") return {};
  return orig.call(this, request, parent, isMain);
};
