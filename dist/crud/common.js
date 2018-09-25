"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const gdmn_orm_1 = require("gdmn-orm");
function groupAttrsValuesByType(attrsValues) {
    const byType = {
        scalarAttrsValues: [],
        entityAttrsValues: [],
        detailAttrsValues: [],
        setAttrsValues: []
    };
    return attrsValues.reduce((acc, curr) => {
        if (gdmn_orm_1.ScalarAttribute.isType(curr.attribute)) {
            const scalarAttrsValues = [...acc.scalarAttrsValues, curr];
            return {
                ...acc,
                scalarAttrsValues
            };
        }
        if (gdmn_orm_1.SetAttribute.isType(curr.attribute)) {
            const setAttrsValues = [...acc.setAttrsValues, curr];
            return {
                ...acc,
                setAttrsValues
            };
        }
        if (gdmn_orm_1.DetailAttribute.isType(curr.attribute)) {
            const detailAttrsValues = [...acc.detailAttrsValues, curr];
            return {
                ...acc,
                detailAttrsValues
            };
        }
        if (gdmn_orm_1.EntityAttribute.isType(curr.attribute)) {
            const entityAttrsValues = [...acc.entityAttrsValues, curr];
            return {
                ...acc,
                entityAttrsValues
            };
        }
        throw new Error("Unknow attribute type");
    }, byType);
}
exports.groupAttrsValuesByType = groupAttrsValuesByType;
;
//# sourceMappingURL=common.js.map