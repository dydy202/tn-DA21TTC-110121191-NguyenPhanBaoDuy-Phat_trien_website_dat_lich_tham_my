const { sql } = require("../config/db");
const bcrypt = require("bcryptjs");

class User {
  static async createUser(username, password, role) {
    const hashedPassword = await bcrypt.hash(password, 10);
    await sql.query`INSERT INTO Users (Username, Password, Role) VALUES (${username}, ${hashedPassword}, ${role})`;
  }

  static async getAllUsers() {
    const result = await sql.query`SELECT * FROM Users`;
    return result.recordset;
  }

  static async updateUser(id, username, role) {
    await sql.query`UPDATE Users SET Username = ${username}, Role = ${role} WHERE Id = ${id}`;
  }

  static async deleteUser(id) {
    await sql.query`DELETE FROM Users WHERE Id = ${id}`;
  }

  static async authenticate(username, password) {
    const result =
      await sql.query`SELECT * FROM Users WHERE Username = ${username}`;
    const user = result.recordset[0];

    if (user && (await bcrypt.compare(password, user.Password))) {
      return user;
    }
    return null;
  }
}

module.exports = User;
