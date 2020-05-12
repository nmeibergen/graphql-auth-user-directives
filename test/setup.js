require("dotenv-override").config({ override: true });

module.exports = async () => {
  // ...
  // Set reference to mongod in order to close the server during teardown.
  //global.__MONGOD__ = mongod;
  const x = 1;
};
