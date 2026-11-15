import {localizedIntent} from './search-language-aliases.mjs';

// Keep product aliases explicit: a short spelling must not rewrite unrelated words.
export const productAliases={freefire:'free fire','free fire':'free fire','garena free fire':'free fire',pug:'pubg',pubgm:'pubg mobile','pug mobile':'pubg mobile','pug pc':'pubg pc',gta:'grand theft auto v',gta5:'grand theft auto v','gta 5':'grand theft auto v',gtav:'grand theft auto v','gta v':'grand theft auto v',csgo:'counter strike 2','cs go':'counter strike 2',cs2:'counter strike 2',vscode:'visual studio code','vs code':'visual studio code','7zip':'7 zip','cap cut':'capcut'};
export function searchPlan(query,normalize){
 let text=normalize(localizedIntent(query,normalize));
 text=productAliases[text]||text;
 const developer=/\b(development|developer|programming|engines?|assets?|design|code)\b/.test(text);
 const scope=!developer&&/\b(games?|gaming)\b/.test(text)?'games':/\b(apps?|applications?)\b/.test(text)?'apps':/\b(softwares?|programs?)\b/.test(text)?'software':'';
 const pricing=/\bpaid\b/.test(text)?'paid':scope&&/\bfree\b/.test(text)?'free':'';
 let platform='',mobile='';
 if(/\bandroid\b/.test(text)){platform='Android';mobile='android';}
 else if(/\b(ios|iphone|ipad)\b/.test(text)){platform='iOS';mobile='ios';}
 else if(/\bwindows\b/.test(text))platform='Windows';
 else if(/\blinux\b/.test(text))platform='Linux';
 else if(/\b(mac|macos)\b/.test(text))platform='macOS';
 const desktop=/\b(pc|computer|desktop)\b/.test(text);
 const mobileOnly=!platform&&/\b(mobile|phone)\b/.test(text);
 if(scope){
  const purpose=text.replace(/\b(best|popular|famous|free|paid|please|find|show|me|i|want|need|for|on|the|a|an|to|download|downloads|games?|gaming|apps?|applications?|softwares?|programs?|pc|computer|desktop|mobile|phone|android|ios|iphone|ipad|windows|linux|mac|macos)\b/g,' ').replace(/\s+/g,' ').trim();
  text=productAliases[purpose]||purpose||scope;
 }
 return {text,scope,pricing,platform:scope?platform:'',mobile:scope?mobile:'',desktop:!!scope&&desktop,mobileOnly:!!scope&&mobileOnly};
}

// Optimal string alignment handles a missing letter and a transposed pair.
export function editDistance(a,b){
 if(Math.abs(a.length-b.length)>3)return 99;
 const rows=Array.from({length:a.length+1},()=>new Array(b.length+1).fill(0));
 for(let i=0;i<=a.length;i++)rows[i][0]=i;
 for(let j=0;j<=b.length;j++)rows[0][j]=j;
 for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++){
  rows[i][j]=Math.min(rows[i-1][j]+1,rows[i][j-1]+1,rows[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
  if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])rows[i][j]=Math.min(rows[i][j],rows[i-2][j-2]+1);
 }
 return rows[a.length][b.length];
}
