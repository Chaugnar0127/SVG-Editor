export interface Shape {
  readonly id: string;

  move(dx: number, dy: number): void;

  scale(factor: number): void;

  children():readonly Shape[];
}
