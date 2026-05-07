declare module "@salutejs/client" {
  export function createAssistant(options: Record<string, unknown>): any;
  export function createSmartappDebugger(options: Record<string, unknown>): any;
}

interface ImportMetaEnv {
  readonly VITE_SALUTE_TOKEN?: string;
  readonly VITE_SALUTE_SMARTAPP?: string;
 
}
