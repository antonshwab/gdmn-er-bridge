import { ScalarAttribute, SetAttribute, DetailAttribute, EntityAttribute } from "gdmn-orm";
import { IAttrsValuesByType, AttrsValues, IScalarAttrValue, ISetAttrValue, IDetailAttrValue, IEntityAttrValue } from "./Crud";

export function groupAttrsValuesByType(attrsValues: AttrsValues) {

  const byType: IAttrsValuesByType = {
    scalarAttrsValues: [],
    entityAttrsValues: [],
    detailAttrsValues: [],
    setAttrsValues: []
  };

  return attrsValues.reduce((acc: IAttrsValuesByType, curr) => {

    if (ScalarAttribute.isType(curr.attribute)) {
      const scalarAttrsValues = [...acc.scalarAttrsValues, curr as IScalarAttrValue];
      return {
        ...acc,
        scalarAttrsValues
      };
    }

    if (SetAttribute.isType(curr.attribute)) {
      const setAttrsValues = [...acc.setAttrsValues, curr as ISetAttrValue];
      return {
        ...acc,
        setAttrsValues
      };
    }

    if (DetailAttribute.isType(curr.attribute)) {
      const detailAttrsValues = [...acc.detailAttrsValues, curr as IDetailAttrValue];
      return {
        ...acc,
        detailAttrsValues
      };
    }

    if (EntityAttribute.isType(curr.attribute)) {
      const entityAttrsValues = [...acc.entityAttrsValues, curr as IEntityAttrValue];
      return {
        ...acc,
        entityAttrsValues
      };
    }

    throw new Error("Unknow attribute type");

  }, byType);
};
