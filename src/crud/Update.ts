import { Step, IUpdate, ISetValue, IValue, Scalar } from "./Crud";
import { Entity, DetailAttribute } from "gdmn-orm";
import { groupAttrsByType } from "./Common";
import { Constants } from "../ddl/Constants";


export function buildUpdateSteps(input: IUpdate): Step[] {
  const { pk, entity, values } = input;

  const { scalars, entities, sets, details } = groupAttrsByType(values);
  const scalarsEntitiesSteps = makeScalarsEntitiesSteps(entity, pk, scalars,
    entities);
  const setsSteps = makeSetsSteps(pk, sets);
  const detailsSteps = makeDetailsSteps(pk, details);
  const steps = [...scalarsEntitiesSteps, ...setsSteps, ...detailsSteps];

  console.log("steps for update :", steps);
  return steps;
}

function makeUpdateSQL(
  tableName: string,
  attrsNamesSetPart: string[],
  attrsNamesWherePart: string[]) {

  const setPart = attrsNamesSetPart.map(name => `${name} = :${name}`).join(", ");
  const wherePart = attrsNamesWherePart.map(name => `${name} = :${name}`).join(" AND ");
  return `UPDATE ${tableName} SET ${setPart} WHERE ${wherePart}`;
}


function makeScalarsEntitiesSteps(
  entity: Entity, pk: any[], scalars: any[], entities: any[]): Step[] {

  const scalarsEntities = [...scalars, ...entities];

  if (scalarsEntities.length === 0) {
    return [];
  }

  const pkNames = entity.pk.map(key => key.adapter.field);
  const pkParams = pkNames.reduce((acc, curr, currIndex) => {
    return {
      ...acc,
      [curr]: pk[currIndex]
    }
  }, {});

  const attrsParams = scalarsEntities.reduce((acc, currValue) => {
    if (Array.isArray(currValue.value)) {
      const [value] = currValue.value;
      return { ...acc, [currValue.attribute.name]: value };
    }
    return { ...acc, [currValue.attribute.name]: currValue.value };
  }, {});
  const attrsNames = Object.keys(attrsParams);

  const sql = makeUpdateSQL(entity.name, attrsNames, pkNames);
  const params = { ...pkParams, ...attrsParams };

  const steps = [{ sql, params }];
  return steps;
}

function makeSetsSteps(pk: any[], sets: ISetValue[]): Step[] {
  const steps = sets.map(currSet => {
    const { attribute, setValues } = currSet;

    const [crossPKOwnValue] = pk;
    const [crossPKRefValue] = currSet.value;

    const restCrossTableAttrsParams = setValues.reduce((acc, currValue) => {
      return { ...acc, [currValue.attribute.name]: currValue.value };
    }, {
        [Constants.DEFAULT_CROSS_PK_REF_NAME]: crossPKRefValue,
      });

    const params = {
      [Constants.DEFAULT_CROSS_PK_OWN_NAME]: crossPKOwnValue,
      ...restCrossTableAttrsParams
    };
    const attrsNames = Object.keys(restCrossTableAttrsParams);

    const pkOwnName = [Constants.DEFAULT_CROSS_PK_OWN_NAME];
    const crossTableName = attribute.adapter ? attribute.adapter!.crossRelation : attribute.name;

    const sql = makeUpdateSQL(crossTableName, attrsNames, pkOwnName);
    const step = { sql, params };
    return step;
  });

  return steps;
}

export function makeDetailsSteps(pk: any[],
  details: IValue<DetailAttribute, Scalar[][]>[]): Step[] {

  const detailsSteps = details.map(currDetail => {

    const detailRelation = currDetail.attribute.adapter ? currDetail.attribute.adapter.masterLinks[0].detailRelation :
      currDetail.attribute.name;

    const link2masterField = currDetail.attribute.adapter ?
      currDetail.attribute.adapter.masterLinks[0].link2masterField :
      Constants.DEFAULT_MASTER_KEY_NAME;

    const [detailEntity] = currDetail.attribute.entities;
    const pKeysAttributes = detailEntity.pk;
    const pKeysNames = pKeysAttributes.map(key => key.name);

    const pKeysValuesGroups = currDetail.value;
    const parts = pKeysValuesGroups.map((pkValues, groupIndex) => {

      const sql = pKeysNames
        .map(name => `${name} = :${name}${groupIndex}`)
        .join(" AND ");

      const params = pKeysNames.reduce((acc, currName, currIndex) => {
        return { ...acc, [`${currName}${groupIndex}`]: pkValues[currIndex] };
      }, {});

      return { sql, params };
    });

    const whereSQL = parts.map(part => part.sql).join(" OR ");
    const whereParams = parts.reduce((acc, currPart) => {
      return { ...acc, ...currPart.params };
    }, {});

    const [masterId] = pk;
    const sql = `UPDATE ${detailRelation} SET ${link2masterField} = ${masterId} WHERE ${whereSQL}`;
    const step = { sql, params: whereParams };
    return step;
  });

  console.log("details steps: (update)", detailsSteps);
  return detailsSteps;
}
