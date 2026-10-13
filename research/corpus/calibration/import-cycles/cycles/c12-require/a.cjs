const b = require("./b.cjs");

exports.a = () => `a${b.b()}`;
