/* tslint:disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

export type Trigger = {
  type?: "trigger";
  [k: string]: any;
} & Step &
  Instance &
  (
    | {
        eventKey: string;
        [k: string]: any;
      }
    | {
        taskKey: string;
        [k: string]: any;
      }
  );
export type Instance =
  | {
      instanceHash: Hash;
      [k: string]: any;
    }
  | {
      instance:
        | {
            src: string;
            [k: string]: any;
          }
        | {
            service: Hash;
            [k: string]: any;
          };
      [k: string]: any;
    };
export type Hash = string;
export type Filter = {
  type?: "filter";
  [k: string]: any;
} & Step & {
    conditions: {
      /**
       * This interface was referenced by `undefined`'s JSON-Schema definition
       * via the `patternProperty` "^[a-zA-Z0-9_]+$".
       */
      [k: string]: string;
    };
    [k: string]: any;
  };
export type Task = {
  type?: "task";
  [k: string]: any;
} & Step &
  Instance & {
    taskKey: string;
    inputs?: Inputs;
    [k: string]: any;
  };
/**
 * This interface was referenced by `Inputs`'s JSON-Schema definition
 * via the `patternProperty` "^[a-zA-Z0-9_]+$".
 */
export type Value =
  | boolean
  | number
  | string
  | null
  | Value[]
  | (
      | {
          key: string;
          stepKey?: string;
          [k: string]: any;
        }
      | {
          [k: string]: Value;
        }
    );

export interface Process {
  name: string;
  key?: string;
  steps: (Trigger | Filter | Task)[];
}
export interface Step {
  key?: string;
  type: "trigger" | "filter" | "task";
  [k: string]: any;
}
export interface Inputs {
  [k: string]: Value;
}
