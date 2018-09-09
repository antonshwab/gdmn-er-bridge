import { Constants } from "../ddl/Constants";
import { ISetValue, Step, IUpdateOrInsert } from "./Crud";
import { Entity } from "gdmn-orm";
import { groupAttrsByType } from "./common";

function makeUpdateOrInsertSQL(
  tableName: string,
  attrsNames: any[],
  placeholders: any[]) {

  const attrsNamesString = attrsNames.join(", ");
  const placeholdersString = placeholders.join(", ");
  return `UPDATE OR INSERT INTO ${tableName} (${attrsNamesString}) VALUES (${placeholdersString})`;
}

function makeSetsSteps(pk: any[], sets: ISetValue[]): Step[] {

  const steps = sets.map((currSet) => {
    const { attribute, setValues } = currSet;

    const restCrossTableAttrsParams = setValues.reduce((acc, currValue) => {
      return { ...acc, [currValue.attribute.name]: currValue.value };
    }, {});

    const [crossPKOwnValue] = pk;
    const [crossPKRefValue] = currSet.value;

    const params = {
      [Constants.DEFAULT_CROSS_PK_OWN_NAME]: crossPKOwnValue,
      [Constants.DEFAULT_CROSS_PK_REF_NAME]: crossPKRefValue,
      ...restCrossTableAttrsParams
    };

    const attrsNames = Object.keys(params);
    const placeholders = [attrsNames.map(name => `:${name}`)];
    const crossTableName = attribute.adapter ? attribute.adapter!.crossRelation : attribute.name;
    const sql = makeUpdateOrInsertSQL(crossTableName, attrsNames, placeholders);
    const step: Step = { sql, params };
    return step;
  });

  return steps;
}

function makeScalarsEntitiesSteps(
  entity: Entity, pk: any[], scalars: any[],
  entities: any[]): Step[] {

  const scalarsEntities = [...scalars, ...entities];

  if (scalarsEntities.length === 0) {
    return [];
  }

  // TODO: Consider other primary keys
  // How with complex primary keys? pk has value and values in IValue has a value too
  // which values to choose?
  // console.log("primary keys: ", JSON.stringify(entity.pk));
  const pkNames = entity.pk.map(key => key.adapter.field);
  const pkParams = pkNames.reduce((acc, curr, currIndex) => {
    return {
      ...acc,
      [curr]: pk[currIndex]
    };
  }, {});
  const pkPlaceholders = pkNames.map(key => `:${key}`);

  const restParams = scalarsEntities.reduce((acc, currValue) => {
    if (Array.isArray(currValue.value)) {
      const [value] = currValue.value;
      return { ...acc, [currValue.attribute.name]: value };
    }
    return { ...acc, [currValue.attribute.name]: currValue.value };
  }, {});
  const params = { ...pkParams, ...restParams };

  const restNames = Object.keys(restParams);
  const names = [...pkNames, ...restNames];

  const restPlaceholders = restNames.map((name) => `:${name}`);
  const placeholders = [...pkPlaceholders, ...restPlaceholders];

  const sql = makeUpdateOrInsertSQL(entity.name, names, placeholders);

  const steps = [{ sql, params }];
  return steps;
}


export function buildUpdateOrInsertSteps(input: IUpdateOrInsert) {
  const { pk, entity, values } = input;

  if (pk === undefined) {
    throw new Error("For undefined pk not implemented");
  }

  const { scalars, entities, sets } = groupAttrsByType(values);
  const scalarsEntitiesSteps = makeScalarsEntitiesSteps(entity, pk, scalars,
    entities);

  const setsSteps = makeSetsSteps(pk, sets);
  const steps = [...scalarsEntitiesSteps, ...setsSteps];

  console.log("steps for updateOrInsert: ", steps);

  return steps;
}
