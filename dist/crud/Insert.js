"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Constants_1 = require("../ddl/Constants");
const common_1 = require("./common");
function buildInsertSteps(input) {
    const { entity, values } = input;
    const { scalars, entities, sets, details } = common_1.groupAttrsByType(values);
    const scalarsEntitiesSteps = makeScalarsEntitiesSteps(entity, scalars, entities);
    const setsSteps = makeSetsSteps(entity, sets);
    const detailsSteps = makeDetailsSteps(entity, details);
    const steps = [...scalarsEntitiesSteps, ...setsSteps, ...detailsSteps];
    console.log("Insert steps: ", steps);
    return steps;
}
exports.buildInsertSteps = buildInsertSteps;
function makeSQLInsert(tableName, valuesNames, valuesPlaceholders) {
    const valuesString = valuesNames.join(", ");
    const placeholdersString = valuesPlaceholders.join(", ");
    return `INSERT INTO ${tableName} (${valuesString}) VALUES (${placeholdersString})`;
}
function makeSetsSteps(entity, sets) {
    const steps = sets.map((currSet) => {
        const { attribute, setValues } = currSet;
        const restCrossTableAttrsParams = setValues.reduce((acc, currValue) => {
            return { ...acc, [currValue.attribute.name]: currValue.value };
        }, {});
        const crossPKOwnPlaceholder = `(SELECT FIRST 1 ID FROM ${entity.name} ORDER BY ID DESC)`;
        const [crossPKRefValue] = currSet.value;
        const params = {
            [Constants_1.Constants.DEFAULT_CROSS_PK_REF_NAME]: crossPKRefValue,
            ...restCrossTableAttrsParams
        };
        const crossTableAttrsNames = [Constants_1.Constants.DEFAULT_CROSS_PK_OWN_NAME, ...Object.keys(params)];
        const crossTableAttrsPlaceholders = [crossPKOwnPlaceholder, ...Object.keys(params).map((name) => `:${name}`)];
        const crossTableName = attribute.adapter ? attribute.adapter.crossRelation : attribute.name;
        const sql = makeSQLInsert(crossTableName, crossTableAttrsNames, crossTableAttrsPlaceholders);
        const step = { sql, params };
        return step;
    });
    return steps;
}
function makeScalarsEntitiesSteps(entity, scalars, entities) {
    const scalarsEntities = [...scalars, ...entities];
    if (scalarsEntities.length === 0) {
        return [];
    }
    const scalarsEntitiesParams = scalarsEntities.reduce((acc, currValue) => {
        if (Array.isArray(currValue.value)) { // for Entity Attribute
            const [value] = currValue.value;
            return { ...acc, [currValue.attribute.name]: value };
        }
        return { ...acc, [currValue.attribute.name]: currValue.value };
    }, {});
    const scalarsAndEntitiesNames = Object.keys(scalarsEntitiesParams);
    const scalarAndEntityPlaceholders = scalarsAndEntitiesNames.map((name) => `:${name}`);
    const scalarAndEntitySql = makeSQLInsert(entity.name, scalarsAndEntitiesNames, scalarAndEntityPlaceholders);
    const scalarsAndEntitiesStep = { sql: scalarAndEntitySql, params: scalarsEntitiesParams };
    return [scalarsAndEntitiesStep];
}
function makeDetailsSteps(entity, details) {
    const detailsSteps = details.map((currDetail) => {
        // 3 cases:
        // 1 (simple). currDetail.attribute.adapter == undefined
        // use default values
        // 2 (simple). currDetail.attribute.adapter.masterLinks.length === 1
        // 3 (harder). currDetail.attribute.adapter.masterLinks.length > 1
        const currDetailAttr = currDetail.attribute;
        const [detailEntity] = currDetailAttr.entities;
        const detailRelation = currDetailAttr.adapter ?
            currDetailAttr.adapter.masterLinks[0].detailRelation :
            detailEntity.attribute.name;
        const link2masterField = currDetailAttr.adapter ?
            currDetailAttr.adapter.masterLinks[0].link2masterField :
            Constants_1.Constants.DEFAULT_MASTER_KEY_NAME;
        const pKeysValuesGroups = currDetail.value;
        const pKeysParts = pKeysValuesGroups.map((pkValues, groupIndex) => {
            const pKeysNames = detailEntity.pk.map((k) => k.name);
            const sqlPart = pKeysNames
                .map((name) => `${name} = :${name}${groupIndex}`)
                .join(" AND ");
            const params = pKeysNames.reduce((acc, currName, currIndex) => {
                return { ...acc, [`${currName}${groupIndex}`]: pkValues[currIndex] };
            }, {});
            return { sqlPart, params };
        });
        const whereParams = pKeysParts.reduce((acc, currPart) => {
            return { ...acc, ...currPart.params };
        }, {});
        const whereSql = pKeysParts.map((part) => part.sqlPart).join(" OR ");
        const masterIdSQL = `(SELECT FIRST 1 ID FROM ${entity.name} ORDER BY ID DESC)`;
        const sql = `UPDATE ${detailRelation} SET ${link2masterField} = (${masterIdSQL}) WHERE ${whereSql}`;
        const step = { sql, params: whereParams };
        return step;
    });
    console.log(detailsSteps);
    return detailsSteps;
}
//# sourceMappingURL=Insert.js.map