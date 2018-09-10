"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const gdmn_orm_1 = require("gdmn-orm");
const Constants_1 = require("../ddl/Constants");
// why delete in crosstable need make by hands?
// why not cascade delete?
function buildDeleteSteps(input) {
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
    const setAttrs = attributes.filter(attr => gdmn_orm_1.SetAttribute.isType(attr));
    const cascadeSetSteps = setAttrs.map((currSetAttr) => {
        const crossTableName = currSetAttr.adapter ? currSetAttr.adapter.crossRelation : currSetAttr.name;
        const wherePart = `${Constants_1.Constants.DEFAULT_CROSS_PK_OWN_NAME} = :${Constants_1.Constants.DEFAULT_CROSS_PK_OWN_NAME}`;
        const sql = `DELETE FROM ${crossTableName} WHERE ${wherePart}`;
        const [pkOwnValue] = pkValues;
        const params = {
            [Constants_1.Constants.DEFAULT_CROSS_PK_OWN_NAME]: pkOwnValue
        };
        return { sql, params };
    });
    const steps = [...cascadeSetSteps, mainStep];
    console.log("Delete steps: ", steps);
    return steps;
}
exports.buildDeleteSteps = buildDeleteSteps;
//# sourceMappingURL=Delete.js.map