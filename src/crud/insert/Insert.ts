import { Entity, SetAttribute, DetailAttribute, IAttributes, IAttribute, Attribute, ScalarAttribute, EntityAttribute, } from "gdmn-orm";
import { AConnection } from "gdmn-db";
import { Constants } from "../../ddl/Constants";

type Scalar = string | boolean | number | Date | null;

interface IValue<AttrType extends Attribute, valueType> {
  attribute: AttrType;
  value: valueType;
}

interface ISetValue extends IValue<SetAttribute, Scalar[]> {
  setValues: Array<IValue<ScalarAttribute, Scalar>>;
}

interface IUpdate extends IInsert {
  pk: any[];
}

interface IInsertOrUpdate extends IInsert {
  pk?: any[];
}

interface IInsert {
  entity: Entity;
  values: Array<IValue<ScalarAttribute, Scalar>
  | IValue<EntityAttribute, Scalar[]>
  | IValue<DetailAttribute, Scalar[][]>
  | ISetValue>;
}

interface IDelete {
  pk: any[];
  entity: Entity;
}

interface IAttributesGroups {
  scalarGroup: Array<IValue<ScalarAttribute, Scalar>>,
  entityGroup: Array<IValue<EntityAttribute, Scalar[]>>,
  detailGroup: Array<IValue<DetailAttribute, Scalar[][]>>,
  setGroup: Array<ISetValue>
};

type Step = { sql: string, params: {} };

class SQLInsertBuilder {
  // TODO: make batch insert, insertOrUpdate, update, delete (use statement for optimization)
  // TODO: rename SometingGroup to SomethingAttrs
  // TODO: refactor building sql and params (make like in set)
  // TODO: replace reduce with maps where possible

  private readonly _input: IInsert;

  constructor(input: IInsert) {
    this._input = input;
  }

  private _interpolateSQLInsert(tableName: string, valuesNames: any[], valuesPlaces: any[]): string {
    return `INSERT INTO ${tableName} (${valuesNames}) VALUES (${valuesPlaces})`;
  }

  private _makeStepsFromGroups(entity: Entity, groups: IAttributesGroups) {
    const { scalarGroup, entityGroup, detailGroup, setGroup } = groups;

    const scalarAndEntityGroup = [...scalarGroup, ...entityGroup];
    const scalarAndEntityNames = scalarAndEntityGroup.map((v) => v.attribute.name);
    const scalarAndEntityValuesPlaces = scalarAndEntityNames.map((name) => `:${name}`);
    const scalarAndEntityParams = scalarAndEntityGroup.reduce((acc, currValue) => {
      return { ...acc, [currValue.attribute.name]: currValue.value };
    }, {});
    const scalarAndEntitySql = this._interpolateSQLInsert(
      entity.name,
      scalarAndEntityNames,
      scalarAndEntityValuesPlaces
    );
    const scalarAndEntityStep = { sql: scalarAndEntitySql, params: scalarAndEntityParams };

    // setGroup
    // Action: insert to crossTable
    // Need crossTableName, key1 (ownerId), key2(refId), [...rest attributes]

    const setSteps = setGroup.map((currSet) => {
      const { attribute, setValues } = currSet;

      // make params
      const restCrossTableAttrsParams = setValues.reduce((acc, currValue) => {
        return { ...acc, [currValue.attribute.name]: currValue.value };
      }, {});
      const crossPKOwnValue = `(SELECT FIRST 1 ID FROM ${entity.name} ORDER BY ID DESC)`;
      const [crossPKRefValue] = currSet.value;
      const params = {
        [Constants.DEFAULT_CROSS_PK_OWN_NAME]: crossPKOwnValue,
        [Constants.DEFAULT_CROSS_PK_REF_NAME]: crossPKRefValue,
        ...restCrossTableAttrsParams
      };

      // make sql
      const crossTableAttrsNames = Object.keys(params);
      const crossTableAttrsValuesPlaces = crossTableAttrsNames.map((name) => `:${name}`);
      const crossTableName = attribute.adapter ? attribute.adapter!.crossRelation : attribute.name;
      const sql = this._interpolateSQLInsert(crossTableName, crossTableAttrsNames, crossTableAttrsValuesPlaces);

      const step: Step = { sql, params };
      return step;
    });

    // detailSteps
    //
    const detailSteps = detailGroup.map((currDetail) => {
      const { attribute, value } = currDetail;
      const defaultMasterLinks = [{
        detailRelation: attribute.name,
        link2masterField: Constants.DEFAULT_MASTER_KEY_NAME
      }];
      const { detailRelation, link2masterField } = attribute.adapter ? attribute.adapter!.masterLinks : defaultMasterLinks;





    });


    return [scalarAndEntityStep, ...setSteps, ...detailSteps];
  }

  build(): Step[] {
    const { entity, values } = this._input;

    const groupsAcc: IAttributesGroups = {
      scalarGroup: [],
      entityGroup: [],
      detailGroup: [],
      setGroup: []
    };

    const groups = values.reduce((acc: IAttributesGroups, currValue) => {
      if (ScalarAttribute.isType(currValue.attribute)) {
        const newScalarGroup = [...acc.scalarGroup, currValue as IValue<ScalarAttribute, Scalar>];
        return {
          ...acc,
          scalarGroup: newScalarGroup
        };
      }

      if (EntityAttribute.isType(currValue.attribute)) {
        const newEntityGroup = [...acc.entityGroup, currValue as IValue<EntityAttribute, Scalar[]>];
        return {
          ...acc,
          entityGroup: newEntityGroup
        };
      }

      if (DetailAttribute.isType(currValue.attribute)) {
        const newDetailGroup = [...acc.detailGroup, currValue as IValue<DetailAttribute, Scalar[][]>];
        return {
          ...acc,
          detailGroup: newDetailGroup
        };
      }

      if (SetAttribute.isType(currValue.attribute)) {
        const newSetAttribute = [...acc.setGroup, currValue as ISetValue];
        return {
          ...acc,
          setGroup: newSetAttribute
        };
      }

      throw new Error("Unknow attribute type");

    }, groupsAcc);

    console.log(groupsAcc);

    const steps = this._makeStepsFromGroups(entity, groups);

    return steps;
  }

}

export abstract class Crud {

  public static async executeInsert(
    connection: AConnection,
    input: IInsert
  ): Promise<void> {

    const steps = new SQLInsertBuilder(input).build();

    await AConnection.executeTransaction({
      connection,
      callback: async (transaction) => {
        for (const { sql, params } of steps) {
          await connection.execute(
            transaction,
            sql,
            params
          );
        }
      }
    });
  }

  // public static async executeUpdate(
  //   connection: AConnection,
  //   input: IUpdate
  // ): Promise<void> {

  // }

  // public static async executeInsertOrUpdate(
  //   connection: AConnection,
  //   input: IInsertOrUpdate
  // ): Promise<void> {

  // }

  // public static async executeDelete(
  //   connection: AConnection,
  //   input: IDelete
  // ): Promise<void> {

  // }

}
