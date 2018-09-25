"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Constants_1 = require("../ddl/Constants");
const common_1 = require("./common");
const lodash_1 = __importDefault(require("lodash"));
function buildInsertSteps(input) {
    const { entity, attrsValues } = input;
    const { scalarAttrsValues, entityAttrsValues, setAttrsValues, detailAttrsValues } = common_1.groupAttrsValuesByType(attrsValues);
    if (scalarAttrsValues.length === 0 && entityAttrsValues.length === 0) {
        throw new Error("Must be at least one scalar or entity attribute");
    }
    const returningStep = makeReturningIDsStep(entity, scalarAttrsValues, entityAttrsValues);
    const setAttrsValuesThunk = (crossPKOwn) => {
        return makeSetAttrsSteps(crossPKOwn, setAttrsValues);
    };
    const detailAttrsValuesThunk = (masterKey) => {
        return makeDetailAttrsSteps(masterKey, detailAttrsValues);
    };
    return {
        returningStep,
        setAttrsValuesThunk,
        detailAttrsValuesThunk
    };
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
function makeDetailAttrsSteps(masterKeyValue, detailAttrsValues) {
    const steps = detailAttrsValues.map(currDetailAttrValues => {
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
    return steps;
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
            const sql = makeSQLInsert(crossTableName, attrsNames, placeholders);
            const step = { sql, params };
            return step;
        });
        return innerSteps;
    });
    const flatten = lodash_1.default.flatten(steps);
    console.log("SetAttrsSteps: ", flatten);
    return flatten;
}
function makeReturningIDsStep(entity, scalarAttrsValues, entityAttrsValues) {
    const scalarAttrsValuesParams = scalarAttrsValues.reduce((acc, curr) => {
        return { ...acc, [curr.attribute.name]: curr.value };
    }, {});
    const entityAttrsValuesParams = entityAttrsValues.reduce((acc, curr) => {
        return { ...acc, [curr.attribute.name]: curr.values[0] };
    }, {});
    const params = { ...scalarAttrsValuesParams, ...entityAttrsValuesParams };
    const attrsNames = Object.keys(params);
    const placehodlers = attrsNames.map(name => `:${name}`);
    const sql = makeSQLInsertReturningID(entity.name, attrsNames, placehodlers);
    const step = { sql, params };
    return step;
}
//# sourceMappingURL=Insert.js.map