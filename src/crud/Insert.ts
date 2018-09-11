import { Entity, DetailAttribute, ScalarAttribute, EntityAttribute } from "gdmn-orm";
import { Constants } from "../ddl/Constants";
import { groupAttrsValuesByType } from "./common";
import { IInsert, Step, ISetValue, Scalar, IValue } from "./Crud";

export type setsThunk = (crossPKOwnValue: number) => Step[];
export type detailsThunk = (masterKeyValue: number) => Step[];

export function buildInsertSteps(input: IInsert): Array<Step | setsThunk | detailsThunk> {
  const { entity, values } = input;

  const { scalars, entities, sets, details } = groupAttrsValuesByType(values);

  const returningStep = makeScalarsEntitiesStep(entity, scalars, entities);

  const setsThunk = (crossPKOwnValue: number) => {
    return makeSetsSteps(crossPKOwnValue, sets);
  };

  const detailsThunk = (masterKeyValue: number) => {
    return makeDetailsSteps(masterKeyValue, details);
  };

  if (returningStep === undefined) {
    return [setsThunk, detailsThunk];
  }

  return [returningStep, setsThunk, detailsThunk];
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

function makeDetailsSteps(masterKeyValue: number,
  details: IValue<DetailAttribute, Scalar[][]>[]): Step[] {

  const detailsSteps = details.map((currDetail) => {
    const currDetailAttr = currDetail.attribute;
    const [detailEntity] = currDetailAttr.entities;

    const detailRelation = currDetailAttr.adapter ?
      currDetailAttr.adapter.masterLinks[0].detailRelation :
      detailEntity.attribute.name;

    const link2masterField = currDetailAttr.adapter ?
      currDetailAttr.adapter.masterLinks[0].link2masterField :
      Constants.DEFAULT_MASTER_KEY_NAME;

    const pKeysValuesGroups = currDetail.value;
    const pKeysParts = pKeysValuesGroups.map((pkValues, groupIndex) => {

      const pKeysNames = detailEntity.pk.map((k) => k.name);

      const sqlPart = pKeysNames
        .map((name) => `${name} = :${name}${groupIndex}`)
        .join(" AND ");

      const params = pKeysNames.reduce((acc, currName, currIndex) => {
        return { ...acc, [`${currName}${groupIndex}`]: pkValues[currIndex] };
      }, {});

      return { sqlPart, params };
    });

    const whereParams = pKeysParts.reduce((acc, currPart) => {
      return { ...acc, ...currPart.params };
    }, {});
    const whereSql = pKeysParts.map((part) => part.sqlPart).join(" OR ");
    const sql = `UPDATE ${detailRelation} SET ${link2masterField} = (${masterKeyValue}) WHERE ${whereSql}`;
    const step = { sql, params: whereParams };
    return step;
  });

  return detailsSteps;
}

function makeSetsSteps(crossPKOwnValue: number, sets: ISetValue[]): Step[] {

  const steps = sets.map((currSet) => {

    const { attribute, setValues } = currSet;
    const restCrossTableAttrsParams = setValues.reduce((acc, currValue) => {
      return { ...acc, [currValue.attribute.name]: currValue.value };
    }, {});

    const [crossPKRefValue] = currSet.value;
    const params = {
      [Constants.DEFAULT_CROSS_PK_OWN_NAME]: crossPKOwnValue,
      [Constants.DEFAULT_CROSS_PK_REF_NAME]: crossPKRefValue,
      ...restCrossTableAttrsParams
    };

    const attrsNames = Object.keys(params);
    const placeholders = attrsNames.map((name) => `:${name}`);

    const crossTableName = attribute.adapter ? attribute.adapter!.crossRelation : attribute.name;
    const sql = makeSQLInsert(crossTableName, attrsNames, placeholders);
    const step: Step = { sql, params };
    return step;
  });

  return steps;
}

function makeScalarsEntitiesStep(entity: Entity,
  scalars: Array<IValue<ScalarAttribute, Scalar>>,
  entities: Array<IValue<EntityAttribute, Scalar[]>>): Step | undefined {

  const scalarsEntities = [...scalars, ...entities];

  if (scalarsEntities.length === 0) {
    undefined;
  }

  const params = scalarsEntities.reduce((acc, currAttrValue) => {
    if (Array.isArray(currAttrValue.value)) { // for Entity attribute
      return { ...acc, [currAttrValue.attribute.name]: currAttrValue.value };
    }
    return { ...acc, [currAttrValue.attribute.name]: currAttrValue.value };
  }, {});

  const attrsNames = Object.keys(params);
  const placeholders = attrsNames.map(name => `:${name}`);
  const sql = makeSQLInsertReturningID(entity.name, attrsNames, placeholders);

  const step = { sql, params };
  return step;
}
