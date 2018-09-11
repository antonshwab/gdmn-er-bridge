"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Constants_1 = require("../ddl/Constants");
const common_1 = require("./common");
function buildInsertSteps(input) {
    const { entity, values } = input;
    const { scalars, entities, sets, details } = common_1.groupAttrsValuesByType(values);
    const returningStep = makeScalarsEntitiesStep(entity, scalars, entities);
    const setsThunk = (crossPKOwnValue) => {
        return makeSetsSteps(crossPKOwnValue, sets);
    };
    const detailsThunk = (masterKeyValue) => {
        return makeDetailsSteps(masterKeyValue, details);
    };
    if (returningStep === undefined) {
        return [setsThunk, detailsThunk];
    }
    return [returningStep, setsThunk, detailsThunk];
}
exports.buildInsertSteps = buildInsertSteps;
function makeSQLInsert(table, attrsNames, placeholders) {
    const attrsNamesString = attrsNames.join(", ");
    const placeholdersString = placeholders.join(", ");
    return `INSERT INTO ${table} (${attrsNamesString}) VALUES (${placeholdersString})`;
}
function makeSQLInsertReturningID(table, attrsNames, placeholders) {
    const attrsNamesString = attrsNames.join(", ");
    const placeholdersString = placeholders.join(", ");
    return `INSERT INTO ${table} (${attrsNamesString}) VALUES (${placeholdersString}) RETURNING ID`;
}
function makeDetailsSteps(masterKeyValue, details) {
    const detailsSteps = details.map((currDetail) => {
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
        const sql = `UPDATE ${detailRelation} SET ${link2masterField} = (${masterKeyValue}) WHERE ${whereSql}`;
        const step = { sql, params: whereParams };
        return step;
    });
    return detailsSteps;
}
function makeSetsSteps(crossPKOwnValue, sets) {
    const steps = sets.map((currSet) => {
        const { attribute, setValues } = currSet;
        const restCrossTableAttrsParams = setValues.reduce((acc, currValue) => {
            return { ...acc, [currValue.attribute.name]: currValue.value };
        }, {});
        const [crossPKRefValue] = currSet.value;
        const params = {
            [Constants_1.Constants.DEFAULT_CROSS_PK_OWN_NAME]: crossPKOwnValue,
            [Constants_1.Constants.DEFAULT_CROSS_PK_REF_NAME]: crossPKRefValue,
            ...restCrossTableAttrsParams
        };
        const attrsNames = Object.keys(params);
        const placeholders = attrsNames.map((name) => `:${name}`);
        const crossTableName = attribute.adapter ? attribute.adapter.crossRelation : attribute.name;
        const sql = makeSQLInsert(crossTableName, attrsNames, placeholders);
        const step = { sql, params };
        return step;
    });
    return steps;
}
function makeScalarsEntitiesStep(entity, scalars, entities) {
    const scalarsEntities = [...scalars, ...entities];
    if (scalarsEntities.length === 0) {
        undefined;
    }
    const params = scalarsEntities.reduce((acc, currAttrValue) => {
        if (Array.isArray(currAttrValue.value)) { // for Entity attribute
            return { ...acc, [currAttrValue.attribute.name]: currAttrValue.value };
        }
        return { ...acc, [currAttrValue.attribute.name]: currAttrValue.value };
    }, {});
    const attrsNames = Object.keys(params);
    const placeholders = attrsNames.map(name => `:${name}`);
    const sql = makeSQLInsertReturningID(entity.name, attrsNames, placeholders);
    const step = { sql, params };
    return step;
}
//# sourceMappingURL=Insert.js.map