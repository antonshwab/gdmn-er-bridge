import { AConnection } from "gdmn-db";
import { ERBridge } from "../src/ERBridge";
import { ERModel, MAX_16BIT_INT, MIN_16BIT_INT, Entity, IntegerAttribute, StringAttribute, TimeStampAttribute, EntityAttribute, SetAttribute, ScalarAttribute, DetailAttribute } from "gdmn-orm";
import { IInsert, IValue, Scalar, Crud, ISetValue, IUpdateOrInsert, IUpdate, } from "../src/crud/Crud";
import { Constants } from "../src/ddl/Constants";

export function testUpdate(connection: AConnection, initERModelBuilder): void {

  describe("ERBridge Update", async () => {
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
      await Crud.executeInsert(connection, insertApp);

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

      const insertedPK = await AConnection.executeTransaction({
        connection,
        callback: async (transaction) => {
          const result = await connection.executeReturning(transaction, `
                SELECT FIRST 1
                  bkp.ID
                FROM APPLICATION_BACKUPS bkp
                WHERE bkp.UID = :bkpUid`,
            { bkpUid: backupUidValue.value });

          return result.getNumber("ID");
        },
      });

      const newBackupAliasValue: IValue<ScalarAttribute, Scalar> = {
        attribute: backupAliasAttribute,
        value: "newAlias"
      };

      const updateBackup: IUpdate = {
        pk: [insertedPK],
        entity: appBackupEntity,
        values: [appIdValue, backupUidValue, newBackupAliasValue]
      };

      await Crud.executeUpdate(connection, updateBackup);

      await AConnection.executeTransaction({
        connection,
        callback: async (transaction) => {
          const selectSql = `SELECT FIRST 1 bkp.UID, bkp.ALIAS, bkp.APP FROM APPLICATION_BACKUPS bkp`;

          const result = await connection.executeReturning(transaction, selectSql);

          const uid = result.getString(backupUidAttribute.name);
          expect(uid).toEqual(backupUidValue.value);

          const alias = result.getString(backupAliasAttribute.name);
          expect(alias).toEqual(newBackupAliasValue.value);

          const app = result.getNumber(backupEntityAttribute.name);
          expect(app).toEqual(appIdValue.value[0]);
        }
      });
    });

    it("UpdateOrInsert SetsAttributes", async () => {
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
        value: "appAlias"
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

      const userID = await AConnection.executeTransaction({
        connection,
        callback: async (transaction) => {
          const sql = `SELECT FIRST 1 ID FROM APP_USER WHERE LOGIN = :login`;
          const params = { login: loginAttributeValue.value };
          const result = await connection.executeReturning(transaction, sql, params);
          return result.getNumber("ID");
        }
      });

      // TODO:
      // when pk more than just id ???
      // for example: primary keys for user must be [id, login]
      const newAppAliasValue: IValue<ScalarAttribute, Scalar> = {
        attribute: appAliasAttribute,
        value: "newAppAlias"
      };
      const newAppSetValue: ISetValue = {
        attribute: appSetAttribute,
        setValues: [newAppAliasValue],
        value: [appId]
      };
      const userUpdate: IUpdate = {
        pk: [userID],
        entity: userEntity,
        values: [loginAttributeValue, newAppSetValue]
      };
      await Crud.executeUpdate(connection, userUpdate);

      await AConnection.executeTransaction({
        connection,
        callback: async (transaction) => {
          const sql = `SELECT FIRST 1 * FROM ${userEntity.name} ORDER BY ID DESC`;
          const params = { login: loginAttributeValue.value };
          const userResult = await connection.executeReturning(
            transaction, sql, params);
          const userID = userResult.getNumber("ID");
          const userLogin = userResult.getString("LOGIN");
          expect(userLogin).toEqual(loginAttributeValue.value);

          const crossRelation = appSetAttribute.adapter.crossRelation;
          const crossSQL = `SELECT FIRST 1 * FROM ${crossRelation} where ${Constants.DEFAULT_CROSS_PK_OWN_NAME} = ${userID}`;
          const crossResult = await connection.executeReturning(transaction, crossSQL);

          const crossOwnKeyValue = crossResult.getNumber(Constants.DEFAULT_CROSS_PK_OWN_NAME);
          expect(crossOwnKeyValue).toEqual(userID);
          const crossRefKeyValue = crossResult.getNumber(Constants.DEFAULT_CROSS_PK_REF_NAME);
          expect(crossRefKeyValue).toEqual(appId);
          const crossAliasValue = crossResult.getString(appAliasValue.attribute.name);
          expect(crossAliasValue).toEqual(newAppAliasValue.value);
        }
      });

    });



  });
}
