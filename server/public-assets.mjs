// One inventory drives packaging, routing and build verification.
export const PUBLIC_ASSET_DIRECTORIES=['social','assets','brand','fonts','previews','logos','article-covers','publisher-media','template-previews','catalog','catalog-notices'];
export const PUBLIC_ASSET_FILES=['favicon.ico','site.webmanifest'];
export function isPublicAsset(path){return PUBLIC_ASSET_DIRECTORIES.some(dir=>path.startsWith('/'+dir+'/'))||PUBLIC_ASSET_FILES.some(file=>path==='/'+file)||/\.(?:ico|png|jpe?g|webp|avif|svg|woff2?|ttf)$/.test(path)||['/manifest.json','/llms.txt'].includes(path);}
