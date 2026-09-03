exports.up = (pgm) => pgm.sql(require("../src/services/pushService").schema);
exports.down = () => null;
