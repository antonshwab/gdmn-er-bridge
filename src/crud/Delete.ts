import { Step, IDelete } from "./Crud";
import { SetAttribute } from "gdmn-orm";
import { Constants } from "../ddl/Constants";

// why delete in crosstable need make by hands?
// why not cascade delete?

export function buildDeleteSteps(input: IDelete): Step[] {
  const { pk, entity } = input;

  const pkNames = entity.pk.map(key => key.adapter.field);
  const pkValues = pk;
  const params = pkNames.reduce((acc, currName, currIndex) => {
    return {
      ...acc,
      [currName]: pkValues[currIndex]
    };
  }, {});

  const wherePart = pkNames.map((name) => `${name} = :${name}`).join(" AND ");
  const sql = `DELETE FROM ${entity.name} WHERE ${wherePart}`;

  const mainStep = { sql, params };

  const attributesNames = Object.keys(entity.attributes);
  const attributes = attributesNames.map(name => entity.attribute(name));
  const setAttrs = attributes.filter(attr => SetAttribute.isType(attr));

  const cascadeSetSteps = setAttrs.map((currSetAttr) => {

    const crossTableName = currSetAttr.adapter ? currSetAttr.adapter!.crossRelation : currSetAttr.name;

    const wherePart = `${Constants.DEFAULT_CROSS_PK_OWN_NAME} = :${Constants.DEFAULT_CROSS_PK_OWN_NAME}`;
    const sql = `DELETE FROM ${crossTableName} WHERE ${wherePart}`;
    const [pkOwnValue] = pkValues;
    const params = {
      [Constants.DEFAULT_CROSS_PK_OWN_NAME]: pkOwnValue
    };
    return { sql, params };
  });

  const steps = [...cascadeSetSteps, mainStep];
  console.log("Delete steps: ", steps);
  return steps;
}
