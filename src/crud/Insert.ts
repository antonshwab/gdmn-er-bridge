import { Entity } from "gdmn-orm";
import { Constants } from "../ddl/Constants";
import { groupAttrsValuesByType } from "./common";
import { Step, IInsert, IScalarAttrValue, IEntityAttrValue, ISetAttrValue, IDetailAttrValue, Scalar } from "./Crud";
import _ from "lodash";

export type SetsThunk = (crossPKOwn: number) => Step[];
export type DetailsThunk = (masterKey: number) => Step[];

export function buildInsertSteps(input: IInsert): {
  returningStep: Step,
  setAttrsValuesThunk: SetsThunk,
  detailAttrsValuesThunk: DetailsThunk
} {
  const { entity, attrsValues } = input;

  const {
    scalarAttrsValues,
    entityAttrsValues,
    setAttrsValues,
    detailAttrsValues
  } = groupAttrsValuesByType(attrsValues);

  if (scalarAttrsValues.length === 0 && entityAttrsValues.length === 0) {
    throw new Error("Must be at least one scalar or entity attribute");
  }

  const returningStep = makeReturningIDsStep(entity, scalarAttrsValues, entityAttrsValues);

  const setAttrsValuesThunk = (crossPKOwn: number) => {
    return makeSetAttrsSteps(crossPKOwn, setAttrsValues);
  };

  const detailAttrsValuesThunk = (masterKey: number) => {
    return makeDetailAttrsSteps(masterKey, detailAttrsValues);
  };

  return {
    returningStep,
    setAttrsValuesThunk,
    detailAttrsValuesThunk
  };
}


function makeSQLInsert(table: string,
  attrsNames: string[], placeholders: string[]): string {

  const attrsNamesString = attrsNames.join(", ");
  const placeholdersString = placeholders.join(", ");
  return `INSERT INTO ${table} (${attrsNamesString}) VALUES (${placeholdersString})`;
}


function makeSQLInsertReturningID(table: string,
  attrsNames: string[], placeholders: string[]): string {

  const attrsNamesString = attrsNames.join(", ");
  const placeholdersString = placeholders.join(", ");
  return `INSERT INTO ${table} (${attrsNamesString}) VALUES (${placeholdersString}) RETURNING ID`;
}


function makeDetailAttrsSteps(masterKeyValue: number,
  detailAttrsValues: IDetailAttrValue[]): Step[] {

  const steps = detailAttrsValues.map(currDetailAttrValues => {
    const currDetailAttr = currDetailAttrValues.attribute;
    const [detailEntity] = currDetailAttr.entities;

    const detailRelation = currDetailAttr.adapter ?
      currDetailAttr.adapter.masterLinks[0].detailRelation :
      detailEntity.attribute.name;

    const link2masterField = currDetailAttr.adapter ?
      currDetailAttr.adapter.masterLinks[0].link2masterField :
      Constants.DEFAULT_MASTER_KEY_NAME;


    const parts = currDetailAttrValues.pks.map((pk: Scalar[], pkIndex) => {

      const pKeyNames = detailEntity.pk.map(k => k.name);
      const sqlPart = pKeyNames
        .map(name => `${name} = :${name}${pkIndex}`)
        .join(" AND ");

      const params = pKeyNames.reduce((acc, currName, currIndex) => {
        return { ...acc, [`${currName}${pkIndex}`]: pk[currIndex] };
      }, {});

      return { sqlPart, params };
    });

    const whereParams = parts.reduce((acc, part) => {
      return { ...acc, ...part.params };
    }, {});
    const whereSQL = parts.map(part => part.sqlPart).join(" OR ");
    const sql = `UPDATE ${detailRelation} SET ${link2masterField} = (${masterKeyValue}) WHERE ${whereSQL}`;
    const step = { sql, params: whereParams };
    return step;
  });

  return steps;
}


function makeSetAttrsSteps(crossPKOwn: number, setAttrsValues: ISetAttrValue[]): Step[] {

  const steps = setAttrsValues.map(currSetAttrValue => {

    const { crossValues, refIDs } = currSetAttrValue;

    const innerSteps = refIDs.map((currRefID, index) => {

      const currValues = crossValues[index] || [];

      const restCrossAttrsParams = currValues.reduce((acc, curr: IScalarAttrValue) => {
        return { ...acc, [curr.attribute.name]: curr.value };
      }, {});

      const params = {
        [Constants.DEFAULT_CROSS_PK_OWN_NAME]: crossPKOwn,
        [Constants.DEFAULT_CROSS_PK_REF_NAME]: currRefID,
        ...restCrossAttrsParams
      };

      const attrsNames = Object.keys(params);
      const placeholders = attrsNames.map(name => `:${name}`);

      let crossTableName;
      if (currSetAttrValue.attribute.adapter) {
        crossTableName = currSetAttrValue.attribute.adapter.crossRelation;
      } else {
        crossTableName = currSetAttrValue.attribute.name;
      }

      const sql = makeSQLInsert(crossTableName, attrsNames, placeholders);
      const step = { sql, params };
      return step;
    });

    return innerSteps;

  });

  const flatten = _.flatten(steps);
  console.log("SetAttrsSteps: ", flatten);
  return flatten;
}


function makeReturningIDsStep(entity: Entity,
  scalarAttrsValues: IScalarAttrValue[],
  entityAttrsValues: IEntityAttrValue[]): Step {

  const scalarAttrsValuesParams = scalarAttrsValues.reduce((acc, curr) => {
    return { ...acc, [curr.attribute.name]: curr.value };
  }, {});


  const entityAttrsValuesParams = entityAttrsValues.reduce((acc, curr) => {
    return { ...acc, [curr.attribute.name]: curr.values[0] };
  }, {});

  const params = { ...scalarAttrsValuesParams, ...entityAttrsValuesParams };
  const attrsNames = Object.keys(params);
  const placehodlers = attrsNames.map(name => `:${name}`);
  const sql = makeSQLInsertReturningID(entity.name, attrsNames, placehodlers);
  const step = { sql, params };
  return step;
}
