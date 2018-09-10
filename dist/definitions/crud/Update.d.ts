import { Step, IUpdate, IValue, Scalar } from "./Crud";
import { DetailAttribute } from "gdmn-orm";
export declare function buildUpdateSteps(input: IUpdate): Step[];
export declare function makeDetailsSteps(pk: any[], details: IValue<DetailAttribute, Scalar[][]>[]): Step[];
