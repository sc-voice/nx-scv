declare module 'avro-js' {
  export function parse(schema: any, opts?: any): any;
  export function createType(schema: any, opts?: any): any;
  export default {
    parse: (schema: any, opts?: any) => any,
    createType: (schema: any, opts?: any) => any,
  };
}
