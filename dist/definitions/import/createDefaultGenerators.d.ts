import { AConnection, ATransaction } from "gdmn-db";
export declare const G_UNIQUE_NAME = "UNIQUE";
export declare const G_UNIQUE_DDL_NAME = "DDL";
export declare function createDefaultGenerators(connection: AConnection, transaction: ATransaction): Promise<void>;
