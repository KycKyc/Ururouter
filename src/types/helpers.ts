export type Diff<T, From> = T extends From ? never : T;
