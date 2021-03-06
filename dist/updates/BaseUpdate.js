"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const gdmn_db_1 = require("gdmn-db");
class BaseUpdate {
    constructor(connection) {
        this._connection = connection;
    }
    async _executeTransaction(callback) {
        return await gdmn_db_1.AConnection.executeTransaction({
            connection: this._connection,
            callback: callback
        });
    }
    async _updateDatabaseVersion(transaction) {
        await this._connection.execute(transaction, `
      UPDATE OR INSERT INTO AT_DATABASE (ID, VERSION)
      VALUES (1, :version)
      MATCHING (ID)
    `, {
            version: this.version
        });
    }
}
exports.BaseUpdate = BaseUpdate;
//# sourceMappingURL=BaseUpdate.js.map