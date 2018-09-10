"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Common_1 = require("./Common");
const Constants_1 = require("../ddl/Constants");
function buildUpdateSteps(input) {
    const { pk, entity, values } = input;
    const { scalars, entities, sets } = Common_1.groupAttrsByType(values);
    const scalarsEntitiesSteps = makeScalarsEntitiesSteps(entity, pk, scalars, entities);
    const setsSteps = makeSetsSteps(pk, sets);
    const steps = [...scalarsEntitiesSteps, ...setsSteps];
    console.log("steps for update :", steps);
    return steps;
}
exports.buildUpdateSteps = buildUpdateSteps;
function makeUpdateSQL(tableName, attrsNamesSetPart, attrsNamesWherePart) {
    const setPart = attrsNamesSetPart.map(name => `${name} = :${name}`).join(", ");
    const wherePart = attrsNamesWherePart.map(name => `${name} = :${name}`).join(" AND ");
    return `UPDATE ${tableName} SET ${setPart} WHERE ${wherePart}`;
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
function makeSetsSteps(pk, sets) {
    const steps = sets.map(currSet => {
        const { attribute, setValues } = currSet;
        const [crossPKOwnValue] = pk;
        const [crossPKRefValue] = currSet.value;
        const restCrossTableAttrsParams = setValues.reduce((acc, currValue) => {
            return { ...acc, [currValue.attribute.name]: currValue.value };
        }, {
            [Constants_1.Constants.DEFAULT_CROSS_PK_REF_NAME]: crossPKRefValue,
        });
        const params = {
            [Constants_1.Constants.DEFAULT_CROSS_PK_OWN_NAME]: crossPKOwnValue,
            ...restCrossTableAttrsParams
        };
        const attrsNames = Object.keys(restCrossTableAttrsParams);
        const pkOwnName = [Constants_1.Constants.DEFAULT_CROSS_PK_OWN_NAME];
        const crossTableName = attribute.adapter ? attribute.adapter.crossRelation : attribute.name;
        const sql = makeUpdateSQL(crossTableName, attrsNames, pkOwnName);
        const step = { sql, params };
        return step;
    });
    return steps;
}
//# sourceMappingURL=Update.js.map