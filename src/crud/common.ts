import { ScalarAttribute, SetAttribute, DetailAttribute, EntityAttribute } from "gdmn-orm";
import { Values, IAttributesByType, Scalar, IValue, ISetValue } from "./Crud";

export function groupAttrsByType(values: Values) {
  const attrsByTypeAcc: IAttributesByType = {
    scalars: [],
    entities: [],
    details: [],
    sets: []
  };

  return values.reduce((acc: IAttributesByType, currValue) => {

    if (ScalarAttribute.isType(currValue.attribute)) {
      const scalars = [...acc.scalars, currValue as IValue<ScalarAttribute, Scalar>];
      return {
        ...acc,
        scalars
      };
    }

    if (SetAttribute.isType(currValue.attribute)) {
      const sets = [...acc.sets, currValue as ISetValue];
      return {
        ...acc,
        sets
      };
    }

    if (DetailAttribute.isType(currValue.attribute)) {
      const details = [...acc.details, currValue as IValue<DetailAttribute, Scalar[][]>];
      return {
        ...acc,
        details
      };
    }

    if (EntityAttribute.isType(currValue.attribute)) {
      const entities = [...acc.entities, currValue as IValue<EntityAttribute, Scalar[]>];
      return {
        ...acc,
        entities
      };
    }

    throw new Error("Unknow attribute type");

  }, attrsByTypeAcc);
};
