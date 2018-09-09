"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Common_1 = require("./Common");
function buildUpdateSteps(input) {
    const { pk, entity, values } = input;
    const { scalars, entities } = Common_1.groupAttrsByType(values);
    const scalarsEntitiesSteps = makeScalarsEntitiesSteps(entity, pk, scalars, entities);
    const steps = [...scalarsEntitiesSteps];
    console.log("steps for update :", steps);
    return steps;
}
exports.buildUpdateSteps = buildUpdateSteps;
function makeUpdateSQL(tableName, attrsNamesSetPart, attrsNamesWherePart) {
    const setPart = attrsNamesSetPart.map(name => `${name} = :${name}`).join(", ");
    const wherePart = attrsNamesWherePart.map(name => `${name} = :${name}`).join(", ");
    return `UPDATE ${tableName} SET ${setPart} WHERE (${wherePart})`;
}
function makeScalarsEntitiesSteps(entity, pk, scalars, entities) {
    const scalarsEntities = [...scalars, ...entities];
    if (scalarsEntities.length === 0) {
        return [];
    }
    const pkNames = entity.pk.map(key => key.adapter.field);
    const pkParams = pkNames.reduce((acc, curr, currIndex) => {
        return {
            ...acc,
            [curr]: pk[currIndex]
        };
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
//# sourceMappingURL=Update.js.map