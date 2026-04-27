
declare module "*.css" {
  const content: any;
  export default content;
}

interface ImportMetaEnv {
  readonly VITE_AMAP_API_KEY?: string;
  readonly VITE_AMAP_SECURITY_JS_CODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
