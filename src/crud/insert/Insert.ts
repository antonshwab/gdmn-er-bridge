import { Entity, Attribute, } from "gdmn-orm";
import { AConnection } from "gdmn-db";

// export interface IInsertData {
//   entity: Entity;
//   linkedEntity?: Entity;
//   datums: IDatum[];
// }

export interface IInsertData {
  entity: Entity;
  next?: IInsertData;
  datums: IDatum[];
}

export interface IInsertData {
  entity: Entity;
  datums: IDatum[];
  linkTo?: {
    entity: Entity;
    datums: IDatum[];
  }
}

// example for Set Attribute:

// хочется чтобы appEntity тоже само знало (как userEntity c SetAttribute)
// о SetAttribute

insertData = {
  entity: appEntity,
  linked: [
    {
      entity: linkedEntity,
      datums: //  for crosstable primary keys of linkedEntity and [some attributes]
    }
  ]
}

// Data for inserting application:
// 1. data for application
// 2. data for linked Entities (to update cross table):
//   a. primary keys with values
//   b. other attributes for cross table

insertData = {
  entity: appEntity,
  datums: datums,
  linkedEntities?: [{       // Inside SQLBuilder get name for cross table
    entity: userEntity,
    primaryKeysValues: [id],
    crossTableAttrValues: ['alias', 'shmalias']
  }]
}

export interface IDatum {
  attribute: Attribute;
  value: any;
}

class SQLInsertBuilder {
  private readonly _insertData: IInsertData;

  constructor(insertData: IInsertData) {
    this._insertData = insertData;
  }

  build(): { sql: string, params: {} } {
    const { entity, next, datums, } = this._insertData;
    //


    if (next === undefined) {
      // Case 1. Only Scalar attribute
      // Case 2. Only Scalar attribute or Entity attribute
      const tableName = entity.name;

      const attributesNames = datums.map((d: IDatum) => d.attribute.name);
      const valuesPlaceholders = attributesNames.map((attr) => `:${attr}`);
      const values = datums.map((d: IDatum) => d.value);
      const params = attributesNames.reduce((acc, currName, currIndex) => {
        return { ...acc, [currName]: values[currIndex] };
      }, {});
      const sql = `
        INSERT INTO ${tableName} (${attributesNames})
        VALUES (${valuesPlaceholders})`;
      console.log("sql: ", sql);
      console.log("params: ", params);
      return { sql, params };

    } else {
      // Cases: SetAttribute | DetailAttribute
      return { sql: " ", params: {} };
    }
  }
}

export abstract class Insert {
  // 1. add (with datums) app to applications. Returning ID
  // 2. get crosstable name from entityWithSetAttribute.adapter.name
  // 3. get ID from user
  // 4. add to crossTable KEY1 = userID, KEY2 = appID, ALIAS =

  public static async execute(
    connection: AConnection,
    insertData: IInsertData): Promise<void> {

    const { sql, params, } = new SQLInsertBuilder(insertData).build();

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

}
