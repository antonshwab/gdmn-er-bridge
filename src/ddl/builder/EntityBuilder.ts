import {
  Attribute,
  DetailAttribute,
  Entity,
  EntityAttribute,
  ParentAttribute,
  ScalarAttribute,
  SequenceAttribute,
  SetAttribute
} from "gdmn-orm";
import {Constants} from "../Constants";
import {DDLHelper, IFieldProps} from "../DDLHelper";
import {Prefix} from "../Prefix";
import {Builder} from "./Builder";
import {DomainResolver} from "./DomainResolver";

export class EntityBuilder extends Builder {

  public async addUnique(entity: Entity, attrs: Attribute[]): Promise<void> {
    entity.addUnique(attrs);

    const tableName = Builder._getTableName(entity);
    await this._getDDLHelper().addUnique(tableName, attrs.map((attr) => Builder._getFieldName(attr)));
  }

  public async addAttribute(entity: Entity, attr: Attribute): Promise<Attribute> {
    entity.add(attr);

    const tableName = Builder._getTableName(entity);

    if (ScalarAttribute.isType(attr)) {
      const fieldName = Builder._getFieldName(attr);
      const domainName = await this._getDDLHelper().addDomain(DomainResolver.resolve(attr));
      await this._getDDLHelper().addColumns(tableName, [{name: fieldName, domain: domainName}]);
      await this._insertATAttr(attr, {relationName: tableName, fieldName, domainName});
      if (SequenceAttribute.isType(attr)) {
        const seqName = attr.sequence.adapter ? attr.sequence.adapter.sequence : attr.sequence.name;
        await this._getDDLHelper().addAutoIncrementTrigger(tableName, fieldName, seqName);
      }

    } else if (DetailAttribute.isType(attr)) {
      const fieldName = Builder._getFieldName(entity.pk[0]);
      let detailTableName: string;
      let detailLinkFieldName: string;
      if (attr.adapter && attr.adapter.masterLinks.length) {
        detailTableName = attr.adapter.masterLinks[0].detailRelation;
        detailLinkFieldName = attr.adapter.masterLinks[0].link2masterField;
      } else {
        detailTableName = attr.name;
        detailLinkFieldName = Constants.DEFAULT_MASTER_KEY_NAME;
      }

      const domainName = await this._getDDLHelper().addDomain(DomainResolver.resolve(attr));
      await this._getDDLHelper().addColumns(detailTableName, [{name: detailLinkFieldName, domain: domainName}]);
      await this._getDDLHelper().addForeignKey(DDLHelper.DEFAULT_FK_OPTIONS, {
        tableName: detailTableName,
        fieldName: detailLinkFieldName
      }, {
        tableName,
        fieldName
      });
      await this._insertATAttr(attr, {
        relationName: detailTableName,
        fieldName: detailLinkFieldName,
        domainName: domainName,
        masterEntity: entity
      });
    } else if (SetAttribute.isType(attr)) {
      const crossTableName = attr.adapter
        ? attr.adapter.crossRelation
        : Prefix.join(`${await this._getDDLHelper().ddlUniqueGen.next()}`, Prefix.CROSS);

      // create cross table
      const fields: IFieldProps[] = [];
      for (const crossAttr of Object.values(attr.attributes).filter((attr) => ScalarAttribute.isType(attr))) {
        const fieldName = Builder._getFieldName(crossAttr);
        const domainName = await this._getDDLHelper().addDomain(DomainResolver.resolve(crossAttr));
        await this._insertATAttr(crossAttr, {relationName: crossTableName, fieldName, domainName});
        const field = {
          name: fieldName,
          domain: domainName
        };
        fields.push(field);
      }

      const pkFields: IFieldProps[] = [];
      const refPKDomainName = await this._getDDLHelper().addDomain(DomainResolver.resolve(attr.entities[0].pk[0]));
      const refPK = {
        name: Constants.DEFAULT_CROSS_PK_REF_NAME,
        domain: refPKDomainName
      };
      fields.unshift(refPK);
      pkFields.unshift(refPK);

      const ownPKDomainName = await this._getDDLHelper().addDomain(DomainResolver.resolve(entity.pk[0]));
      const ownPK = {
        name: Constants.DEFAULT_CROSS_PK_OWN_NAME,
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
      const fieldName = Builder._getFieldName(attr);
      const domainName = await this._getDDLHelper().addDomain(DomainResolver.resolve(attr));
      await this._getDDLHelper().addColumns(tableName, [{name: fieldName, domain: domainName}]);
      await this._insertATAttr(attr, {
        relationName: tableName,
        fieldName,
        domainName,
        crossTable: crossTableName,
        crossTableKey
      });

      // add foreign keys for cross table
      await this._getDDLHelper().addForeignKey(DDLHelper.DEFAULT_FK_OPTIONS, {
        tableName: crossTableName,
        fieldName: Constants.DEFAULT_CROSS_PK_OWN_NAME
      }, {
        tableName: Builder._getTableName(entity),
        fieldName: Builder._getFieldName(entity.pk[0])
      });
      await this._getDDLHelper().addForeignKey(DDLHelper.DEFAULT_FK_OPTIONS, {
        tableName: crossTableName,
        fieldName: Constants.DEFAULT_CROSS_PK_REF_NAME
      }, {
        tableName: Builder._getTableName(attr.entities[0]),
        fieldName: Builder._getFieldName(attr.entities[0].pk[0])
      });

    } else if (ParentAttribute.isType(attr)) {
      const fieldName = Builder._getFieldName(attr);
      const domainName = await this._getDDLHelper().addDomain(DomainResolver.resolve(attr));
      await this._getDDLHelper().addColumns(tableName, [{name: fieldName, domain: domainName}]);
      await this._insertATAttr(attr, {relationName: tableName, fieldName, domainName});
      const lbField = attr.adapter ? attr.adapter.lbField : Constants.DEFAULT_LB_NAME;
      const rbField = attr.adapter ? attr.adapter.rbField : Constants.DEFAULT_RB_NAME;
      await this._getDDLHelper().addColumns(tableName, [{name: lbField, domain: "DLB"}]);
      await this._getDDLHelper().addColumns(tableName, [{name: rbField, domain: "DRB"}]);
      await this._getDDLHelper().createIndex(tableName, "ASC", [lbField]);
      await this._getDDLHelper().createIndex(tableName, "DESC", [rbField]);
      await this._getDDLHelper().addTableCheck(tableName, [`${lbField} <= ${rbField}`]);
      await this._getDDLHelper().addForeignKey({
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      }, {
        tableName,
        fieldName
      }, {
        tableName: Builder._getTableName(attr.entities[0]),
        fieldName: Builder._getFieldName(attr.entities[0].pk[0])
      });

    } else if (EntityAttribute.isType(attr)) {
      const fieldName = Builder._getFieldName(attr);
      const domainName = await this._getDDLHelper().addDomain(DomainResolver.resolve(attr));
      await this._getDDLHelper().addColumns(tableName, [{name: fieldName, domain: domainName}]);
      await this._insertATAttr(attr, {relationName: tableName, fieldName, domainName});
      await this._getDDLHelper().addForeignKey(DDLHelper.DEFAULT_FK_OPTIONS, {
        tableName,
        fieldName
      }, {
        tableName: Builder._getTableName(attr.entities[0]),
        fieldName: Builder._getFieldName(attr.entities[0].pk[0])
      });
    }

    return attr;
  }

  // public async removeAttribute(attribute: Attribute): Promise<void> {
  //   // TODO
  // }
}