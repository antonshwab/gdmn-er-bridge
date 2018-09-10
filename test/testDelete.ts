import { AConnection } from "gdmn-db";
import { ERBridge } from "../src/ERBridge";
import { ERModel, MAX_16BIT_INT, MIN_16BIT_INT, Entity, IntegerAttribute, StringAttribute, TimeStampAttribute, EntityAttribute, SetAttribute, ScalarAttribute, DetailAttribute } from "gdmn-orm";
import { IInsert, IValue, Scalar, Crud, ISetValue, IUpdateOrInsert, IDelete, } from "../src/crud/Crud";
import { Constants } from "../src/ddl/Constants";

export function testDelete(
  connection: AConnection,
  initERModelBuilder): void {

  describe("ERBridge Delete", async () => {

    const erBridge = new ERBridge(connection);

    const executeERModel = async (erModel) => AConnection.executeTransaction({
      connection,
      callback: async (transaction) => {
        await erBridge.executeERModelBuilder(transaction, erModel);
      }
    });

    it("Delete entity with SetsAttributes", async () => {
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
      const userUpdateOrInsert: IUpdateOrInsert = {
        pk: [userID],
        entity: userEntity,
        values: [loginAttributeValue, newAppSetValue]
      };
      await Crud.executeUpdateOrInsert(connection, userUpdateOrInsert);

      const deleteUser: IDelete = {
        pk: [userID],
        entity: userEntity,
      };

      await Crud.executeDelete(connection, deleteUser);

      await AConnection.executeTransaction({
        connection,
        callback: async (transaction) => {
          const sql = `SELECT * FROM ${userEntity.name} WHERE ID = ${userID}`;
          const userResult = await connection.executeQuery(transaction, sql);
          const next = await userResult.next();
          await userResult.close();
          expect(next).toBeFalsy();

        }
      });

    });


  });
}
