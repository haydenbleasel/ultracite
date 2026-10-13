const a = require("./a.cjs");

exports.b = () => (a.a ? "b" : "b?");
