"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const gdmn_db_1 = require("gdmn-db");
const UpdateOrInsert_1 = require("./UpdateOrInsert");
const Update_1 = require("./Update");
const Insert_1 = require("./Insert");
;
class Crud {
    static async run(connection, steps) {
        await gdmn_db_1.AConnection.executeTransaction({
            connection,
            callback: async (transaction) => {
                for (const { sql, params } of steps) {
                    await connection.executeReturning(transaction, sql, params);
                }
            },
        });
    }
    static async executeInsert(connection, input) {
        const steps = Insert_1.buildInsertSteps(input);
        await this.run(connection, steps);
    }
    static async executeUpdateOrInsert(connection, input) {
        const steps = UpdateOrInsert_1.buildUpdateOrInsertSteps(input);
        await this.run(connection, steps);
    }
    static async executeUpdate(connection, input) {
        const steps = Update_1.buildUpdateSteps(input);
        await this.run(connection, steps);
    }
}
exports.Crud = Crud;
//# sourceMappingURL=Crud.js.map