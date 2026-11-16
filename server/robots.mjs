// Specific search-agent groups repeat the same private-path exclusions.
// Training-bot policy remains unchanged; search eligibility is a separate control.
export function publicRobots(){
 const exclusions='Disallow: /admin\nDisallow: /api/\nDisallow: /preview/\n';
 return 'User-agent: *\n'+exclusions+'\nUser-agent: OAI-SearchBot\n'+exclusions+'\nSitemap: https://freeresourceatlas.com/sitemap.xml\n';
}
