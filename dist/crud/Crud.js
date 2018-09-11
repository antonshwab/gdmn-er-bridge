"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const gdmn_db_1 = require("gdmn-db");
const UpdateOrInsert_1 = require("./UpdateOrInsert");
const Update_1 = require("./Update");
const Insert_1 = require("./Insert");
const Delete_1 = require("./Delete");
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
    static async returningRun(connection, steps) {
        const [returningStep, ...thunks] = steps;
        const result = await gdmn_db_1.AConnection.executeTransaction({
            connection,
            callback: async (transaction) => {
                const { sql, params } = returningStep;
                const result = await connection.executeReturning(transaction, sql, params);
                console.log("RETURNING id");
                return result;
            }
        });
        const id = result.getNumber("ID");
        const normalized = thunks
            .reduce((acc, thunk) => {
            return [...acc, ...thunk(id)];
        }, []);
        await gdmn_db_1.AConnection.executeTransaction({
            connection,
            callback: async (transaction) => {
                for (const { sql, params } of normalized) {
                    await connection.execute(transaction, sql, params);
                }
            }
        });
        return id;
    }
    static async executeInsert(connection, input) {
        const steps = Insert_1.buildInsertSteps(input);
        return await this.returningRun(connection, steps);
        // const [returningStep, ...restSteps] = buildInsertSteps(input);
        // const id = await this.runReturning(connection, returningStep);
        // await this.run(connection, id, restSteps);
        // return id;
    }
    static async executeUpdateOrInsert(connection, input) {
        const steps = UpdateOrInsert_1.buildUpdateOrInsertSteps(input);
        await this.run(connection, steps);
    }
    static async executeUpdate(connection, input) {
        const steps = Update_1.buildUpdateSteps(input);
        await this.run(connection, steps);
    }
    static async executeDelete(connection, input) {
        const steps = Delete_1.buildDeleteSteps(input);
        await this.run(connection, steps);
    }
}
exports.Crud = Crud;
//# sourceMappingURL=Crud.js.map