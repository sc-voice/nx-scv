export class FormaField {
  readonly name: string;
  readonly mutable: boolean;
  readonly label: string;
  readonly value: string;

  constructor(
    name: string,
    mutable?: boolean,
    label?: string,
    value?: string,
  ) {
    this.name = name;
    this.mutable = mutable === true;
    this.label = label ?? name;
    this.value = value ?? '';
  }
}
