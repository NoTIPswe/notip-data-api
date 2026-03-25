declare module 'js-yaml' {
  export function dump(
    obj: unknown,
    options?: {
      noRefs?: boolean;
      lineWidth?: number;
    },
  ): string;
}
