// One inventory drives packaging, routing and build verification.
export const PUBLIC_ASSET_DIRECTORIES=['social','assets','brand','fonts','previews','logos','article-covers','publisher-media','template-previews','catalog','catalog-notices'];
export function isPublicAsset(path){return PUBLIC_ASSET_DIRECTORIES.some(dir=>path.startsWith('/'+dir+'/'))||/\.(?:ico|png|jpe?g|webp|avif|svg|woff2?|ttf)$/.test(path)||['/manifest.json','/site.webmanifest','/llms.txt'].includes(path);}
