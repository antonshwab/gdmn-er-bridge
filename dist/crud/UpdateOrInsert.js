"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Constants_1 = require("../ddl/Constants");
const common_1 = require("./common");
// import { makeDetailsSteps } from "./Update";
const lodash_1 = __importDefault(require("lodash"));
function makeUpdateOrInsertSQL(tableName, attrsNames, placeholders) {
    const attrsNamesString = attrsNames.join(", ");
    const placeholdersString = placeholders.join(", ");
    return `UPDATE OR INSERT INTO ${tableName} (${attrsNamesString}) VALUES (${placeholdersString})`;
}
// similar to update's or insert's makedetailattrssteps
function makeDetailAttrsSteps(masterKeyValue, detailAttrsValues) {
    const detailsSteps = detailAttrsValues.map(currDetailAttrValues => {
        const currDetailAttr = currDetailAttrValues.attribute;
        const [detailEntity] = currDetailAttr.entities;
        const detailRelation = currDetailAttr.adapter ?
            currDetailAttr.adapter.masterLinks[0].detailRelation :
            detailEntity.attribute.name;
        const link2masterField = currDetailAttr.adapter ?
            currDetailAttr.adapter.masterLinks[0].link2masterField :
            Constants_1.Constants.DEFAULT_MASTER_KEY_NAME;
        const parts = currDetailAttrValues.pks.map((pk, pkIndex) => {
            const pKeyNames = detailEntity.pk.map(k => k.name);
            const sqlPart = pKeyNames
                .map(name => `${name} = :${name}${pkIndex}`)
                .join(" AND ");
            const params = pKeyNames.reduce((acc, currName, currIndex) => {
                return { ...acc, [`${currName}${pkIndex}`]: pk[currIndex] };
            }, {});
            return { sqlPart, params };
        });
        const whereParams = parts.reduce((acc, part) => {
            return { ...acc, ...part.params };
        }, {});
        const whereSQL = parts.map(part => part.sqlPart).join(" OR ");
        const sql = `UPDATE ${detailRelation} SET ${link2masterField} = (${masterKeyValue}) WHERE ${whereSQL}`;
        const step = { sql, params: whereParams };
        return step;
    });
    console.log("details steps: (update)", detailsSteps);
    return detailsSteps;
}
function makeSetAttrsSteps(crossPKOwn, setAttrsValues) {
    const steps = setAttrsValues.map(currSetAttrValue => {
        const { crossValues, refIDs } = currSetAttrValue;
        const innerSteps = refIDs.map((currRefID, index) => {
            const currValues = crossValues[index] || [];
            const restCrossAttrsParams = currValues.reduce((acc, curr) => {
                return { ...acc, [curr.attribute.name]: curr.value };
            }, {});
            const params = {
                [Constants_1.Constants.DEFAULT_CROSS_PK_OWN_NAME]: crossPKOwn,
                [Constants_1.Constants.DEFAULT_CROSS_PK_REF_NAME]: currRefID,
                ...restCrossAttrsParams
            };
            const attrsNames = Object.keys(params);
            const placeholders = attrsNames.map(name => `:${name}`);
            let crossTableName;
            if (currSetAttrValue.attribute.adapter) {
                crossTableName = currSetAttrValue.attribute.adapter.crossRelation;
            }
            else {
                crossTableName = currSetAttrValue.attribute.name;
            }
            const sql = makeUpdateOrInsertSQL(crossTableName, attrsNames, placeholders);
            const step = { sql, params };
            return step;
        });
        return innerSteps;
    });
    const flatten = lodash_1.default.flatten(steps);
    console.log("(udpateOrInsert) SetAttrsSteps: ", flatten);
    return flatten;
}
function makeScalarsAndEntitiesSteps(entity, pk, scalarAttrsValues, entityAttrsValues) {
    if (scalarAttrsValues.length === 0 && entityAttrsValues.length === 0) {
        return [];
    }
    // TODO:
    // How deal with complex primary keys?
    const pkNames = entity.pk.map(key => key.adapter.field);
    const pkParams = pkNames.reduce((acc, curr, currIndex) => {
        return {
            ...acc,
            [curr]: pk[currIndex]
        };
    }, {});
    const scalarAttrsValuesParams = scalarAttrsValues.reduce((acc, curr) => {
        return { ...acc, [curr.attribute.name]: curr.value };
    }, {});
    const entityAttrsValuesParams = entityAttrsValues.reduce((acc, curr) => {
        return { ...acc, [curr.attribute.name]: curr.values[0] };
    }, {});
    const params = { ...pkParams, ...scalarAttrsValuesParams, ...entityAttrsValuesParams };
    const scalarAttrsNames = Object.keys(scalarAttrsValuesParams);
    const entityAttrsNames = Object.keys(entityAttrsValuesParams);
    const names = [
        ...pkNames,
        ...scalarAttrsNames,
        ...entityAttrsNames
    ];
    const placeholders = names.map(name => `:${name}`);
    const sql = makeUpdateOrInsertSQL(entity.name, names, placeholders);
    // TODO: sql always the same, this is space for optimization.
    const steps = [{ sql, params }];
    return steps;
}
function buildUpdateOrInsertSteps(input) {
    const { entity, attrsValues } = input;
    const pk = input.pk;
    const { scalarAttrsValues, entityAttrsValues, setAttrsValues, detailAttrsValues } = common_1.groupAttrsValuesByType(attrsValues);
    const scalarsAndEntitiesSteps = makeScalarsAndEntitiesSteps(entity, pk, scalarAttrsValues, entityAttrsValues);
    const setsSteps = makeSetAttrsSteps(pk[0], setAttrsValues);
    const detailsSteps = makeDetailAttrsSteps(pk[0], detailAttrsValues);
    const steps = [...scalarsAndEntitiesSteps, ...setsSteps, ...detailsSteps];
    console.log("steps for updateOrInsert: ", steps);
    return steps;
}
exports.buildUpdateOrInsertSteps = buildUpdateOrInsertSteps;
//# sourceMappingURL=UpdateOrInsert.js.map