"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
function createDefaultDomains(connection, transaction) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, connection.execute(transaction, "\n    CREATE DOMAIN DINTKEY AS INTEGER\n\t    CHECK (VALUE > 0) NOT NULL\n  ")];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, connection.execute(transaction, "\n    CREATE DOMAIN DPARENT AS INTEGER\n  ")];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, connection.execute(transaction, "\n    CREATE DOMAIN DFOREIGNKEY AS INTEGER\n  ")];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, connection.execute(transaction, "\n    CREATE DOMAIN DLB AS INTEGER\n\t    DEFAULT 1 NOT NULL\n  ")];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, connection.execute(transaction, "\n    CREATE DOMAIN DRB AS INTEGER\n\t    DEFAULT 2 NOT NULL\n  ")];
                case 5:
                    _a.sent();
                    return [4 /*yield*/, connection.execute(transaction, "\n    CREATE DOMAIN DRUID AS VARCHAR(21) \n      NOT NULL\n  ")];
                case 6:
                    _a.sent();
                    return [4 /*yield*/, connection.execute(transaction, "\n    CREATE DOMAIN DBOOLEAN AS SMALLINT\n\t    DEFAULT 0\n\t    CHECK (VALUE IN (0, 1))\n  ")];
                case 7:
                    _a.sent();
                    return [4 /*yield*/, connection.execute(transaction, "\n    CREATE DOMAIN DTABLENAME AS VARCHAR(31)\n\t    CHECK (VALUE > '')\n  ")];
                case 8:
                    _a.sent();
                    return [4 /*yield*/, connection.execute(transaction, "\n    CREATE DOMAIN DFIELDNAME AS VARCHAR (31)\n      CHECK (VALUE > '')\n  ")];
                case 9:
                    _a.sent();
                    return [4 /*yield*/, connection.execute(transaction, "\n    CREATE DOMAIN DTEXT255 AS VARCHAR(255)\n  ")];
                case 10:
                    _a.sent();
                    return [4 /*yield*/, connection.execute(transaction, "\n    CREATE DOMAIN DTEXT180 AS VARCHAR(180)\n  ")];
                case 11:
                    _a.sent();
                    return [4 /*yield*/, connection.execute(transaction, "\n    CREATE DOMAIN DTEXT60 AS VARCHAR(60)\n  ")];
                case 12:
                    _a.sent();
                    return [4 /*yield*/, connection.execute(transaction, "\n    CREATE DOMAIN DNAME AS VARCHAR(60) \n      NOT NULL\n  ")];
                case 13:
                    _a.sent();
                    return [4 /*yield*/, connection.execute(transaction, "\n    CREATE DOMAIN DDOCUMENTTYPE AS VARCHAR(1)\n\t    CHECK ((VALUE = 'B') OR (VALUE = 'D'))\n  ")];
                case 14:
                    _a.sent();
                    return [4 /*yield*/, connection.execute(transaction, "\n    CREATE DOMAIN DCLASSNAME AS VARCHAR(40)\n  ")];
                case 15:
                    _a.sent();
                    return [4 /*yield*/, connection.execute(transaction, "\n    CREATE DOMAIN DNUMERATIONBLOB AS BLOB SUB_TYPE -1 \n      SEGMENT SIZE 256\n  ")];
                case 16:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.createDefaultDomains = createDefaultDomains;
//# sourceMappingURL=createDefaultDomains.js.map