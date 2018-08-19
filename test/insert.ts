import { AConnection } from "gdmn-db";
import { ERBridge } from "../src/ERBridge";
import { ERModel, MAX_16BIT_INT, MIN_16BIT_INT, Entity, IntegerAttribute, StringAttribute, TimeStampAttribute, EntityAttribute, SetAttribute } from "gdmn-orm";
import { IDatum, Insert, IInsertData, IEntityInsert, IScalarInsert } from "../src/crud/insert/Insert";

export function insertTest(connection: AConnection): void {

  describe("ERBridge INSERT", async () => {
    const erBridge = new ERBridge(connection);

    it("insert a few simple scalar attributes", async () => {
      const erModel = ERBridge.completeERModel(new ERModel());
      const entity = ERBridge.addEntityToERModel(erModel, new Entity({
        name: "TEST",
        lName: { ru: { name: "entity name", fullName: "full entity name" } }
      }));

      const integerAttribute = entity.add(new IntegerAttribute({
        name: "FIELD1", lName: { ru: { name: "Поле 1", fullName: "FULLNAME" } }, required: true,
        minValue: MIN_16BIT_INT, maxValue: MAX_16BIT_INT, defaultValue: -10000,
      }));

      const stringAttribute = entity.add(new StringAttribute({
        name: "FIELD2", lName: { ru: { name: "Поле 2" } },
        minLength: 1, maxLength: 160, defaultValue: "test default", autoTrim: true
      }));

      await erBridge.importToDatabase(erModel);

      const datum1: IDatum = {
        attribute: integerAttribute,
        value: 777
      };

      const datum2: IDatum = {
        attribute: stringAttribute,
        value: "iamstring"
      };

      const insertData: IInsertData = {
        entity,
        datums: [datum1, datum2]
      };

      await Insert.execute(connection, insertData);

      await AConnection.executeTransaction({
        connection,
        callback: async (transaction) => {
          const result = await connection.executeReturning(transaction,
            `
                    SELECT FIRST 1
                      test.FIELD1,
                      test.FIELD2
                    FROM TEST test
                `);

          const insertedNumber = result.getNumber("FIELD1");
          console.log("Inserted number: ", insertedNumber);
          expect(insertedNumber).toEqual(datum1.value);

          const insertedString = result.getString("FIELD2");
          console.log("Inserted string: ", insertedString);
          expect(insertedString).toEqual(datum2.value);
        }
      });

    });

    it("insert with EntityAttribute", async () => {
      const erModel = ERBridge.completeERModel(new ERModel());

      // APPLICATION
      const appEntity = ERBridge.addEntityToERModel(erModel, new Entity({
        name: "APPLICATION", lName: { ru: { name: "Приложение" } }
      }));
      const appUid = appEntity.add(new StringAttribute({
        name: "UID", lName: { ru: { name: "Идентификатор приложения" } }, required: true, minLength: 1, maxLength: 36
      }));
      appEntity.addUnique([appUid]);
      appEntity.add(new TimeStampAttribute({
        name: "CREATIONDATE", lName: { ru: { name: "Дата создания" } }, required: true, defaultValue: "CURRENT_TIMESTAMP"
      }));

      // APPLICATION_BACKUPS
      const backupEntity = ERBridge.addEntityToERModel(erModel, new Entity({
        name: "APPLICATION_BACKUPS", lName: { ru: { name: "Бэкап" } }
      }));
      const backupUid = backupEntity.add(new StringAttribute({
        name: "UID", lName: { ru: { name: "Идентификатор бэкапа" } }, required: true, minLength: 1, maxLength: 36
      }));
      backupEntity.addUnique([backupUid]);
      const appEntityAttribute = backupEntity.add(new EntityAttribute({
        name: "APP", lName: { ru: { name: "Приложение" } }, required: true, entities: [appEntity]
      }));
      backupEntity.add(new TimeStampAttribute({
        name: "CREATIONDATE", lName: { ru: { name: "Дата создания" } }, required: true, defaultValue: "CURRENT_TIMESTAMP"
      }));
      const backupAlias = backupEntity.add(new StringAttribute({
        name: "ALIAS", lName: { ru: { name: "Название бэкапа" } }, required: true, minLength: 1, maxLength: 120
      }));

      await erBridge.importToDatabase(erModel);

      // console.log("Application Entity: ", appEntity.serialize());
      // console.log("Application Entity Primary Key: ", appEntity.pk);
      // console.log("AppBackup Entity: ", backupEntity.serialize());
      // console.log("After");

      // create app
      const appUidValue = "superpuperuid";
      const appData: IInsertData = {
        entity: appEntity,
        datums: [{
          attribute: appUid,
          value: appUidValue
        }]
      };
      await Insert.execute(connection, appData);

      const appId = await AConnection.executeTransaction({
        connection,
        callback: async (transaction) => {
          const result = await connection.executeReturning(transaction, `
                SELECT FIRST 1
                  app.ID
                FROM APPLICATION app
                WHERE app.UID = :appUid
    `, { appUid: appUidValue });

          return result.getNumber("ID");
        }
      });

      const appIdDatum = {
        attribute: appEntityAttribute,
        value: appId
      };
      const backupUidDatum = {
        attribute: backupUid,
        value: "im-uid",
      };
      const backupAliasDatum = {
        attribute: backupAlias,
        value: "imalias"
      };
      const datums = [backupUidDatum, backupAliasDatum, appIdDatum];

      // TODO:
      const insertData: IInsertData = {
        entity: backupEntity,
        datums
      };

      await Insert.execute(connection, insertData);

      await AConnection.executeTransaction({
        connection,
        callback: async (transaction) => {
          const result = await connection.executeReturning(transaction,
            `
                            SELECT FIRST 1
                              backup.UID,
                              backup.ALIAS
                            FROM APPLICATION_BACKUPS backup
                        `);

          const uid = result.getString(backupUidDatum.attribute.name);
          console.log("Inserted bkp's uid: ", uid);
          expect(uid).toEqual(backupUidDatum.value);

          const alias = result.getString(backupAliasDatum.attribute.name);
          console.log("Inserted bkp's alias: ", alias);
          expect(alias).toEqual(backupAliasDatum.value);
        }
      });
    });

    it("insert with SetAttribute", async () => {
      const erModel = ERBridge.completeERModel(new ERModel());

      // APPLICATION
      const appEntity = ERBridge.addEntityToERModel(erModel, new Entity({
        name: "APPLICATION", lName: { ru: { name: "Приложение" } }
      }));
      const appUid = appEntity.add(new StringAttribute({
        name: "UID", lName: { ru: { name: "Идентификатор приложения" } }, required: true, minLength: 1, maxLength: 36
      }));
      appEntity.addUnique([appUid]);
      appEntity.add(new TimeStampAttribute({
        name: "CREATIONDATE", lName: { ru: { name: "Дата создания" } }, required: true, defaultValue: "CURRENT_TIMESTAMP"
      }));

      // APP_USER
      const userEntity = ERBridge.addEntityToERModel(erModel, new Entity({
        name: "APP_USER", lName: { ru: { name: "Пользователь" } }
      }));
      const userLogin = userEntity.add(new StringAttribute({
        name: "LOGIN", lName: { ru: { name: "Логин" } }, required: true, minLength: 1, maxLength: 32
      }));
      const appSet = userEntity.add(new SetAttribute({
        name: "APPLICATIONS", lName: { ru: { name: "Приложения" } }, entities: [appEntity],
        adapter: { crossRelation: "APP_USER_APPLICATIONS" }
      }));
      appSet.add(new StringAttribute({
        name: "ALIAS", lName: { ru: { name: "Название приложения" } }, required: true, minLength: 1, maxLength: 120
      }));

      await erBridge.importToDatabase(erModel);

      const datums = [
        {
          attribute: userLogin,
          value: "imlogin"
        },
      ];
      // await Insert.execute(connection, userEntity, datums);
      const userInsertData = {
        entity: userEntity,
        datums
      }
      await Insert.execute(connection);

      // input: userEntity, appEntity, application'n datums;
      const appDatums = [
        {
          attribute: appUid,
          value: "uniqueuid"
        },
      ];

      // 1. add app to APPLICATION
      // 2. Add (key1, key2) in APP_USER_APPLICATIONS
      // userEntity for find out name of m:n relation table
      await Insert.execute(connection, userEntity, appEntity, appDatums);
    });

    // it("insert with DetailAttribute", async () => {
    //   const erModel = ERBridge.completeERModel(new ERModel());

    //   const appEntity = ERBridge.addEntityToERModel(erModel, new Entity({
    //     name: "APPLICATION", lName: { ru: { name: "Приложение" } }
    //   }));

    //   const appUid = appEntity.add(new StringAttribute({
    //     name: "UID", lName: { ru: { name: "Идентификатор приложения" } }, required: true, minLength: 1, maxLength: 36
    //   }));
    //   appEntity.addUnique([appUid]);
    //   appEntity.add(new TimeStampAttribute({
    //     name: "CREATIONDATE", lName: { ru: { name: "Дата создания" } }, required: true, defaultValue: "CURRENT_TIMESTAMP"
    //   }));
    // });

  });
}
