import { Step, IUpdate } from "./Crud";
import { Entity } from "gdmn-orm";
import { groupAttrsByType } from "./Common";


export function buildUpdateSteps(input: IUpdate): Step[] {
  const { pk, entity, values } = input;

  const { scalars, entities, sets } = groupAttrsByType(values);
  const scalarsEntitiesSteps = makeScalarsEntitiesSteps(entity, pk, scalars,
    entities);

  const setsSteps = makeSetsSteps(entity, pk, sets);
  const steps = [...scalarsEntitiesSteps, ...setsSteps];

  console.log("steps for update :", steps);
  return steps;
}

function makeUpdateSQL(
  tableName: string,
  attrsNamesSetPart: string[],
  attrsNamesWherePart: string[]) {

  const setPart = attrsNamesSetPart.map(name => `${name} = :${name}`).join(", ");
  const wherePart = attrsNamesWherePart.map(name => `${name} = :${name}`).join(", ");
  return `UPDATE ${tableName} SET ${setPart} WHERE (${wherePart})`;
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
