import { IInsert, Step } from "./Crud";
export declare type setsThunk = (crossPKOwnValue: number) => Step[];
export declare type detailsThunk = (masterKeyValue: number) => Step[];
export declare function buildInsertSteps(input: IInsert): Array<Step | setsThunk | detailsThunk>;
