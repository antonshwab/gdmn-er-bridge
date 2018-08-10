import {Attribute, AttributeAdapter, EnumAttribute, LName, StringAttribute} from "gdmn-orm";

export type createDomainFunc =
  (attributeName: string, lName: LName, adapter?: AttributeAdapter) => Attribute;
export const gdDomains: { [name: string]: createDomainFunc } = {
  "DGENDER": (name: string, lName: LName, adapter?: AttributeAdapter) =>
    new EnumAttribute({name, lName, values: [{value: "M"}, {value: "F"}, {value: "N"}], adapter}),
  // следующие домены надо проверить, возможно уже нигде и не используются
  "DTYPETRANSPORT": (name: string, lName: LName, adapter?: AttributeAdapter) =>
    new EnumAttribute({
      name, lName, adapter,
      values: [{value: "C"}, {value: "S"}, {value: "R"}, {value: "O"}, {value: "W"}]
    }),
  "GD_DIPADDRESS": (name: string, lName: LName, adapter?: AttributeAdapter) =>
    new StringAttribute({
      name, lName, equired: true, autoTrim: true, maxLength: 15, adapter,
      mask: /([1-9]|[1-9]\d|1\d{2}|2[0-4]\d|25[0-5])(\.(\d|[1-9]\d|1\d{2}|2[0-4]\d|25[0-5])){3}\/\d+/
    }),
  "DSTORAGE_DATA_TYPE": (name: string, lName: LName, adapter?: AttributeAdapter) =>
    new EnumAttribute({
      name, lName, required: true, adapter,
      values: [
        {value: "G"}, {value: "U"}, {value: "O"}, {value: "T"}, {value: "F"},
        {value: "S"}, {value: "I"}, {value: "C"}, {value: "L"}, {value: "D"},
        {value: "B"}
      ]
    })
};
