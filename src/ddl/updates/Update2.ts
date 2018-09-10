import {DDLHelper} from "../builder/DDLHelper";
import {Constants} from "../Constants";
import {BaseUpdate} from "./BaseUpdate";

export class Update2 extends BaseUpdate {

  protected _version: number = 2;
  protected _description: string = "Обновление для бд Гедымина, включающее поддержку gdmn web";

  public async run(): Promise<void> {
    await this._executeTransaction(async (transaction) => {
      const ddlHelper = new DDLHelper(this._connection, transaction);
      await ddlHelper.addSequence(Constants.GLOBAL_DDL_GENERATOR);

      await ddlHelper.prepare();
      try {
        await ddlHelper.addTable("AT_DATABASE", [
          {name: "ID", domain: "DINTKEY"},
          {name: "VERSION", domain: "DINTKEY"}
        ]);
        await ddlHelper.addPrimaryKey("AT_PK_DATABASE", "AT_DATABASE", ["ID"]);

        await ddlHelper.addColumns("AT_RELATION_FIELDS", [
          {name: "ATTRNAME", domain: "DFIELDNAME"}
        ]);
      } finally {
        await ddlHelper.dispose();
      }
    });

    await this._executeTransaction((transaction) => this._updateDatabaseVersion(transaction));
  }
}
