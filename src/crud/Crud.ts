import { Entity, SetAttribute, DetailAttribute, Attribute, ScalarAttribute, EntityAttribute, } from "gdmn-orm";
import { AConnection } from "gdmn-db";
import { buildUpdateOrInsertSteps } from "./UpdateOrInsert";
import { buildUpdateSteps } from "./Update";
import { buildInsertSteps } from "./Insert";
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

  public static async executeInsert(
    connection: AConnection,
    input: IInsert
  ): Promise<void> {

    const steps = buildInsertSteps(input);
    await this.run(connection, steps);
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
