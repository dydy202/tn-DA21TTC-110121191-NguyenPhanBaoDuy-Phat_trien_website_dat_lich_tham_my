const bcrypt = require("bcrypt");

(async () => {
  const password = "07082002";
  const hashedPassword = await bcrypt.hash(password, 10);
  console.log(hashedPassword);
})();

