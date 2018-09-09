"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const gdmn_orm_1 = require("gdmn-orm");
function groupAttrsByType(values) {
    const attrsByTypeAcc = {
        scalars: [],
        entities: [],
        details: [],
        sets: []
    };
    return values.reduce((acc, currValue) => {
        if (gdmn_orm_1.ScalarAttribute.isType(currValue.attribute)) {
            const scalars = [...acc.scalars, currValue];
            return {
                ...acc,
                scalars
            };
        }
        if (gdmn_orm_1.SetAttribute.isType(currValue.attribute)) {
            const sets = [...acc.sets, currValue];
            return {
                ...acc,
                sets
            };
        }
        if (gdmn_orm_1.DetailAttribute.isType(currValue.attribute)) {
            const details = [...acc.details, currValue];
            return {
                ...acc,
                details
            };
        }
        if (gdmn_orm_1.EntityAttribute.isType(currValue.attribute)) {
            const entities = [...acc.entities, currValue];
            return {
                ...acc,
                entities
            };
        }
        throw new Error("Unknow attribute type");
    }, attrsByTypeAcc);
}
exports.groupAttrsByType = groupAttrsByType;
;
//# sourceMappingURL=common.js.map