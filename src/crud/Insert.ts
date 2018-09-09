import { Entity } from "gdmn-orm";
import { Constants } from "../ddl/Constants";
import { groupAttrsByType } from "./common";
import { IInsert, Step, ISetValue } from "./Crud";


export function buildInsertSteps(input: IInsert): Step[] {
  const { entity, values } = input;

  const { scalars, entities, sets } = groupAttrsByType(values);

  const scalarsEntitiesSteps = makeScalarsEntitiesSteps(entity, scalars, entities)
  const setsSteps = makeSetsSteps(entity, sets);
  // const detailSteps = makeDetailsSteps(entity, details);

  const steps = [...scalarsEntitiesSteps, ...setsSteps];
  console.log("Insert steps: ", steps);
  return steps;
}

function makeSQLInsert(tableName: string,
  valuesNames: any[], valuesPlaceholders: any[]): string {

  const valuesString = valuesNames.join(", ");
  const placeholdersString = valuesPlaceholders.join(", ");
  return `INSERT INTO ${tableName} (${valuesString}) VALUES (${placeholdersString})`;
}

function makeSetsSteps(entity: Entity, sets: ISetValue[]): Step[] {

  const steps = sets.map((currSet) => {

    const { attribute, setValues } = currSet;
    const restCrossTableAttrsParams = setValues.reduce((acc, currValue) => {
      return { ...acc, [currValue.attribute.name]: currValue.value };
    }, {});
    const crossPKOwnPlaceholder = `(SELECT FIRST 1 ID FROM ${entity.name} ORDER BY ID DESC)`;
    const [crossPKRefValue] = currSet.value;
    const params = {
      [Constants.DEFAULT_CROSS_PK_REF_NAME]: crossPKRefValue,
      ...restCrossTableAttrsParams
    };

    const crossTableAttrsNames = [Constants.DEFAULT_CROSS_PK_OWN_NAME, ...Object.keys(params)];
    const crossTableAttrsPlaceholders = [crossPKOwnPlaceholder, ...Object.keys(params).map((name) => `:${name}`)];
    const crossTableName = attribute.adapter ? attribute.adapter!.crossRelation : attribute.name;
    const sql = makeSQLInsert(crossTableName, crossTableAttrsNames, crossTableAttrsPlaceholders);
    const step: Step = { sql, params };
    return step;
  });

  return steps;
}

function makeScalarsEntitiesSteps(entity: Entity, scalars: any[],
  entities: any[]): Step[] {

  const scalarsEntities = [...scalars, ...entities];

  if (scalarsEntities.length === 0) {
    return [];
  }

  const scalarsEntitiesParams = scalarsEntities.reduce((acc, currValue) => {
    if (Array.isArray(currValue.value)) { // for Entity Attribute
      const [value] = currValue.value;
      return { ...acc, [currValue.attribute.name]: value };
    }
    return { ...acc, [currValue.attribute.name]: currValue.value };
  }, {});
  const scalarsAndEntitiesNames = Object.keys(scalarsEntitiesParams);
  const scalarAndEntityPlaceholders = scalarsAndEntitiesNames.map((name) => `:${name}`);
  const scalarAndEntitySql = makeSQLInsert(
    entity.name,
    scalarsAndEntitiesNames,
    scalarAndEntityPlaceholders
  );
  const scalarsAndEntitiesStep = { sql: scalarAndEntitySql, params: scalarsEntitiesParams };
  return [scalarsAndEntitiesStep];
}


// TODO:
// in detail relation master_key *must be* NOT_NULL, but
// function makeDetailsSteps(entity, details) {

    // const detailSteps = details.map((currDetail) => {
    //   // 3 cases:
    //   // 1 (simple). currDetail.attribute.adapter == undefined
    //   // use default values
    //   // 2 (simple). currDetail.attribute.adapter.masterLinks.length === 1
    //   // 3 (harder). currDetail.attribute.adapter.masterLinks.length > 1
    //   const detailRelation = currDetail.attribute.adapter ?
    //     currDetail.attribute.adapter.masterLinks[0].detailRelation :
    //     currDetail.attribute.name;

    //   const link2masterField = currDetail.attribute.adapter ?
    //     currDetail.attribute.adapter.masterLinks[0].link2masterField :
    //     Constants.DEFAULT_MASTER_KEY_NAME;

    //   // get primary keys names from detail relation
    //   // and form where part
    //   const [detailEntity] = currDetail.attribute.entities;
    //   const pKeysAttributes = detailEntity.pk;
    //   const pKeysNames = pKeysAttributes.map((k) => k.name);
    //   const pKeysValuesGroups = currDetail.value;
    //   const pKeysParts = pKeysValuesGroups.map((pkValues, groupIndex) => {
    //     const sqlPart = pKeysNames
    //       .map((name) => `${name} = :name${groupIndex}`)
    //       .join(" AND ");

    //     const params = pKeysNames.reduce((acc, currName, currIndex) => {
    //       return { ...acc, [`${currName}groupIndex`]: pkValues[currIndex] };
    //     }, {});

    //     // `a = :va1 and b = :vb1 and c = :vc1`

    //     return { sqlPart, params };
    //   });
    //   const whereParams = pKeysParts.reduce((acc, currPart) => {
    //     return { ...acc, ...currPart.params };
    //   }, {});
    //   const whereSql = pKeysParts.map((part) => part.sqlPart).join(" OR ");

    //   const masterIdSQL = `(SELECT FIRST 1 ID FROM ${entity.name} ORDER BY ID DESC)`;
    //   const sql = `UPDATE ${detailRelation} SET ${link2masterField} = (${masterIdSQL}) WHERE ${whereSql}`;
    //   const step = { sql, params: whereParams };
    //   return step;
    // });
    // const steps = [scalarsAndEntitiesStep, ...setSteps, ...detailSteps];
// }
