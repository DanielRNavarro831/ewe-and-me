declare module 'virtual:asset-overrides' {
  const overrides: { sprites: string[]; sfx: string[]; music: string[] };
  export default overrides;
}

declare const __APP_VERSION__: string;
