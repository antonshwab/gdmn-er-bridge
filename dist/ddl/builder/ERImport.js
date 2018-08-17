"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const gdmn_db_1 = require("gdmn-db");
const gdmn_orm_1 = require("gdmn-orm");
const ATHelper_1 = require("../ATHelper");
const Constants_1 = require("../Constants");
const DDLHelper_1 = require("../DDLHelper");
const Prefix_1 = require("../Prefix");
const DomainResolver_1 = require("./DomainResolver");
class ERImport {
    constructor(connection, erModel) {
        this._connection = connection;
        this._erModel = erModel;
    }
    static _getTableName(entity) {
        return entity.adapter ? entity.adapter.relation[entity.adapter.relation.length - 1].relationName : entity.name;
    }
    static _getFieldName(attr) {
        if (gdmn_orm_1.SetAttribute.isType(attr)) {
            if (attr.adapter && attr.adapter.presentationField)
                return attr.adapter.presentationField;
        }
        else if (gdmn_orm_1.EntityAttribute.isType(attr) || gdmn_orm_1.ScalarAttribute.isType(attr)) {
            if (attr.adapter)
                return attr.adapter.field;
        }
        return attr.name;
    }
    async execute() {
        await gdmn_db_1.AConnection.executeTransaction({
            connection: this._connection,
            callback: async (transaction) => {
                this._ddlHelper = new DDLHelper_1.DDLHelper(this._connection, transaction);
                this._atHelper = new ATHelper_1.ATHelper(this._connection, transaction);
                try {
                    await this._getDDLHelper().prepare();
                    await this._getATHelper().prepare();
                    await this._createERSchema();
                    await this._getDDLHelper().dispose();
                    await this._getATHelper().dispose();
                }
                finally {
                    console.debug(this._ddlHelper.logs.join("\n"));
                }
            }
        });
    }
    _getDDLHelper() {
        if (this._ddlHelper) {
            return this._ddlHelper;
        }
        throw new Error("ddlHelper is undefined");
    }
    _getATHelper() {
        if (this._atHelper) {
            return this._atHelper;
        }
        throw new Error("atHelper is undefined");
    }
    async _createERSchema() {
        for (const sequence of Object.values(this._erModel.sequencies)) {
            const sequenceName = sequence.adapter ? sequence.adapter.sequence : sequence.name;
            if (sequenceName !== Constants_1.Constants.GLOBAL_GENERATOR) {
                await this._getDDLHelper().addSequence(sequenceName);
            }
        }
        for (const entity of Object.values(this._erModel.entities)) {
            await this._addEntity(entity);
        }
        for (const entity of Object.values(this._erModel.entities)) {
            await this._addLinks(entity);
            await this._addUnique(entity);
        }
    }
    async _addUnique(entity) {
        const tableName = ERImport._getTableName(entity);
        for (const attrs of entity.unique) {
            await this._getDDLHelper().addUnique(tableName, attrs.map((attr) => ERImport._getFieldName(attr)));
        }
    }
    async _addLinks(entity) {
        const tableName = ERImport._getTableName(entity);
        for (const attr of Object.values(entity.ownAttributes).filter((attr) => gdmn_orm_1.EntityAttribute.isType(attr))) {
            if (gdmn_orm_1.DetailAttribute.isType(attr)) {
                const fieldName = ERImport._getFieldName(entity.pk[0]);
                const adapter = attr.adapter;
                let detailTableName;
                let detailLinkFieldName;
                if (adapter && adapter.masterLinks.length) {
                    detailTableName = adapter.masterLinks[0].detailRelation;
                    detailLinkFieldName = adapter.masterLinks[0].link2masterField;
                }
                else {
                    detailTableName = attr.name;
                    detailLinkFieldName = Constants_1.Constants.DEFAULT_MASTER_KEY_NAME;
                }
                const domainName = await this._getDDLHelper().addDomain(DomainResolver_1.DomainResolver.resolve(attr));
                await this._getDDLHelper().addColumns(detailTableName, [{ name: detailLinkFieldName, domain: domainName }]);
                await this._getDDLHelper().addForeignKey(DDLHelper_1.DDLHelper.DEFAULT_FK_OPTIONS, {
                    tableName: detailTableName,
                    fieldName: detailLinkFieldName
                }, {
                    tableName,
                    fieldName
                });
                await this._bindATAttr(attr, {
                    relationName: detailTableName,
                    fieldName: detailLinkFieldName,
                    domainName: domainName,
                    masterEntity: entity
                });
            }
            else if (gdmn_orm_1.SetAttribute.isType(attr)) {
                const crossTableName = attr.adapter
                    ? attr.adapter.crossRelation
                    : Prefix_1.Prefix.join(`${await this._getDDLHelper().ddlUniqueGen.next()}`, Prefix_1.Prefix.CROSS);
                // create cross table
                const fields = [];
                for (const crossAttr of Object.values(attr.attributes).filter((attr) => gdmn_orm_1.ScalarAttribute.isType(attr))) {
                    const domainName = await this._getDDLHelper().addDomain(DomainResolver_1.DomainResolver.resolve(crossAttr));
                    const fieldName = ERImport._getFieldName(crossAttr);
                    await this._bindATAttr(crossAttr, { relationName: crossTableName, fieldName, domainName });
                    const field = {
                        name: fieldName,
                        domain: domainName
                    };
                    fields.push(field);
                }
                const pkFields = [];
                const refPKDomainName = await this._getDDLHelper().addDomain(DomainResolver_1.DomainResolver.resolve(attr.entities[0].pk[0]));
                const refPK = {
                    name: Constants_1.Constants.DEFAULT_CROSS_PK_REF_NAME,
                    domain: refPKDomainName
                };
                fields.unshift(refPK);
                pkFields.unshift(refPK);
                const ownPKDomainName = await this._getDDLHelper().addDomain(DomainResolver_1.DomainResolver.resolve(entity.pk[0]));
                const ownPK = {
                    name: Constants_1.Constants.DEFAULT_CROSS_PK_OWN_NAME,
                    domain: ownPKDomainName
                };
                fields.unshift(ownPK);
                pkFields.unshift(ownPK);
                await this._getDDLHelper().addTable(crossTableName, fields);
                await this._getDDLHelper().addPrimaryKey(crossTableName, pkFields.map((i) => i.name));
                const crossTableKey = await this._getATHelper().insertATRelations({
                    relationName: crossTableName,
                    relationType: "T",
                    lName: crossTableName,
                    description: crossTableName,
                    entityName: undefined,
                    semCategory: undefined
                });
                // create own table column
                const fieldName = ERImport._getFieldName(attr);
                const domainName = await this._getDDLHelper().addDomain(DomainResolver_1.DomainResolver.resolve(attr));
                await this._getDDLHelper().addColumns(tableName, [{ name: fieldName, domain: domainName }]);
                await this._bindATAttr(attr, {
                    relationName: tableName,
                    fieldName,
                    domainName,
                    crossTable: crossTableName,
                    crossTableKey
                });
                // add foreign keys for cross table
                await this._getDDLHelper().addForeignKey(DDLHelper_1.DDLHelper.DEFAULT_FK_OPTIONS, {
                    tableName: crossTableName,
                    fieldName: Constants_1.Constants.DEFAULT_CROSS_PK_OWN_NAME
                }, {
                    tableName: ERImport._getTableName(entity),
                    fieldName: ERImport._getFieldName(entity.pk[0])
                });
                await this._getDDLHelper().addForeignKey(DDLHelper_1.DDLHelper.DEFAULT_FK_OPTIONS, {
                    tableName: crossTableName,
                    fieldName: Constants_1.Constants.DEFAULT_CROSS_PK_REF_NAME
                }, {
                    tableName: ERImport._getTableName(attr.entities[0]),
                    fieldName: ERImport._getFieldName(attr.entities[0].pk[0])
                });
            }
            else if (gdmn_orm_1.ParentAttribute.isType(attr)) {
                const fieldName = ERImport._getFieldName(attr);
                await this._getDDLHelper().addForeignKey({
                    onUpdate: "CASCADE",
                    onDelete: "CASCADE"
                }, {
                    tableName,
                    fieldName
                }, {
                    tableName: ERImport._getTableName(attr.entities[0]),
                    fieldName: ERImport._getFieldName(attr.entities[0].pk[0])
                });
            }
            else if (gdmn_orm_1.EntityAttribute.isType(attr)) {
                const fieldName = ERImport._getFieldName(attr);
                await this._getDDLHelper().addForeignKey(DDLHelper_1.DDLHelper.DEFAULT_FK_OPTIONS, {
                    tableName,
                    fieldName
                }, {
                    tableName: ERImport._getTableName(attr.entities[0]),
                    fieldName: ERImport._getFieldName(attr.entities[0].pk[0])
                });
            }
        }
    }
    async _addEntity(entity) {
        const tableName = ERImport._getTableName(entity);
        const fields = [];
        const pkFields = [];
        const seqAttrs = [];
        const indexes = [];
        const checks = [];
        for (const attr of Object.values(entity.ownAttributes)) {
            if (gdmn_orm_1.ScalarAttribute.isType(attr)) {
                const domainName = await this._getDDLHelper().addDomain(DomainResolver_1.DomainResolver.resolve(attr));
                const fieldName = ERImport._getFieldName(attr);
                await this._bindATAttr(attr, { relationName: tableName, fieldName, domainName });
                if (gdmn_orm_1.SequenceAttribute.isType(attr)) {
                    seqAttrs.push(attr);
                }
                const field = {
                    name: fieldName,
                    domain: domainName
                };
                fields.push(field);
                if (entity.pk.includes(attr)) {
                    pkFields.push(field);
                }
            }
            else if (gdmn_orm_1.DetailAttribute.isType(attr)) {
                // ignore
            }
            else if (gdmn_orm_1.SetAttribute.isType(attr)) {
                // ignore
            }
            else if (gdmn_orm_1.ParentAttribute.isType(attr)) {
                const domainName = await this._getDDLHelper().addDomain(DomainResolver_1.DomainResolver.resolve(attr));
                const fieldName = ERImport._getFieldName(attr);
                await this._bindATAttr(attr, { relationName: tableName, fieldName, domainName });
                const lbField = attr.adapter ? attr.adapter.lbField : Constants_1.Constants.DEFAULT_LB_NAME;
                const rbField = attr.adapter ? attr.adapter.rbField : Constants_1.Constants.DEFAULT_RB_NAME;
                fields.push({
                    name: fieldName,
                    domain: domainName
                });
                fields.push({
                    name: lbField,
                    domain: "DLB"
                });
                fields.push({
                    name: rbField,
                    domain: "DRB"
                });
                checks.push(`${lbField} <= ${rbField}`);
                indexes.push({ field: lbField, type: "ASC" });
                indexes.push({ field: rbField, type: "DESC" });
            }
            else if (gdmn_orm_1.EntityAttribute.isType(attr)) {
                const domainName = await this._getDDLHelper().addDomain(DomainResolver_1.DomainResolver.resolve(attr));
                const fieldName = ERImport._getFieldName(attr);
                await this._bindATAttr(attr, { relationName: tableName, fieldName, domainName });
                const field = {
                    name: fieldName,
                    domain: domainName
                };
                fields.push(field);
                if (entity.pk.includes(attr)) {
                    pkFields.push(field);
                }
            }
        }
        await this._getDDLHelper().addTable(tableName, fields);
        await this._getDDLHelper().addTableCheck(tableName, checks);
        await this._getDDLHelper().addPrimaryKey(tableName, pkFields.map((i) => i.name));
        for (const index of indexes) {
            await this._getDDLHelper().createIndex(tableName, index.type, [index.field]);
        }
        for (const seqAttr of seqAttrs) {
            const fieldName = ERImport._getFieldName(seqAttr);
            const seqAdapter = seqAttr.sequence.adapter;
            await this._getDDLHelper().addAutoIncrementTrigger(tableName, fieldName, seqAdapter ? seqAdapter.sequence : seqAttr.sequence.name);
        }
        await this._bindATEntity(entity, { relationName: tableName });
    }
    async _bindATEntity(entity, options) {
        return await this._getATHelper().insertATRelations({
            relationName: options.relationName,
            relationType: "T",
            lName: entity.lName.ru ? entity.lName.ru.name : entity.name,
            description: entity.lName.ru ? entity.lName.ru.fullName : entity.name,
            entityName: options.relationName !== entity.name ? entity.name : undefined,
            semCategory: undefined
        });
    }
    async _bindATAttr(attr, options) {
        const numeration = gdmn_orm_1.EnumAttribute.isType(attr)
            ? attr.values.map(({ value, lName }) => `${value}=${lName && lName.ru ? lName.ru.name : ""}`).join("#13#10")
            : undefined;
        const fieldSourceKey = await this._getATHelper().insertATFields({
            fieldName: options.domainName,
            lName: attr.lName.ru ? attr.lName.ru.name : attr.name,
            description: attr.lName.ru ? attr.lName.ru.fullName : attr.name,
            refTable: undefined,
            refCondition: undefined,
            setTable: undefined,
            setListField: undefined,
            setCondition: undefined,
            numeration: numeration ? Buffer.from(numeration) : undefined
        });
        await this._getATHelper().insertATRelationFields({
            fieldName: options.fieldName,
            relationName: options.relationName,
            lName: attr.lName.ru ? attr.lName.ru.name : attr.name,
            description: attr.lName.ru ? attr.lName.ru.fullName : attr.name,
            attrName: options.fieldName !== attr.name ? attr.name : undefined,
            isParent: gdmn_orm_1.ParentAttribute.isType(attr) || undefined,
            lbFieldName: gdmn_orm_1.ParentAttribute.isType(attr) && attr.adapter && attr.adapter.lbField || undefined,
            rbFieldName: gdmn_orm_1.ParentAttribute.isType(attr) && attr.adapter && attr.adapter.rbField || undefined,
            masterEntityName: options.masterEntity ? options.masterEntity.name : undefined,
            fieldSource: options.domainName,
            fieldSourceKey,
            semCategory: undefined,
            crossTable: options.crossTable,
            crossTableKey: options.crossTableKey,
            crossField: options.crossField
        });
    }
}
exports.ERImport = ERImport;
//# sourceMappingURL=ERImport.js.map