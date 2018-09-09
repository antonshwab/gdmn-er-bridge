import { AConnection } from "gdmn-db";
import { ERBridge } from "../src/ERBridge";
import { ERModel, MAX_16BIT_INT, MIN_16BIT_INT, Entity, IntegerAttribute, StringAttribute, TimeStampAttribute, EntityAttribute, SetAttribute, ScalarAttribute, DetailAttribute } from "gdmn-orm";
import { IInsert, IValue, Scalar, Crud, ISetValue, IUpdateOrInsert, } from "../src/crud/Crud";
import { Constants } from "../src/ddl/Constants";

export function testInsert(
  connection: AConnection,
  initERModelBuilder): void {

  describe("ERBridge INSERT", async () => {

    const erBridge = new ERBridge(connection);

    const executeERModel = async (erModel) => AConnection.executeTransaction({
      connection,
      callback: async (transaction) => {
        await erBridge.executeERModelBuilder(transaction, erModel);
      }
    });

    it("Insert Scalars", async () => {
      const entityName = "TEST";
      const field1Name = "FIELD1";
      const field2Name = "FIELD2";

      const erModel: ERModel = await initERModelBuilder(async (builder) => {
        const erModel = await builder.initERModel();
        const entity = await builder.addEntity(erModel, new Entity({
          name: entityName,
          lName: { ru: { name: "entity name", fullName: "full entity name" } }
        }));

        await builder.entityBuilder.addAttribute(entity, new IntegerAttribute({
          name: field1Name, lName: { ru: { name: "Поле 1", fullName: "FULLNAME" } }, required: true,
          minValue: MIN_16BIT_INT, maxValue: MAX_16BIT_INT, defaultValue: -10000,
        }));

        await builder.entityBuilder.addAttribute(entity, new StringAttribute({
          name: field2Name, lName: { ru: { name: "Поле 2" } },
          minLength: 1, maxLength: 160, defaultValue: "test default", autoTrim: true
        }));

        return erModel;
      });

      const entity = erModel.entity("TEST");
      const field1Attribute = entity.attribute(field1Name);
      const field2Attriubte = entity.attribute(field2Name);

      const field1Value: IValue<ScalarAttribute, Scalar> = {
        attribute: field1Attribute,
        value: 777
      };
      const field2Value: IValue<ScalarAttribute, Scalar> = {
        attribute: field2Attriubte,
        value: "iamstring"
      };

      const insert: IInsert = {
        entity,
        values: [field1Value, field2Value]
      };

      await Crud.executeInsert(connection, insert);

      await AConnection.executeTransaction({
        connection,
        callback: async (transaction) => {
          const selectSql = `SELECT FIRST 1 t.${field1Name}, t.${field2Name} FROM ${entity.name} t`;
          const result = await connection.executeReturning(transaction, selectSql);

          const insertedField1 = result.getNumber("FIELD1");
          expect(insertedField1).toEqual(field1Value.value);

          const insertedField2 = result.getString("FIELD2");
          expect(insertedField2).toEqual(field2Value.value);
        }
      });

    });

    it("insert Scalars, Entities attribute values", async () => {
      const entityName = "TEST";

      const erModel: ERModel = await initERModelBuilder(async (builder) => {
        const erModel = await builder.initERModel();

        const appEntity = await builder.addEntity(erModel, new Entity({
          name: "APPLICATION", lName: { ru: { name: "Приложение" } }
        }));

        await builder.entityBuilder.addAttribute(appEntity, new StringAttribute({
          name: "UID", lName: { ru: { name: "Идентификатор приложения" } }, required: true, minLength: 1, maxLength: 36
        }));

        await builder.entityBuilder.addUnique(appEntity, [appEntity.attribute("UID")]);

        await builder.entityBuilder.addAttribute(appEntity, new TimeStampAttribute({
          name: "CREATIONDATE", lName: { ru: { name: "Дата создания" } }, required: true, defaultValue: "CURRENT_TIMESTAMP"
        }));

        const backupEntity = await builder.addEntity(erModel, new Entity({
          name: "APPLICATION_BACKUPS", lName: { ru: { name: "Бэкап" } }
        }));
        await builder.entityBuilder.addAttribute(backupEntity, new StringAttribute({
          name: "UID", lName: { ru: { name: "Идентификатор бэкапа" } }, required: true, minLength: 1, maxLength: 36
        }));

        await builder.entityBuilder.addUnique(backupEntity, [backupEntity.attribute("UID")]);

        await builder.entityBuilder.addAttribute(backupEntity,
          new EntityAttribute({
            name: "APP", lName: { ru: { name: " " } }, required: true, entities: [appEntity]
          })
        );

        await builder.entityBuilder.addAttribute(backupEntity, new StringAttribute({
          name: "ALIAS", lName: { ru: { name: "Название бэкапа" } }, required: true, minLength: 1, maxLength: 120
        }));

        await builder.entityBuilder.addAttribute(backupEntity, new TimeStampAttribute({
          name: "CREATIONDATE", lName: { ru: { name: "Дата создания" } }, required: true, defaultValue: "CURRENT_TIMESTAMP"
        }));

        return erModel;
      });

      const appEntity = erModel.entity("APPLICATION");
      const appBackupEntity = erModel.entity("APPLICATION_BACKUPS");
      const appUidAttribute = appEntity.attribute("UID");
      const backupEntityAttribute = appBackupEntity.attribute("APP") as EntityAttribute;
      const backupUidAttribute = appBackupEntity.attribute("UID");
      const backupAliasAttribute = appBackupEntity.attribute("ALIAS");

      // 1. Insert app
      const appUidValue: IValue<ScalarAttribute, Scalar> = {
        attribute: appUidAttribute,
        value: "uniqueuid"
      };
      const insertApp: IInsert = {
        entity: appEntity,
        values: [appUidValue]
      };
      await Crud.executeInsert(connection, insertApp);

      // 2. Insert backup
      const appId = await AConnection.executeTransaction({
        connection,
        callback: async (transaction) => {
          const result = await connection.executeReturning(transaction, `
                SELECT FIRST 1
                  app.ID
                FROM APPLICATION app
                WHERE app.UID = :appUid`,
            { appUid: appUidValue.value });

          return result.getNumber("ID");
        },
      });

      const appIdValue: IValue<EntityAttribute, Scalar[]> = {
        attribute: backupEntityAttribute,
        value: [appId]
      };

      const backupUidValue: IValue<ScalarAttribute, Scalar> = {
        attribute: backupUidAttribute,
        value: "uniqueuid"
      };

      const backupAliasValue: IValue<ScalarAttribute, Scalar> = {
        attribute: backupAliasAttribute,
        value: "alias"
      };

      const insertBackup: IInsert = {
        entity: appBackupEntity,
        values: [appIdValue, backupUidValue, backupAliasValue]
      };

      await Crud.executeInsert(connection, insertBackup);

      await AConnection.executeTransaction({
        connection,
        callback: async (transaction) => {
          const selectSql = `SELECT FIRST 1 bkp.UID, bkp.ALIAS, bkp.APP FROM APPLICATION_BACKUPS bkp`;

          const result = await connection.executeReturning(transaction, selectSql);

          const uid = result.getString(backupUidAttribute.name);
          expect(uid).toEqual(backupUidValue.value);

          const alias = result.getString(backupAliasAttribute.name);
          expect(alias).toEqual(backupAliasValue.value);

          const app = result.getNumber(backupEntityAttribute.name);
          expect(app).toEqual(appIdValue.value[0]);
        }
      });
    });

    it("insert with SetAttribute", async () => {
      const erModel: ERModel = await initERModelBuilder(async (builder) => {
        const erModel = await builder.initERModel();

        // APPLICATION
        const appEntity = await builder.addEntity(erModel, new Entity({
          name: "APPLICATION", lName: { ru: { name: "Приложение" } }
        }));

        await builder.entityBuilder.addAttribute(appEntity, new StringAttribute({
          name: "UID", lName: { ru: { name: "Идентификатор приложения" } }, required: true,
          minLength: 1, maxLength: 36
        }));
        await builder.entityBuilder.addUnique(appEntity, [appEntity.attribute("UID")]);

        await builder.entityBuilder.addAttribute(appEntity, new TimeStampAttribute({
          name: "CREATIONDATE", lName: { ru: { name: "Дата создания" } }, required: true, defaultValue: "CURRENT_TIMESTAMP"
        }));

        const userEntity = await builder.addEntity(erModel, new Entity({
          name: "APP_USER", lName: { ru: { name: "Пользователь" } }
        }));

        const userLogin = await builder.entityBuilder.addAttribute(userEntity, new StringAttribute({
          name: "LOGIN", lName: { ru: { name: "Логин" } }, required: true, minLength: 1,
          maxLength: 32
        }));

        const appSet = new SetAttribute({
          name: "APPLICATIONS", lName: { ru: { name: "Приложения" } }, entities: [appEntity],
          adapter: { crossRelation: "APP_USER_APPLICATIONS" }
        });

        appSet.add(new StringAttribute({
          name: "ALIAS", lName: { ru: { name: "Название приложения" } }, required: true, minLength: 1, maxLength: 120
        }));

        await builder.entityBuilder.addAttribute(userEntity, appSet);

        return erModel;
      });

      const userEntity = erModel.entity("APP_USER");
      const appEntity = erModel.entity("APPLICATION");

      const appUIDValue: IValue<ScalarAttribute, Scalar> = {
        attribute: appEntity.attribute("UID"),
        value: "uniqueUID"
      };
      const appInsert: IInsert = {
        entity: appEntity,
        values: [appUIDValue]
      };

      await Crud.executeInsert(connection, appInsert);

      const appId = await AConnection.executeTransaction({
        connection,
        callback: async (transaction) => {
          const sql = `SELECT FIRST 1 ID FROM APPLICATION WHERE UID = :appUID`;
          const params = { appUID: appUIDValue.value };
          const result = await connection.executeReturning(transaction, sql, params);
          return result.getNumber("ID");
        }
      });

      const appSetAttribute: SetAttribute = userEntity.attribute("APPLICATIONS") as SetAttribute;
      const appAliasAttribute: ScalarAttribute = appSetAttribute.attribute("ALIAS");
      const appAliasValue: IValue<ScalarAttribute, Scalar> = {
        attribute: appAliasAttribute,
        value: "appalias"
      };
      const loginAttributeValue: IValue<ScalarAttribute, Scalar> = {
        attribute: userEntity.attribute("LOGIN"),
        value: "imLogin"
      };
      const appSetValue: ISetValue = {
        attribute: appSetAttribute,
        setValues: [appAliasValue],
        value: [appId]
      };
      const userInsert: IInsert = {
        entity: userEntity,
        values: [loginAttributeValue, appSetValue]
      };
      await Crud.executeInsert(connection, userInsert);

      await AConnection.executeTransaction({
        connection,
        callback: async (transaction) => {
          const getInsertedUserSQL = `SELECT FIRST 1 * FROM ${userEntity.name} ORDER BY ID DESC`;
          const getInsertedUserParams = { login: loginAttributeValue.value };
          const userResult = await connection.executeReturning(
            transaction,
            getInsertedUserSQL,
            getInsertedUserParams);
          const insertedUserID = userResult.getNumber("ID");
          const insertedLogin = userResult.getString("LOGIN");
          expect(insertedLogin).toEqual(loginAttributeValue.value);

          const crossRelation = appSetAttribute.adapter.crossRelation;
          const crossSQL = `SELECT FIRST 1 * FROM ${crossRelation} where ${Constants.DEFAULT_CROSS_PK_OWN_NAME} = ${insertedUserID}`;
          const crossResult = await connection.executeReturning(
            transaction,
            crossSQL
          );
          const crossOwnKeyValue = crossResult.getNumber(Constants.DEFAULT_CROSS_PK_OWN_NAME);
          expect(crossOwnKeyValue).toEqual(insertedUserID);
          const crossRefKeyValue = crossResult.getNumber(Constants.DEFAULT_CROSS_PK_REF_NAME);
          expect(crossRefKeyValue).toEqual(appId);
          const crossAliasValue = crossResult.getString(appAliasValue.attribute.name);
          expect(crossAliasValue).toEqual(appAliasValue.value);
        }
      });
    });

    // it("insert with DetailAttriubute", async () => {
    //   const erModel: ERModel = await initERModelBuilder(async (builder) => {
    //     const erModel = await builder.initERModel();

    //     const placeEntity = await builder.addEntity(erModel, new Entity({ name: "PLACE", lName: { ru: { name: "Место" } } }));
    //     await builder.entityBuilder.addAttribute(placeEntity, new StringAttribute({
    //       name: "ADDRESS", lName: { ru: { name: "Адрес" } }
    //     }));

    //     const userEntity = await builder.addEntity(erModel, new Entity({ name: "USER_ENTITY", lName: { ru: { name: "Пользователь" } } }));

    //     await builder.entityBuilder.addAttribute(userEntity, new StringAttribute({
    //       name: "NAME", lName: { ru: { name: "Имя пользователя" } }, required: true,
    //       minLength: 1, maxLength: 36
    //     }));
    //     await builder.entityBuilder.addUnique(userEntity, [userEntity.attribute("NAME")]);

    //     await builder.entityBuilder.addAttribute(userEntity, new EntityAttribute({ name: "PLACE", lName: {}, entities: [placeEntity] }));

    //     await builder.entityBuilder.addAttribute(userEntity, new DetailAttribute({
    //       name: "DETAIL_PLACE", lName: { ru: { name: "Детальное место" } }, required: true, entities: [placeEntity], adapter: {
    //         masterLinks: [{
    //           detailRelation: placeEntity.name,
    //           link2masterField: "MASTER_KEY"
    //         }]
    //       }
    //     }));

    //     return erModel;
    //   });

    //   const placeEntity = erModel.entity("PLACE");
    //   const placeAddressAttribute = placeEntity.attribute("ADDRESS");

    //   const placeAddressValue1: IValue<ScalarAttribute, Scalar> = {
    //     attribute: placeAddressAttribute,
    //     value: "address1"
    //   };

    //   // console.log(placeEntity.attributes);
    //   // const placeMasterKeyAttribute = placeEntity.attribute("MASTER_KEY");
    //   // const placeMasterKeyValue: IValue<ScalarAttribute, Scalar> = {
    //   //   attribute: placeMasterKeyAttribute,
    //   //   value: 0
    //   // };

    //   const placeInsert1: IInsert = {
    //     entity: placeEntity,
    //     values: [placeAddressValue1]
    //   };
    //   await Crud.executeInsert(connection, placeInsert1);

    //   const placeAddressValue2: IValue<ScalarAttribute, Scalar> = {
    //     attribute: placeAddressAttribute,
    //     value: "address2"
    //   };
    //   const placeInsert2: IInsert = {
    //     entity: placeEntity,
    //     values: [placeAddressValue2]
    //   };
    //   await Crud.executeInsert(connection, placeInsert2);
    // });

  });
}
