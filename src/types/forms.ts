export type FieldErrors = Record<string, string>;

export type FormSubmitResult = FieldErrors | undefined;

export type FormSubmitHandler<TData> = (data: TData) => Promise<FormSubmitResult>;
