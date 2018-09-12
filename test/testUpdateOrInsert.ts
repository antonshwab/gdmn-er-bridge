import { AConnection } from "gdmn-db";
import { ERBridge } from "../src/ERBridge";
import { ERModel, MAX_16BIT_INT, MIN_16BIT_INT, Entity, IntegerAttribute, StringAttribute, TimeStampAttribute, EntityAttribute, SetAttribute, ScalarAttribute, DetailAttribute } from "gdmn-orm";
import { IInsert, IValue, Scalar, Crud, ISetValue, IUpdateOrInsert, } from "../src/crud/Crud";
import { Constants } from "../src/ddl/Constants";

export function testUpdateOrInsert(connection: AConnection, initERModelBuilder): void {

  describe("ERBridge Update Or Insert", async () => {
    const erBridge = new ERBridge(connection);

    const executeERModel = async (erModel) => AConnection.executeTransaction({
      connection,
      callback: async (transaction) => {
        await erBridge.executeERModelBuilder(transaction, erModel);
      }
    });

    it("UpdateOrInsert Scalars and Entities", async () => {
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

      const appUidValue: IValue<ScalarAttribute, Scalar> = {
        attribute: appUidAttribute,
        value: "uniqueuid"
      };
      const insertApp: IInsert = {
        entity: appEntity,
        values: [appUidValue]
      };

      const appID = await Crud.executeInsert(connection, insertApp);

      const appIDValue: IValue<EntityAttribute, Scalar[]> = {
        attribute: backupEntityAttribute,
        value: [appID]
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
        values: [appIDValue, backupUidValue, backupAliasValue]
      };

      const bkpID = await Crud.executeInsert(connection, insertBackup);

      const newBackupAliasValue: IValue<ScalarAttribute, Scalar> = {
        attribute: backupAliasAttribute,
        value: "newAlias"
      };

      const updateOrInsertBackup1: IUpdateOrInsert = {
        pk: [bkpID],
        entity: appBackupEntity,
        values: [appIDValue, newBackupAliasValue]
      };

      await Crud.executeUpdateOrInsert(connection, updateOrInsertBackup1);

      const backupUidValue2: IValue<ScalarAttribute, Scalar> = {
        attribute: backupUidAttribute,
        value: "uniqueuid2"
      };

      const backupAliasValue2: IValue<ScalarAttribute, Scalar> = {
        attribute: backupAliasAttribute,
        value: "alias2"
      };

      const udpateOrInsertBackup2: IUpdateOrInsert = {
        entity: appBackupEntity,
        values: [appIDValue, backupUidValue2, backupAliasValue2]
      };

      const bkp2ID = await Crud.executeUpdateOrInsert(connection, udpateOrInsertBackup2);

      await AConnection.executeTransaction({
        connection,
        callback: async (transaction) => {

          const sql1 = `SELECT * FROM APPLICATION_BACKUPS WHERE ID = ${bkpID}`;
          const result1 = await connection.executeReturning(transaction, sql1);

          const uid1 = result1.getString(backupUidAttribute.name);
          expect(uid1).toEqual(backupUidValue.value);

          const alias1 = result1.getString(backupAliasAttribute.name);
          expect(alias1).toEqual(newBackupAliasValue.value);

          const expectedAppID = result1.getNumber(backupEntityAttribute.name);
          expect(expectedAppID).toEqual(appID);

          const sql2 = `SELECT * FROM APPLICATION_BACKUPS WHERE ID = ${bkp2ID}`;
          const result2 = await connection.executeReturning(transaction, sql2);

          const uid2 = result2.getString(backupUidAttribute.name);
          expect(uid2).toEqual(backupUidValue2.value);

          const alias2 = result2.getString(backupAliasAttribute.name);
          expect(alias2).toEqual(backupAliasValue2.value);

          const expectedAppID2 = result2.getNumber(backupEntityAttribute.name);
          expect(expectedAppID2).toEqual(appID);
        }
      });
    });

    it("UpdateOrInsert SetsAttributes", async () => {
      const erModel: ERModel = await initERModelBuilder(async (builder) => {
        const erModel = await builder.initERModel();

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
      const appID = await Crud.executeInsert(connection, appInsert);

      const appSetAttribute: SetAttribute = userEntity.attribute("APPLICATIONS") as SetAttribute;
      const appAliasAttribute: ScalarAttribute = appSetAttribute.attribute("ALIAS");
      const appAliasValue: IValue<ScalarAttribute, Scalar> = {
        attribute: appAliasAttribute,
        value: "appAlias"
      };
      const loginAttributeValue: IValue<ScalarAttribute, Scalar> = {
        attribute: userEntity.attribute("LOGIN"),
        value: "imLogin"
      };
      const appSetValue: ISetValue = {
        attribute: appSetAttribute,
        setValues: [appAliasValue],
        value: [appID]
      };
      const userInsert: IInsert = {
        entity: userEntity,
        values: [loginAttributeValue, appSetValue]
      };
      const userID = await Crud.executeInsert(connection, userInsert);

      const newAppAliasValue: IValue<ScalarAttribute, Scalar> = {
        attribute: appAliasAttribute,
        value: "newAppAlias"
      };
      const newAppSetValue: ISetValue = {
        attribute: appSetAttribute,
        setValues: [newAppAliasValue],
        value: [appID]
      };
      // TODO:
      // when pk more than just id ???
      // for example: primary keys for user must be [id, login]
      const userUpdateOrInsert: IUpdateOrInsert = {
        pk: [userID],
        entity: userEntity,
        values: [loginAttributeValue, newAppSetValue]
      };
      await Crud.executeUpdateOrInsert(connection, userUpdateOrInsert);

      await AConnection.executeTransaction({
        connection,
        callback: async (transaction) => {
          const sql = `SELECT * FROM ${userEntity.name} WHERE ID = ${userID}`;
          const params = { login: loginAttributeValue.value };
          const userResult = await connection.executeReturning(
            transaction, sql, params);
          const userLogin = userResult.getString("LOGIN");
          expect(userLogin).toEqual(loginAttributeValue.value);

          const crossRelation = appSetAttribute.adapter.crossRelation;
          const crossSQL = `SELECT FIRST 1 * FROM ${crossRelation} where ${Constants.DEFAULT_CROSS_PK_OWN_NAME} = ${userID}`;
          const crossResult = await connection.executeReturning(transaction, crossSQL);

          const crossOwnKeyValue = crossResult.getNumber(Constants.DEFAULT_CROSS_PK_OWN_NAME);
          expect(crossOwnKeyValue).toEqual(userID);
          const crossRefKeyValue = crossResult.getNumber(Constants.DEFAULT_CROSS_PK_REF_NAME);
          expect(crossRefKeyValue).toEqual(appID);
          const crossAliasValue = crossResult.getString(appAliasValue.attribute.name);
          expect(crossAliasValue).toEqual(newAppAliasValue.value);
        }
      });

    });


    it("UpdateOrInsert with DetailAttriubute", async () => {
      const erModel: ERModel = await initERModelBuilder(async (builder) => {
        const erModel = await builder.initERModel();

        const placeEntity = await builder.addEntity(erModel, new Entity({ name: "PLACE", lName: { ru: { name: "Место" } } }));
        await builder.entityBuilder.addAttribute(placeEntity, new StringAttribute({
          name: "ADDRESS", lName: { ru: { name: "Адрес" } }
        }));

        const userEntity = await builder.addEntity(erModel, new Entity({ name: "USER_ENTITY", lName: { ru: { name: "Пользователь" } } }));

        await builder.entityBuilder.addAttribute(userEntity, new StringAttribute({
          name: "NAME", lName: { ru: { name: "Имя пользователя" } }, required: true,
          minLength: 1, maxLength: 36
        }));
        await builder.entityBuilder.addUnique(userEntity, [userEntity.attribute("NAME")]);

        await builder.entityBuilder.addAttribute(userEntity, new EntityAttribute({ name: "PLACE", lName: {}, entities: [placeEntity] }));

        await builder.entityBuilder.addAttribute(userEntity, new DetailAttribute({
          name: "DETAIL_PLACE", lName: { ru: { name: "Детальное место" } }, required: false, entities: [placeEntity], adapter: {
            masterLinks: [{
              detailRelation: placeEntity.name,
              link2masterField: "MASTER_KEY"
            }]
          }
        }));

        return erModel;
      });

      const placeEntity = erModel.entity("PLACE");
      const placeAddressAttribute = placeEntity.attribute("ADDRESS");

      const placeAddressValue1: IValue<ScalarAttribute, Scalar> = {
        attribute: placeAddressAttribute,
        value: "address1"
      };
      const placeInsert1: IInsert = {
        entity: placeEntity,
        values: [placeAddressValue1]
      };
      const place1ID = await Crud.executeInsert(connection, placeInsert1);

      const placeAddressValue2: IValue<ScalarAttribute, Scalar> = {
        attribute: placeAddressAttribute,
        value: "address2"
      };
      const placeInsert2: IInsert = {
        entity: placeEntity,
        values: [placeAddressValue2]
      };
      const place2ID = await Crud.executeInsert(connection, placeInsert2);

      const userEntity = erModel.entity("USER_ENTITY");
      const userNameAttr = userEntity.attribute("NAME");
      const userNameValue: IValue<ScalarAttribute, Scalar> = {
        attribute: userNameAttr,
        value: "username"
      };

      const detailPlaceAttr = userEntity.attribute("DETAIL_PLACE") as DetailAttribute;
      const placeValue: IValue<DetailAttribute, Scalar[][]> = {
        attribute: detailPlaceAttr,
        value: [[place1ID], [place2ID]]
      };

      const userInsert: IInsert = {
        entity: userEntity,
        values: [userNameValue, placeValue]
      };

      const userID = await Crud.executeInsert(connection, userInsert);

      const placeAddressValue3: IValue<ScalarAttribute, Scalar> = {
        attribute: placeAddressAttribute,
        value: "address3"
      };
      const placeInsert3: IInsert = {
        entity: placeEntity,
        values: [placeAddressValue3]
      };
      const place3ID = await Crud.executeInsert(connection, placeInsert3);

      const newUserNameAttributeValue: IValue<ScalarAttribute, Scalar> = {
        attribute: userNameAttr,
        value: "newusername"
      };
      const newPlaceValue: IValue<DetailAttribute, Scalar[][]> = {
        attribute: detailPlaceAttr,
        value: [[place3ID]]
      };

      const userUpdateOrInsert: IUpdateOrInsert = {
        pk: [userID],
        entity: userEntity,
        values: [newUserNameAttributeValue, newPlaceValue]
      };
      await Crud.executeUpdateOrInsert(connection, userUpdateOrInsert);

      await AConnection.executeTransaction({
        connection,
        callback: async (transaction) => {
          const sql = `SELECT * FROM ${userEntity.name} WHERE ID = ${userID}`;

          const userResult = await connection.executeReturning(transaction, sql);
          const insertedUsername = userResult.getString("NAME");
          expect(insertedUsername).toEqual(newUserNameAttributeValue.value);
        }
      });

      await AConnection.executeTransaction({
        connection,
        callback: async (transaction) => {
          const sql = `SELECT * FROM ${placeEntity.name} WHERE MASTER_KEY = ${userID}`;
          const placeResult = await connection.executeQuery(transaction, sql);

          const expectedAddresses = [
            placeAddressValue1.value, placeAddressValue2.value, placeAddressValue3.value];

          let i = 0;
          while (await placeResult.next()) {
            const [, address, masterKey] = await placeResult.getAll();
            expect(masterKey).toEqual(userID);
            expect(address).toEqual(expectedAddresses[i]);
            i++;
          }
          await placeResult.close();
          expect(i).toEqual(3);

        }
      });

    });

  });
}
