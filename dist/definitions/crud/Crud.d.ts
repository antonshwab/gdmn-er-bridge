import { Entity, SetAttribute, DetailAttribute, Attribute, ScalarAttribute, EntityAttribute } from "gdmn-orm";
import { AConnection } from "gdmn-db";
export declare type Scalar = string | boolean | number | Date | null;
export interface IValue<AttrType extends Attribute, valueType> {
    attribute: AttrType;
    value: valueType;
}
export interface ISetValue extends IValue<SetAttribute, Scalar[]> {
    setValues: Array<IValue<ScalarAttribute, Scalar>>;
}
export interface IUpdate extends IInsert {
    pk: any[];
}
export interface IUpdateOrInsert extends IInsert {
    pk?: any[];
}
export declare type Values = Array<IValue<ScalarAttribute, Scalar> | IValue<EntityAttribute, Scalar[]> | IValue<DetailAttribute, Scalar[][]> | ISetValue>;
export interface IInsert {
    entity: Entity;
    values: Values;
}
export interface IDelete {
    pk: any[];
    entity: Entity;
}
export interface IAttributesByType {
    scalars: Array<IValue<ScalarAttribute, Scalar>>;
    entities: Array<IValue<EntityAttribute, Scalar[]>>;
    details: Array<IValue<DetailAttribute, Scalar[][]>>;
    sets: Array<ISetValue>;
}
export declare type Step = {
    sql: string;
    params: {};
};
export declare abstract class Crud {
    private static run;
    static executeInsert(connection: AConnection, input: IInsert): Promise<void>;
    static executeUpdateOrInsert(connection: AConnection, input: IUpdateOrInsert): Promise<void>;
    static executeUpdate(connection: AConnection, input: IUpdate): Promise<void>;
    static executeDelete(connection: AConnection, input: IDelete): Promise<void>;
}
