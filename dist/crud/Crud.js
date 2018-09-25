"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const gdmn_db_1 = require("gdmn-db");
const UpdateOrInsert_1 = require("./UpdateOrInsert");
const Update_1 = require("./Update");
const Insert_1 = require("./Insert");
// import { buildDeleteSteps } from "./Delete";
const lodash_1 = __importDefault(require("lodash"));
const Delete_1 = require("./Delete");
async function executeNestedSteps(connection, transaction, nestedSteps) {
    if (lodash_1.default.flatten(nestedSteps).length > 0) {
        for (const setSteps of nestedSteps) {
            const generalSQL = setSteps[0].sql;
            const statement = await connection.prepare(transaction, generalSQL);
            for (const { params } of setSteps) {
                await statement.execute(params);
            }
        }
    }
}
class Crud {
    // private static async run(connection: AConnection, steps: Step[]): Promise<void> {
    //   await AConnection.executeTransaction({
    //     connection,
    //     callback: async (transaction) => {
    //       for (const { sql, params } of steps) {
    //         await connection.executeReturning(
    //           transaction,
    //           sql,
    //           params
    //         );
    //       }
    //     },
    //   });
    // }
    // private static async returningRun(connection: AConnection, steps: Array<Step | setsThunk | detailsThunk>): Promise<number> {
    //   const [returningStep, ...thunks] = steps;
    //   const result = await AConnection.executeTransaction({
    //     connection,
    //     callback: async (transaction) => {
    //       const { sql, params } = returningStep as Step;
    //       const result = await connection.executeReturning(transaction, sql, params);
    //       return result;
    //     }
    //   });
    //   const id = result.getNumber("ID");
    //   const normalized = (thunks as Array<setsThunk | detailsThunk>)
    //     .reduce((acc: Step[], thunk) => {
    //       return [...acc, ...thunk(id)]
    //     }, []);
    //   await AConnection.executeTransaction({
    //     connection,
    //     callback: async (transaction) => {
    //       for (const { sql, params } of normalized) {
    //         await connection.execute(transaction, sql, params);
    //       }
    //     }
    //   });
    //   return id;
    // }
    static async executeInsert(connection, input) {
        // normalize input
        const insertDatoms = Array.isArray(input) ? input : [input];
        // build steps
        const nestedSteps = insertDatoms.map(d => Insert_1.buildInsertSteps(d));
        // run steps
        const returningSteps = nestedSteps.map(({ returningStep }) => returningStep);
        const returningSQL = returningSteps[0].sql;
        const returningNestedParams = returningSteps.map(({ params }) => params);
        const ids = await gdmn_db_1.AConnection.executeTransaction({
            connection,
            callback: async (transaction) => {
                const returningStatement = await connection.prepare(transaction, returningSQL);
                const ids = await Promise.all(returningNestedParams.map(async (params) => {
                    const result = await returningStatement.executeReturning(params);
                    return result.getNumber("ID");
                }));
                const setsNestedSteps = nestedSteps.map(({ setAttrsValuesThunk }, currIndex) => setAttrsValuesThunk(ids[currIndex]));
                await executeNestedSteps(connection, transaction, setsNestedSteps);
                const detailsNestedSteps = nestedSteps.map(({ detailAttrsValuesThunk }, currIndex) => detailAttrsValuesThunk(ids[currIndex]));
                console.log("detailsNestedSteps: ", detailsNestedSteps);
                await executeNestedSteps(connection, transaction, detailsNestedSteps);
                return ids;
            }
        });
        return ids;
    }
    static async executeUpdateOrInsert(connection, input) {
        // ==================
        // NORMALIZE:
        const insertOrUpdateDatoms = Array.isArray(input) ? input : [input];
        // PREPARE to BUILD STEPS:
        const datomsWithPK = insertOrUpdateDatoms.filter(d => d.pk);
        // BUILD and RUN  STEPS for withPK part
        const nestedSteps = datomsWithPK.map(d => UpdateOrInsert_1.buildUpdateOrInsertSteps(d));
        console.log("nestedSteps: ", nestedSteps);
        const flattenSteps = lodash_1.default.flatten(nestedSteps);
        await gdmn_db_1.AConnection.executeTransaction({
            connection,
            callback: async (transaction) => {
                for (const { sql, params } of flattenSteps) {
                    await connection.executeReturning(transaction, sql, params);
                }
            },
        });
        // BUILD and RUN STEPS for withoutPK part
        const datomsWithoutPK = insertOrUpdateDatoms.filter(d => !d.pk);
        if (datomsWithoutPK.length > 0) {
            const ids = await Crud.executeInsert(connection, datomsWithoutPK);
            return ids;
        }
        return [];
    }
    static async executeUpdate(connection, input) {
        // NORMALIZE:
        const datoms = Array.isArray(input) ? input : [input];
        // BUILD and RUN STEPS
        const nestedSteps = datoms.map(d => Update_1.buildUpdateSteps(d));
        console.log("BUILD UPDATE STEPS: ", nestedSteps);
        const flattenSteps = lodash_1.default.flatten(nestedSteps);
        await gdmn_db_1.AConnection.executeTransaction({
            connection,
            callback: async (transaction) => {
                for (const { sql, params } of flattenSteps) {
                    await connection.executeReturning(transaction, sql, params);
                }
            },
        });
    }
    static async executeDelete(connection, input) {
        // NORMALIZE
        const datoms = Array.isArray(input) ? input : [input];
        // BUILD AND RUN STEPS
        const nestedSteps = datoms.map(d => Delete_1.buildDeleteSteps(d));
        console.log("delete steps: ", nestedSteps);
        const flattenSteps = lodash_1.default.flatten(nestedSteps);
        await gdmn_db_1.AConnection.executeTransaction({
            connection,
            callback: async (transaction) => {
                for (const { sql, params } of flattenSteps) {
                    await connection.execute(transaction, sql, params);
                }
            }
        });
    }
}
exports.Crud = Crud;
//# sourceMappingURL=Crud.js.map