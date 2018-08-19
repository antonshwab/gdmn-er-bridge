import { Entity, Attribute } from "gdmn-orm";
import { AConnection } from "gdmn-db";
export interface IInsertData {
    entity: Entity;
    next?: IInsertData;
    datums: IDatum[];
}
export interface IDatum {
    attribute: Attribute;
    value: any;
}
export declare abstract class Insert {
    static execute(connection: AConnection, insertData: IInsertData): Promise<void>;
}
