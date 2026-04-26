## Running the project

Run `npm i` to install dependencies.

Run `npm run dev` to start the development server.

## AMap live location setup

This project uses the AMap JavaScript API on the `liverun` screen and stays fully frontend-only.

Create a local env file such as `.env.local` in the project root and add:

```bash
VITE_AMAP_API_KEY=your_amap_js_api_key
VITE_AMAP_SECURITY_JS_CODE=your_amap_security_js_code
```

Notes:

- `VITE_AMAP_API_KEY` is required.
- `VITE_AMAP_SECURITY_JS_CODE` is recommended for current AMap web security checks.
- After editing env vars, restart `npm run dev`.
- In the browser, allow location permission, otherwise live tracking cannot work.
