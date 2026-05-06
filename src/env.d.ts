
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
  readonly VITE_XFYUN_APP_ID?: string;
  readonly VITE_XFYUN_API_KEY?: string;
  readonly VITE_XFYUN_API_SECRET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
