
declare module "*.css" {
  const content: any;
  export default content;
}

declare module "*.svg" {
  const content: string;
  export default content;
}

interface ImportMetaEnv {
  readonly VITE_AMAP_API_KEY?: string;
  readonly VITE_AMAP_SECURITY_JS_CODE?: string;
  readonly VITE_DASHSCOPE_API_BASE_URL?: string;
  readonly VITE_DASHSCOPE_API_KEY?: string;
  readonly VITE_DASHSCOPE_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
