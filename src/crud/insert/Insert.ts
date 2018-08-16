import { Entity, Attribute, } from "gdmn-orm";
import { AConnection } from "gdmn-db";

export interface IDatum {
  attribute: Attribute;
  value: any;
}

class SQLInsertBuilder {
  private readonly _entity: Entity;
  // private readonly _dbStructure: DBStructure;
  private readonly _datums: IDatum[];

  constructor(entity: Entity, datums: IDatum[]) {
    this._entity = entity;
    // this._dbStructure = dbStructure;
    this._datums = datums;
  }

  build(): { sql: string, params: {} } {
    const tableName = this._entity.name;

    const attributesNames = this._datums.map((d: IDatum) => d.attribute.name);
    const valuesPlaceholders = attributesNames.map((attr) => `:${attr}`);

    const values = this._datums.map((d: IDatum) => d.value);
    const params = attributesNames.reduce((acc, currName, currIndex) => {
      return { ...acc, [currName]: values[currIndex] };
    }, {});

    const sql = `INSERT INTO ${tableName} (${attributesNames})
VALUES (${valuesPlaceholders})`;

    console.log("Table Name: ", tableName);
    console.log("sql: ", sql);
    console.log("params: ", params);

    return { sql, params };
  }
}

export abstract class Insert {

  public static async execute(
    connection: AConnection,
    entity: Entity,
    datums: IDatum[]): Promise<void> {

    const { sql, params, } = new SQLInsertBuilder(entity, datums).build();

    // TODO: catch exception from database

    await AConnection.executeTransaction({
      connection,
      callback: async (transaction) => {
        await connection.execute(
          transaction,
          sql,
          params
        );
      }
    });
  }

  // public static async execute(
  //   connection: AConnection,
  //   entity1: Entity,
  //   entity2: Entity,
  //   datums: IDatum[]): Promise<void> {

  // }

  {

}

}
