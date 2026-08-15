/** Discriminator all operator-based filter values share (date, text, number, enum, …) */
export type FilterOperatorValue<TOperator extends string, TPayload = object> = {
  operator: TOperator;
} & TPayload;
