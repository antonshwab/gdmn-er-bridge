import { Entity, SetAttribute, DetailAttribute, ScalarAttribute, EntityAttribute, } from "gdmn-orm";
import { AConnection, ATransaction } from "gdmn-db";
import { buildUpdateOrInsertSteps } from "./UpdateOrInsert";
import { buildUpdateSteps } from "./Update";
import { buildInsertSteps } from "./Insert";
import { buildDeleteSteps } from "./Delete";
import _ from "lodash";

export type Scalar = string | boolean | number | Date | null;

export interface IScalarAttrValue {
  attribute: ScalarAttribute;
  value: Scalar;
}

export interface IEntityAttrValue {
  attribute: EntityAttribute;
  values: Scalar[];
}

// Set attribute (add applications to user).
// insert in cross table:
// (userId, appID, alias, another_column, ...)
// (1, 12, alias1, anothercrosscolumnvalue1, ...)
// (1, 23, alias2, anothercrosscolumnvalue2, ...)
// const setAttrValue = {
//   attribute,
//   crossValues: [["alias1", "anothercrosscolumnvalue1"], ["alias2", "anothercrosscolumnvalue2"], ...]
//   refIDs: [12, 13]
// };

export interface ISetAttrValue {
  attribute: SetAttribute;
  crossValues: IScalarAttrValue[][];
  currRefIDs?: number[]; // only for Update to define which exactly records should update
  refIDs: number[];
}

export interface IDetailAttrValue {
  attribute: DetailAttribute;
  pks: Scalar[][];
}

export interface IAttrsValuesByType {
  scalarAttrsValues: IScalarAttrValue[];
  entityAttrsValues: IEntityAttrValue[];
  detailAttrsValues: IDetailAttrValue[];
  setAttrsValues: ISetAttrValue[];
}

export type AttrsValues = Array<
  IScalarAttrValue | IEntityAttrValue | ISetAttrValue | IDetailAttrValue>;

export interface IInsert {
  entity: Entity;
  attrsValues: AttrsValues;
}

export interface IUpdate extends IInsert {
  pk: any[];
}

export interface IUpdateOrInsert extends IInsert {
  pk?: any[];
}

export interface IDelete {
  pk: any[];
  entity: Entity;
}

export type Step = { sql: string, params: {} };

async function executeNestedSteps(
  connection: AConnection,
  transaction: ATransaction,
  nestedSteps: Step[][]): Promise<void> {

  if (_.flatten(nestedSteps).length > 0) {
    for (const setSteps of nestedSteps) {
      const generalSQL = setSteps[0].sql;
      const statement = await connection.prepare(transaction, generalSQL);
      for (const { params } of setSteps) {
        await statement.execute(params);
      }
    }
  }
}

export abstract class Crud {

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

  public static async executeInsert(
    connection: AConnection,
    input: IInsert | Array<IInsert>
  ): Promise<number[]> {

    // normalize input
    const insertDatoms = Array.isArray(input) ? input : [input];
    // build steps
    const nestedSteps = insertDatoms.map(d => buildInsertSteps(d));
    // run steps

    const returningSteps = nestedSteps.map(({ returningStep }) => returningStep);
    const returningSQL = returningSteps[0].sql;
    const returningNestedParams = returningSteps.map(({ params }) => params);

    const ids = await AConnection.executeTransaction({
      connection,
      callback: async (transaction) => {

        const returningStatement = await connection.prepare(transaction, returningSQL);
        const ids = await Promise.all(
          returningNestedParams.map(async (params) => {
            const result = await returningStatement.executeReturning(params);
            return result.getNumber("ID");
          })
        );

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

  public static async executeUpdateOrInsert(
    connection: AConnection,
    input: IUpdateOrInsert | Array<IUpdateOrInsert>): Promise<Array<number>> {

    // ==================
    // NORMALIZE:
    const insertOrUpdateDatoms = Array.isArray(input) ? input : [input];

    // PREPARE to BUILD STEPS:
    const datomsWithPK = insertOrUpdateDatoms.filter(d => d.pk);

    // BUILD and RUN  STEPS for withPK part
    const nestedSteps = datomsWithPK.map(d => buildUpdateOrInsertSteps(d));

    console.log("nestedSteps: ", nestedSteps);
    const flattenSteps = _.flatten(nestedSteps);
    await AConnection.executeTransaction({
      connection,
      callback: async (transaction) => {
        for (const { sql, params } of flattenSteps) {
          await connection.executeReturning(
            transaction,
            sql,
            params
          );
        }
      },
    });

    // BUILD and RUN STEPS for withoutPK part
    const datomsWithoutPK = insertOrUpdateDatoms.filter(d => !d.pk);
    if (datomsWithoutPK.length > 0) {
      const ids = await Crud.executeInsert(connection, datomsWithoutPK as IInsert[]);
      return ids;
    }

    return [];
  }

  public static async executeUpdate(
    connection: AConnection,
    input: IUpdate | IUpdate[]
  ): Promise<void> {

    // NORMALIZE:
    const datoms = Array.isArray(input) ? input : [input];

    // BUILD and RUN STEPS
    const nestedSteps = datoms.map(d => buildUpdateSteps(d));
    console.log("BUILD UPDATE STEPS: ", nestedSteps);
    const flattenSteps = _.flatten(nestedSteps);
    await AConnection.executeTransaction({
      connection,
      callback: async (transaction) => {
        for (const { sql, params } of flattenSteps) {
          await connection.executeReturning(
            transaction,
            sql,
            params
          );
        }
      },
    });
  }

  public static async executeDelete(
    connection: AConnection,
    input: IDelete | IDelete[]
  ): Promise<void> {

    // NORMALIZE
    const datoms = Array.isArray(input) ? input : [input];

    // BUILD AND RUN STEPS
    const nestedSteps = datoms.map(d => buildDeleteSteps(d));
    console.log("delete steps: ", nestedSteps);
    const flattenSteps = _.flatten(nestedSteps);
    await AConnection.executeTransaction({
      connection,
      callback: async (transaction) => {
        for (const { sql, params } of flattenSteps) {
          await connection.execute(transaction, sql, params);
        }
      }
    });

  }
}
