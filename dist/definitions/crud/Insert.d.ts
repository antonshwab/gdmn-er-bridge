import { Step, IInsert } from "./Crud";
export declare type SetsThunk = (crossPKOwn: number) => Step[];
export declare type DetailsThunk = (masterKey: number) => Step[];
export declare function buildInsertSteps(input: IInsert): {
    returningStep: Step;
    setAttrsValuesThunk: SetsThunk;
    detailAttrsValuesThunk: DetailsThunk;
};
