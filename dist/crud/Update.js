"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Constants_1 = require("../ddl/Constants");
const common_1 = require("./common");
const lodash_1 = __importDefault(require("lodash"));
function buildUpdateSteps(input) {
    // const { pk, entity, values } = input;
    // const { scalars, entities, sets, details } = groupAttrsValuesByType(values);
    // const scalarsEntitiesSteps = makeScalarsEntitiesSteps(entity, pk, scalars,
    //   entities);
    // const setsSteps = makeSetsSteps(pk, sets);
    // const detailsSteps = makeDetailsSteps(pk, details);
    // const steps = [...scalarsEntitiesSteps, ...setsSteps, ...detailsSteps];
    const { entity, attrsValues } = input;
    const pk = input.pk;
    const { scalarAttrsValues, entityAttrsValues, setAttrsValues, detailAttrsValues } = common_1.groupAttrsValuesByType(attrsValues);
    const scalarsAndEntitiesSteps = makeScalarsAndEntitiesSteps(entity, pk, scalarAttrsValues, entityAttrsValues);
    const setsSteps = makeSetAttrsSteps(pk[0], setAttrsValues);
    const detailsSteps = makeDetailAttrsSteps(pk[0], detailAttrsValues);
    const steps = [...scalarsAndEntitiesSteps, ...setsSteps, ...detailsSteps];
    console.log("steps for update :", steps);
    return steps;
}
exports.buildUpdateSteps = buildUpdateSteps;
function makeUpdateSQL(tableName, attrsNamesSetPart, attrsNamesWherePart) {
    const setPart = attrsNamesSetPart.map(name => `${name} = :${name}`).join(", ");
    const wherePart = attrsNamesWherePart.map(name => `${name} = :${name}`).join(" AND ");
    const sql = `UPDATE ${tableName} SET ${setPart} WHERE ${wherePart}`;
    return sql;
}
function makeScalarsAndEntitiesSteps(entity, pk, scalarAttrsValues, entityAttrsValues) {
    if (scalarAttrsValues.length === 0 && entityAttrsValues.length === 0) {
        return [];
    }
    // TODO: Consider other primary keys
    // How with complex primary keys?
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
    const attrsNames = [
        ...scalarAttrsNames,
        ...entityAttrsNames
    ];
    // const placeholders = names.map(name => `:${name}`);
    const sql = makeUpdateSQL(entity.name, attrsNames, pkNames);
    // TODO: sql always the same, this is space for optimization.
    const steps = [{ sql, params }];
    return steps;
}
function makeSetAttrsSteps(crossPKOwn, setAttrsValues) {
    const steps = setAttrsValues.map(currSetAttrValue => {
        const { crossValues, refIDs } = currSetAttrValue;
        const currRefIDs = currSetAttrValue.currRefIDs;
        if (currRefIDs === undefined) {
            throw new Error("ISetAttrValue must provide currRefIDs for Update operation");
        }
        // TODO: use zip
        // [(crossPKOwn, currRefID, refID, currValues)] ~~~> step[]
        const innerSteps = refIDs.map((refID, index) => {
            const currValues = crossValues[index];
            const restCrossAttrsParams = currValues.reduce((acc, curr) => {
                return { ...acc, [curr.attribute.name]: curr.value };
            }, {});
            // const [refID] = refIDs;
            const currRefID = currRefIDs[index];
            const setPartParams = {
                [Constants_1.Constants.DEFAULT_CROSS_PK_REF_NAME]: refID,
                ...restCrossAttrsParams
            };
            const setPartNames = Object.keys(setPartParams);
            const setSQLPart = setPartNames.map(name => `${name} = :${name}`).join(", ");
            const wherePartParams = {
                [Constants_1.Constants.DEFAULT_CROSS_PK_OWN_NAME]: crossPKOwn,
                currRefID
            };
            const whereSQLPart = [`${Constants_1.Constants.DEFAULT_CROSS_PK_OWN_NAME} = :${Constants_1.Constants.DEFAULT_CROSS_PK_OWN_NAME}`, `${Constants_1.Constants.DEFAULT_CROSS_PK_REF_NAME} = :currRefID`].join(" AND ");
            let crossTableName;
            if (currSetAttrValue.attribute.adapter) {
                crossTableName = currSetAttrValue.attribute.adapter.crossRelation;
            }
            else {
                crossTableName = currSetAttrValue.attribute.name;
            }
            const sql = `UPDATE ${crossTableName} SET ${setSQLPart} WHERE ${whereSQLPart}`;
            const params = {
                ...setPartParams,
                ...wherePartParams,
                ...restCrossAttrsParams
            };
            const step = { sql, params };
            return step;
        });
        return innerSteps;
    });
    const flatten = lodash_1.default.flatten(steps);
    console.log("SetAttrsSteps: ", flatten);
    return flatten;
}
// similiar to udpate's or insert'ths makedetailattrssteps
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
            const sql = pKeyNames
                .map(name => `${name} = :${name}${pkIndex}`)
                .join(" AND ");
            const params = pKeyNames.reduce((acc, currName, currIndex) => {
                return { ...acc, [`${currName}${pkIndex}`]: pk[currIndex] };
            }, {});
            return { sql, params };
        });
        const whereParams = parts.reduce((acc, part) => {
            return { ...acc, ...part.params };
        }, {});
        const whereSQL = parts.map(part => part.sql).join(" OR ");
        const sql = `UPDATE ${detailRelation} SET ${link2masterField} = (${masterKeyValue}) WHERE ${whereSQL}`;
        const step = { sql, params: whereParams };
        return step;
    });
    console.log("details steps: (update)", detailsSteps);
    return detailsSteps;
}
//# sourceMappingURL=Update.js.map