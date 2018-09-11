import { Entity, SetAttribute, DetailAttribute, Attribute, ScalarAttribute, EntityAttribute, } from "gdmn-orm";
import { AConnection } from "gdmn-db";
import { buildUpdateOrInsertSteps } from "./UpdateOrInsert";
import { buildUpdateSteps } from "./Update";
import { buildInsertSteps, setsThunk, detailsThunk } from "./Insert";
import { buildDeleteSteps } from "./Delete";

export type Scalar = string | boolean | number | Date | null;

export interface IValue<AttrType extends Attribute, valueType> {
  attribute: AttrType;
  value: valueType;
}

export interface ISetValue extends IValue<SetAttribute, Scalar[]> {
  setValues: Array<IValue<ScalarAttribute, Scalar>>;
}

export interface IUpdate extends IInsert {
  pk: any[];
}

export interface IUpdateOrInsert extends IInsert {
  pk?: any[];
}

export type Values = Array<IValue<ScalarAttribute, Scalar>
  | IValue<EntityAttribute, Scalar[]>
  | IValue<DetailAttribute, Scalar[][]>
  | ISetValue>;

export interface IInsert {
  entity: Entity;
  values: Values;
}

export interface IDelete {
  pk: any[];
  entity: Entity;
}

export interface IAttributesByType {
  scalars: Array<IValue<ScalarAttribute, Scalar>>,
  entities: Array<IValue<EntityAttribute, Scalar[]>>,
  details: Array<IValue<DetailAttribute, Scalar[][]>>,
  sets: Array<ISetValue>
};

export type Step = { sql: string, params: {} };

export abstract class Crud {

  private static async run(connection: AConnection, steps: Step[]): Promise<void> {
    await AConnection.executeTransaction({
      connection,
      callback: async (transaction) => {
        for (const { sql, params } of steps) {
          await connection.executeReturning(
            transaction,
            sql,
            params
          );
        }
      },
    });
  }

  public static async returningRun(connection: AConnection, steps: Array<Step | setsThunk | detailsThunk>): Promise<number> {

    const [returningStep, ...thunks] = steps;

    const result = await AConnection.executeTransaction({
      connection,
      callback: async (transaction) => {
        const { sql, params } = returningStep as Step;
        const result = await connection.executeReturning(transaction, sql, params);
        console.log("RETURNING id");
        return result;
      }
    });

    const id = result.getNumber("ID");

    const normalized = (thunks as Array<setsThunk | detailsThunk>)
      .reduce((acc: Step[], thunk) => {
        return [...acc, ...thunk(id)]
      }, []);

    await AConnection.executeTransaction({
      connection,
      callback: async (transaction) => {
        for (const { sql, params } of normalized) {
          await connection.execute(transaction, sql, params);
        }
      }
    });

    return id;
  }

  public static async executeInsert(
    connection: AConnection,
    input: IInsert
  ): Promise<number> {

    const steps = buildInsertSteps(input);
    return await this.returningRun(connection, steps);

    // const [returningStep, ...restSteps] = buildInsertSteps(input);
    // const id = await this.runReturning(connection, returningStep);
    // await this.run(connection, id, restSteps);
    // return id;
  }

  public static async executeUpdateOrInsert(
    connection: AConnection,
    input: IUpdateOrInsert): Promise<void> {

    const steps = buildUpdateOrInsertSteps(input);
    await this.run(connection, steps);
  }

  public static async executeUpdate(
    connection: AConnection,
    input: IUpdate
  ): Promise<void> {

    const steps = buildUpdateSteps(input);
    await this.run(connection, steps);
  }

  public static async executeDelete(
    connection: AConnection,
    input: IDelete
  ): Promise<void> {

    const steps = buildDeleteSteps(input);
    await this.run(connection, steps);
  }
}
