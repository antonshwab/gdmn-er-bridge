"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Constants_1 = require("../ddl/Constants");
const common_1 = require("./common");
const Update_1 = require("./Update");
function makeUpdateOrInsertSQL(tableName, attrsNames, placeholders) {
    const attrsNamesString = attrsNames.join(", ");
    const placeholdersString = placeholders.join(", ");
    return `UPDATE OR INSERT INTO ${tableName} (${attrsNamesString}) VALUES (${placeholdersString})`;
}
function makeSetsSteps(pk, sets) {
    const steps = sets.map((currSet) => {
        const { attribute, setValues } = currSet;
        const restCrossTableAttrsParams = setValues.reduce((acc, currValue) => {
            return { ...acc, [currValue.attribute.name]: currValue.value };
        }, {});
        const [crossPKOwnValue] = pk;
        const [crossPKRefValue] = currSet.value;
        const params = {
            [Constants_1.Constants.DEFAULT_CROSS_PK_OWN_NAME]: crossPKOwnValue,
            [Constants_1.Constants.DEFAULT_CROSS_PK_REF_NAME]: crossPKRefValue,
            ...restCrossTableAttrsParams
        };
        const attrsNames = Object.keys(params);
        const placeholders = [attrsNames.map(name => `:${name}`)];
        const crossTableName = attribute.adapter ? attribute.adapter.crossRelation : attribute.name;
        const sql = makeUpdateOrInsertSQL(crossTableName, attrsNames, placeholders);
        const step = { sql, params };
        return step;
    });
    return steps;
}
function makeScalarsEntitiesSteps(entity, pk, scalars, entities) {
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
function buildUpdateOrInsertSteps(input) {
    const { pk, entity, values } = input;
    if (pk === undefined) {
        throw new Error("For undefined pk not implemented");
    }
    const { scalars, entities, sets, details } = common_1.groupAttrsByType(values);
    const scalarsEntitiesSteps = makeScalarsEntitiesSteps(entity, pk, scalars, entities);
    const detailsSteps = Update_1.makeDetailsSteps(pk, details);
    const setsSteps = makeSetsSteps(pk, sets);
    const steps = [...scalarsEntitiesSteps, ...setsSteps, ...detailsSteps];
    console.log("steps for updateOrInsert: ", steps);
    return steps;
}
exports.buildUpdateOrInsertSteps = buildUpdateOrInsertSteps;
//# sourceMappingURL=UpdateOrInsert.js.map