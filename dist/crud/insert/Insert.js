"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const gdmn_db_1 = require("gdmn-db");
class SQLInsertBuilder {
    constructor(insertData) {
        this._insertData = insertData;
    }
    build() {
        const { entity, next, datums, } = this._insertData;
        if (next === undefined) {
            // Case 1. Only Scalar attribute
            // Case 2. Only Scalar attribute or Entity attribute
            const tableName = entity.name;
            const attributesNames = datums.map((d) => d.attribute.name);
            const valuesPlaceholders = attributesNames.map((attr) => `:${attr}`);
            const values = datums.map((d) => d.value);
            const params = attributesNames.reduce((acc, currName, currIndex) => {
                return { ...acc, [currName]: values[currIndex] };
            }, {});
            const sql = `
        INSERT INTO ${tableName} (${attributesNames})
        VALUES (${valuesPlaceholders})`;
            console.log("sql: ", sql);
            console.log("params: ", params);
            return { sql, params };
        }
        else {
            // Cases: SetAttribute | DetailAttribute
            return { sql: " ", params: {} };
        }
    }
}
class Insert {
    // 1. add (with datums) app to applications. Returning ID
    // 2. get crosstable name from entityWithSetAttribute.adapter.name
    // 3. get ID from user
    // 4. add to crossTable KEY1 = userID, KEY2 = appID, ALIAS =
    static async execute(connection, insertData) {
        const { sql, params, } = new SQLInsertBuilder(insertData).build();
        await gdmn_db_1.AConnection.executeTransaction({
            connection,
            callback: async (transaction) => {
                await connection.execute(transaction, sql, params);
            }
        });
    }
}
exports.Insert = Insert;
//# sourceMappingURL=Insert.js.map