import { AConnection } from "gdmn-db";
import { ERBridge } from "../src/ERBridge";
import { ERModel, MAX_16BIT_INT, MIN_16BIT_INT, Entity, IntegerAttribute, StringAttribute, TimeStampAttribute, EntityAttribute, SetAttribute } from "gdmn-orm";
import { Insert, IInsertData, } from "../src/crud/insert/Insert";
import { Constants } from "../src/ddl/Constants";

export function insertTest(
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

    // it("insert a few simple scalar attributes", async () => {
    //   const {
    //     entity,
    //     integerAttribute,
    //     stringAttribute
    //   } = await initERModelBuilder(async (builder) => {
    //     const erModel = await builder.initERModel();
    //     const entity = await builder.addEntity(erModel, new Entity({
    //       name: "TEST",
    //       lName: { ru: { name: "entity name", fullName: "full entity name" } }
    //     }));

    //     const integerAttribute = await builder.entityBuilder.addAttribute(entity, new IntegerAttribute({
    //       name: "FIELD1", lName: { ru: { name: "Поле 1", fullName: "FULLNAME" } }, required: true,
    //       minValue: MIN_16BIT_INT, maxValue: MAX_16BIT_INT, defaultValue: -10000,
    //     }));

    //     const stringAttribute = await builder.entityBuilder.addAttribute(entity, new StringAttribute({
    //       name: "FIELD2", lName: { ru: { name: "Поле 2" } },
    //       minLength: 1, maxLength: 160, defaultValue: "test default", autoTrim: true
    //     }));

    //     return {
    //       entity,
    //       integerAttribute,
    //       stringAttribute
    //     };
    //   });

    //   // const datum1: IDatum = {
    //   //   attribute: integerAttribute,
    //   //   value: 777
    //   // };

    //   // const datum2: IDatum = {
    //   //   attribute: stringAttribute,
    //   //   value: "iamstring"
    //   // };

    //   // const insertData: IInsertData = {
    //   //   entity,
    //   //   datums: [datum1, datum2]
    //   // };

    //   const attrToValue1 = {
    //     name: "FIELD1",
    //     value: 777
    //   };

    //   const attrToValue2 = {
    //     name: "FIELD2",
    //     value: "iamstring"
    //   };

    //   const insertData: IInsertData = {
    //     entity,
    //     attrsToValues: [attrToValue1, attrToValue2]
    //   };

    //   await Insert.execute(connection, insertData);

    //   await AConnection.executeTransaction({
    //     connection,
    //     callback: async (transaction) => {
    //       const result = await connection.executeReturning(transaction,
    //         `
    //                 SELECT FIRST 1
    //                   test.FIELD1,
    //                   test.FIELD2
    //                 FROM TEST test
    //             `);

    //       const insertedNumber = result.getNumber("FIELD1");
    //       console.log("Inserted number: ", insertedNumber);
    //       expect(insertedNumber).toEqual(attrToValue1.value);

    //       const insertedString = result.getString("FIELD2");
    //       console.log("Inserted string: ", insertedString);
    //       expect(insertedString).toEqual(attrToValue2.value);
    //     }
    //   });

    // });

    // it("insert with EntityAttribute", async () => {
    //   const {
    //     appUid,
    //     appEntity,
    //     backupUid,
    //     backupAlias,
    //     entityAttribute,
    //     backupEntity
    //   } = await initERModelBuilder(async (builder) => {
    //     const erModel = await builder.initERModel();

    //     // APPLICATION
    //     const appEntity = await builder.addEntity(erModel, new Entity({
    //       name: "APPLICATION", lName: { ru: { name: "Приложение" } }
    //     }));

    //     const appUid = await builder.entityBuilder.addAttribute(appEntity, new StringAttribute({
    //       name: "UID", lName: { ru: { name: "Идентификатор приложения" } }, required: true, minLength: 1, maxLength: 36
    //     }));

    //     await builder.entityBuilder.addUnique(appEntity, [appEntity.attribute("UID")]);

    //     await builder.entityBuilder.addAttribute(appEntity, new TimeStampAttribute({
    //       name: "CREATIONDATE", lName: { ru: { name: "Дата создания" } }, required: true, defaultValue: "CURRENT_TIMESTAMP"
    //     }));

    //     // APPLICATION_BACKUPS
    //     const backupEntity = await builder.addEntity(erModel, new Entity({
    //       name: "APPLICATION_BACKUPS", lName: { ru: { name: "Бэкап" } }
    //     }));
    //     const backupUid = await builder.entityBuilder.addAttribute(backupEntity, new StringAttribute({
    //       name: "UID", lName: { ru: { name: "Идентификатор бэкапа" } }, required: true, minLength: 1, maxLength: 36
    //     }));

    //     await builder.entityBuilder.addUnique(backupEntity, [backupEntity.attribute("UID")]);

    //     const entityAttribute = await builder.entityBuilder.addAttribute(backupEntity,
    //       new EntityAttribute({
    //         name: "APP", lName: { ru: { name: " " } }, required: true, entities: [appEntity]
    //       })
    //     );

    //     await builder.entityBuilder.addAttribute(backupEntity, new TimeStampAttribute({
    //       name: "CREATIONDATE", lName: { ru: { name: "Дата создания" } }, required: true, defaultValue: "CURRENT_TIMESTAMP"
    //     }));

    //     const backupAlias = await builder.entityBuilder.addAttribute(backupEntity, new StringAttribute({
    //       name: "ALIAS", lName: { ru: { name: "Название бэкапа" } }, required: true, minLength: 1, maxLength: 120
    //     }));

    //     return { appUid, appEntity, backupUid, backupAlias, entityAttribute, backupEntity };
    //   });

    //   // create app
    //   const appUidValue = "superpuperuid";
    //   // const appData: IInsertData = {
    //   //   entity: appEntity,
    //   //   datums: [{
    //   //     attribute: appUid,
    //   //     value: appUidValue
    //   //   }]
    //   // };
    //   const appData: IInsertData = {
    //     entity: appEntity,
    //     attrsToValues: [
    //       {
    //         name: "UID",
    //         value: appUidValue
    //       }
    //     ]
    //   };
    //   await Insert.execute(connection, appData);

    //   const appId = await AConnection.executeTransaction({
    //     connection,
    //     callback: async (transaction) => {
    //       const result = await connection.executeReturning(transaction, `
    //             SELECT FIRST 1
    //               app.ID
    //             FROM APPLICATION app
    //             WHERE app.UID = :appUid
    // `, { appUid: appUidValue });

    //       return result.getNumber("ID");
    //     }
    //   });

    //   // const appIdDatum = {
    //   //   attribute: entityAttribute,
    //   //   value: appId
    //   // };
    //   // const backupUidDatum = {
    //   //   attribute: backupUid,
    //   //   value: "im-uid",
    //   // };
    //   // const backupAliasDatum = {
    //   //   attribute: backupAlias,
    //   //   value: "imalias"
    //   // };
    //   // const datums = [backupUidDatum, backupAliasDatum, appIdDatum];
    //   // const insertData: IInsertData = {
    //   //   entity: backupEntity,
    //   //   datums
    //   // };

    //   const appIdDatum = {
    //     name: entityAttribute.name,
    //     value: appId
    //   };
    //   const backupUidDatum = {
    //     name: backupUid.name,
    //     value: "im-uid",
    //   };
    //   const backupAliasDatum = {
    //     name: backupAlias.name,
    //     value: "imalias"
    //   };

    //   const insertData: IInsertData = {
    //     entity: backupEntity,
    //     attrsToValues: [
    //       appIdDatum, backupUidDatum, backupAliasDatum
    //     ]
    //   };

    //   await Insert.execute(connection, insertData);

    //   await AConnection.executeTransaction({
    //     connection,
    //     callback: async (transaction) => {
    //       const result = await connection.executeReturning(transaction,
    //         `
    //                         SELECT FIRST 1
    //                           backup.UID,
    //                           backup.ALIAS,
    //                           backup.APP
    //                         FROM APPLICATION_BACKUPS backup
    //                     `);

    //       const uid = result.getString(backupUidDatum.name);
    //       console.log("Inserted bkp's uid: ", uid);
    //       expect(uid).toEqual(backupUidDatum.value);

    //       const alias = result.getString(backupAliasDatum.name);
    //       console.log("Inserted bkp's alias: ", alias);
    //       expect(alias).toEqual(backupAliasDatum.value);

    //       const app = result.getNumber(appIdDatum.name);
    //       console.log("Inserted bkp's app id: ", app);
    //       expect(app).toEqual(appIdDatum.value);
    //     }
    //   });
    // });

    it("insert with SetAttribute", async () => {
      const { userLogin, userEntity, appEntity, appUid, appSet, appAlias } = await initERModelBuilder(async (builder) => {
        const erModel = await builder.initERModel();

        // APPLICATION
        const appEntity = await builder.addEntity(erModel, new Entity({
          name: "APPLICATION", lName: { ru: { name: "Приложение" } }
        }));

        const appUid = await builder.entityBuilder.addAttribute(appEntity, new StringAttribute({
          name: "UID", lName: { ru: { name: "Идентификатор приложения" } }, required: true, minLength: 1, maxLength: 36
        }));

        await builder.entityBuilder.addUnique(appEntity, [appEntity.attribute("UID")]);

        await builder.entityBuilder.addAttribute(appEntity, new TimeStampAttribute({
          name: "CREATIONDATE", lName: { ru: { name: "Дата создания" } }, required: true, defaultValue: "CURRENT_TIMESTAMP"
        }));

        const userEntity = await builder.addEntity(erModel, new Entity({
          name: "APP_USER", lName: { ru: { name: "Пользователь" } }
        }));

        const userLogin = await builder.entityBuilder.addAttribute(userEntity, new StringAttribute({
          name: "LOGIN", lName: { ru: { name: "Логин" } }, required: true, minLength: 1, maxLength: 32
        }));

        const appSet = new SetAttribute({
          name: "APPLICATIONS", lName: { ru: { name: "Приложения" } }, entities: [appEntity],
          adapter: { crossRelation: "APP_USER_APPLICATIONS" }
        })

        const appAlias = appSet.add(new StringAttribute({
          name: "ALIAS", lName: { ru: { name: "Название приложения" } }, required: true, minLength: 1, maxLength: 120
        }));

        await builder.entityBuilder.addAttribute(userEntity, appSet);

        return { userLogin, userEntity, appEntity, appUid, appSet, appAlias };
      });

      const userLoginValue = "imlogin";
      const userInsertData: IInsertData = {
        entity: userEntity,
        attrsToValues: [{
          attribute: userLogin,
          value: userLoginValue
        }]
      };
      await Insert.execute(connection, userInsertData);

      const userId = await AConnection.executeTransaction({
        connection,
        callback: async (transaction) => {
          const result = await connection.executeReturning(transaction, `
                SELECT FIRST 1
                  ID
                FROM APP_USER
                WHERE LOGIN = :userLogin
`, { userLogin: userLoginValue });

          return result.getNumber("ID");
        }
      });

      const appUidValue = "uniqueUID";
      // const appUid = uuidV1().toUpperCase();
      const appAliasValue = "appalias";
      const appInsertData: IInsertData = {
        entity: appEntity,
        attrsToValues: [{
          attribute: appUid,
          value: appUidValue
        }],
        links: [
          {
            attribute: appSet,
            attrsToValues: [
              {
                attribute: appAlias,
                value: appAliasValue
              }
            ],
            pkValues: [userId]
            // OR more visually
            // pkToValues: {
            //   [Constants.DEFAULT_CROSS_PK_OWN_NAME]: userId,
            // }
          }
        ]
      };

      // update user's SetAttribute for new app (create app, update cross table)


      entity: userEntity,
        values: [
          {
            attribute: appUidAttribute,
            setAttributes: [
              {
                attribute: appSetAttribute,
                values: [
                  {
                    "KEY1",
                    19
                  },
                  {
                    attribute: appSetAlias,
                    value: "iamalias"
                  }
                ]
              }
            ],
            values: ["unique id"]
          },
          {
            attribute: appAliasAttribute,
            values: ["iamalias"]
          }
        ]
    }


      const insert = {
      entity: user,
      values:
      }
    //

    console.log("appInsertData: ", appInsertData);
    await Insert.execute(connection, appInsertData);

    await AConnection.executeTransaction({
      connection,
      callback: async (transaction) => {
        const resultCross = await connection.executeReturning(transaction,
          `SELECT FIRST 1
${Constants.DEFAULT_CROSS_PK_OWN_NAME}, ${Constants.DEFAULT_CROSS_PK_REF_NAME}, ALIAS FROM APP_USER_APPLICATIONS
WHERE ${Constants.DEFAULT_CROSS_PK_OWN_NAME} = :userId`,
          { userId });

        const insertedUserId = resultCross.getNumber(Constants.DEFAULT_CROSS_PK_OWN_NAME);
        expect(insertedUserId).toEqual(userId);

        // TODO: Get id of inserted application and check
        // const insertedAppId = result.getNumber(Constants.DEFAULT_CROSS_PK_REF_NAME);

        const insertedAlias = resultCross.getString(appAlias.name);
        expect(insertedAlias).toEqual(appAliasValue);

        const resultApp = await connection.executeReturning(transaction,
          `SELECT FIRST 1 * from APPLICATION WHERE UID = :appUidValue`, {
            appUidValue
          });

        const insertedApp = resultApp.getString(appUid.name);
        expect(insertedApp).toEqual(appUidValue);
      }
    });
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
