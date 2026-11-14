/** Original resource cover art. This module never represents an illustration as a provider screenshot. */
export type IllustrationInput={name:string;category:string;id?:string;subcategory?:string;description?:string;tags?:string[];url?:string;kind?:string};
export function escapeXml(value:string){return value.replace(/[\uD800-\uDFFF]/gu,'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));}
// Stable family names are also consumed by the editorial first-step helper.
export function illustrationKind(category:string){
 if(/AI|Automation/.test(category))return 'flow';if(/Cybersecurity|Privacy/.test(category))return 'security';if(/Development|Developer|Domains|Accessibility/.test(category))return 'code';if(/Finance|Business/.test(category))return 'finance';if(/Fitness/.test(category))return 'fitness';if(/Video/.test(category))return 'video';if(/Audio/.test(category))return 'audio';if(/Data|Science|Engineering/.test(category))return 'science';if(/Travel|Maps/.test(category))return 'map';if(/Design|3D|Photos|Fonts/.test(category))return 'design';if(/Learning|Books|Education|Languages/.test(category))return 'learning';return 'workspace';
}
function fingerprint(s:string){let n=2166136261;for(const c of s)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;}
function clip(s:string,n:number){return s.length>n?s.slice(0,n-1).trimEnd()+'…':s;}
function hostOf(url?:string){try{return new URL(url||'').hostname.replace(/^www\./,'').slice(0,70);}catch{return '';}}
export function illustrationUrl(r:IllustrationInput){return '/illustrations?'+new URLSearchParams({title:r.name.slice(0,140),category:r.category.slice(0,100),purpose:(r.subcategory||'').slice(0,100),description:(r.description||'').slice(0,200),tags:(r.tags||[]).slice(0,4).map(t=>t.slice(0,40)).join('|'),host:hostOf(r.url),kind:(r.kind||'').slice(0,50),seed:(r.id||r.name).slice(0,100),v:'3'}).toString();}
const scenes=['flow','pipeline','terminal','device','database','chat','model','image','video','audio','solid','canvas','type','photo','invoice','ledger','chart','map','book','research','shield','lab','workout','game','circuit','notes','calendar','translation'] as const;
type Scene=typeof scenes[number];
function pickScene(r:IllustrationInput,seed:number):Scene{
 const hint=[r.name,r.subcategory||'',...(r.tags||[]),r.description||''].join(' ').toLowerCase();
 const name=r.name.toLowerCase();if(/playwright|puppeteer|selenium|cypress/.test(name))return 'lab';if(/huginn/.test(name))return 'calendar';if(/n8n|airflow/.test(name))return 'pipeline';if(/1build|build automation/.test(name))return 'terminal';
 if(/invoice|erpnext|invoicing/.test(hint))return 'invoice';if(/actual|firefly|gnucash|budget|expense|accounting/.test(hint))return 'ledger';if(/airflow|data pipeline|etl|data engineering/.test(hint))return 'pipeline';if(/aider|code editor|coding assistant|terminal|command.line|\bshell\b/.test(hint))return 'terminal';
 if(/node.red|n8n|activepieces|huginn|automation|task scheduling|no.code workflow/.test(hint))return 'flow';if(/chatgpt|gemini|open webui|chat|assistant/.test(hint))return 'chat';if(/cogvideo|wan2|video generat|davinci|kdenlive|shotcut|handbrake|obs studio/.test(hint))return 'video';if(/comfy|stable diffusion|image generat|text.to.image/.test(hint))return 'image';if(/ollama|hugging face|local model|machine learning|fine.tun/.test(hint))return 'model';
 if(/whisper|audacity|lmms|musescore|audio|voice|speech|sound/.test(hint))return 'audio';if(/kicad|electronics|circuit|pcb|robot/.test(hint))return 'circuit';if(/blender|freecad|3d model|\bcad\b|unicorn studio|webgl|shader/.test(hint))return 'solid';if(/google fonts|fontshare|typograph|fonts/.test(hint))return 'type';if(/unsplash|pexels|pixabay|gimp|photo|stock image/.test(hint))return 'photo';if(/figma|penpot|krita|inkscape|graphic design|prototyp/.test(hint))return 'canvas';
 if(/bitwarden|password|privacy|encrypt|signal|messaging/.test(hint))return 'shield';if(/portswigger|picoctf|overthewire|practice lab|application security/.test(hint))return 'lab';if(/godot|gdevelop|game engine|game development/.test(hint))return 'game';if(/android|flutter|mobile development|ios/.test(hint))return 'device';if(/supabase|database|\bsql\b|storage/.test(hint))return 'database';if(/obsidian|joplin|note|knowledge/.test(hint))return 'notes';if(/zotero|research|citation|paper/.test(hint))return 'research';if(/gutenberg|openstax|book|reading/.test(hint))return 'book';if(/calendar|schedule|habit/.test(hint))return 'calendar';if(/libretranslate|languagetool|translation|grammar|language/.test(hint))return 'translation';if(/openstreetmap|organic maps|map|navigation|route/.test(hint))return 'map';if(/wger|fitotrack|opentracks|darebee|workout|exercise|fitness/.test(hint))return 'workout';if(/kaggle|trends|analytics|search console|data visual|statistics/.test(hint))return 'chart';if(/freecodecamp|odin project|mdn|next.js|github pages|cloudflare pages|web development/.test(hint))return 'terminal';
 const families:Record<string,Scene[]>={flow:['model','chat','image','pipeline','flow'],security:['shield','lab'],code:['terminal','device','database'],finance:['invoice','ledger','chart','calendar'],fitness:['workout','calendar'],video:['video','image'],audio:['audio'],science:['chart','circuit','solid'],map:['map'],design:['canvas','type','photo','solid'],learning:['book','research','terminal'],workspace:['notes','calendar','translation','research']};const choices=families[illustrationKind(r.category)]||families.workspace;return choices[seed%choices.length];
}
function sceneArt(scene:Scene,seed:number,a:string,b:string,light:string){
 const ink='#18242b',white='#fff',line='#d8e1e3',muted='#6e7e87';
 const r=(x:number,y:number,w:number,h:number,f=white,rx=10,stroke='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}"${stroke?` stroke="${stroke}" stroke-width="2"`:''}/>`;
 const t=(s:string,x:number,y:number,size=16,f=ink,weight=600)=>`<text x="${x}" y="${y}" font-family="Arial,Helvetica,sans-serif" font-size="${size}" fill="${f}" font-weight="${weight}">${escapeXml(s)}</text>`;
 const p=(d:string,c=a,w=4)=>`<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
 const c=(x:number,y:number,rad:number,f=a)=>`<circle cx="${x}" cy="${y}" r="${rad}" fill="${f}"/>`;
 const bars=(x:number,y:number,w:number,n=4,color=line)=>Array.from({length:n},(_,i)=>r(x,y+i*18,w-((seed>>(i+2))%Math.max(1,Math.round(w*.35))),6,i===0?a:color,3)).join('');
 const panel=(dark=false)=>r(20,20,460,260,dark?ink:white,14)+r(20,20,460,31,dark?'#2b3a42':'#e9eff1',14)+p('M20 51H480',dark?'#3c4d55':line,1)+c(38,35,3.5,a)+c(51,35,3.5,b)+c(64,35,3.5,'#b9c7cc');
 let s='';
 if(scene==='flow'){
  const swap=seed%2;const xy=swap?[[46,134],[204,65],[362,134]]:[[46,65],[204,134],[362,65]];s=p(swap?'M138 166H174V97H204M296 97H326V166H362':'M138 97H174V166H204M296 166H326V97H362',a,5);xy.forEach(([x,y],i)=>{s+=r(x,y,92,65)+r(x+13,y+12,24,24,i===1?a:b,6)+t(['INPUT','ACTION','OUTPUT'][i],x+12,y+53,10);});s+=t('One useful connection',137,268,15);
 }else if(scene==='pipeline'){
  const pts=[[55,140],[182,70],[182,210],[319,140],[444,140]];s=p('M55 140 182 70 319 140 444 140 M55 140 182 210 319 140',a,5);pts.forEach(([x,y],i)=>{s+=c(x,y,i===0||i===4?25:32,i===seed%5?a:white)+t(['IN','READ','CHECK','BUILD','OUT'][i],x-(i===2?18:13),y+5,11);});s+=t('Connect the steps',169,287,16);
 }else if(scene==='terminal'){
  s=panel(true)+t('PROJECT / EXAMPLE',43,79,11,'#b5c5cd',700)+t('> make something useful',43,116,19,'#eff5f2',600);for(let i=0;i<6;i++){s+=t(String(i+1),44,153+i*18,11,'#7b929f')+r(75+(i%3)*16,143+i*18,160+(seed>>(i+1))%180,6,i===2||i===5?b:'#7c9fad',3);}s+=r(43,257,12,10,a,1);
 }else if(scene==='device'){
  s=r(156,9,189,281,ink,25)+r(169,24,163,250,light,17)+r(215,29,69,9,ink,4)+t('YOUR PROJECT',190,76,13)+r(187,96,126,68,a,9)+r(187,181,126,31,white,5)+r(187,226,76,9,b,3)+c(302,232,10,a)+r(87,119,90,92,white,9)+bars(99,139,62,3)+r(322,183,95,75,white,9)+p('m343 219 13 12 26-29',a,5);
 }else if(scene==='database'){
  s=p('M153 150H238 M315 150H412',b,5)+r(66,80,88,140,a,2)+`<ellipse cx="110" cy="80" rx="44" ry="20" fill="${b}"/><ellipse cx="110" cy="220" rx="44" ry="20" fill="${a}"/>`+p('M66 126c12 23 76 23 88 0M66 174c12 23 76 23 88 0',light,3)+r(233,70,214,158,white,10)+t('STRUCTURED DATA',250,101,13);for(let i=0;i<4;i++){s+=p(`M250 ${122+i*25}H428`,line,1)+r(251,132+i*25,58,5,i===seed%4?a:line,2)+r(326,132+i*25,85,5,line,2);}s+=t('Keep a useful record',154,278,16);
 }else if(scene==='chat'){
  s=r(34,35,352,86,white,15)+t('Start with a clear task.',56,70,20)+bars(57,88,252,1)+`<path d="M56 120v21l24-21" fill="${white}"/>`+r(121,154,345,96,a,15)+t('Ask. Refine. Inspect.',143,192,20)+bars(145,210,256,1,light)+`<path d="M443 247v23l-25-23" fill="${a}"/>`+c(53,205,19,b);
 }else if(scene==='model'){
  s=r(155,55,194,194,ink,17)+r(178,78,148,148,a,8)+t('MODEL',203,162,28,ink,750);for(let i=0;i<7;i++){const x=167+i*27;s+=r(x,26,7,33,b,3)+r(x,246,7,33,b,3)+r(125,68+i*27,33,7,b,3)+r(346,68+i*27,33,7,b,3);}s+=c(89,105,16,white)+c(419,210,28,b)+p('M72 236l23-23 23 23-23 23Z',a,3);
 }else if(scene==='image'){
  s=`<g transform="rotate(-7 225 146)">`+r(52,36,303,215,ink,11)+r(67,51,273,183,light,5)+c(272,92,27,b)+`<path d="M68 231 153 107 236 203 283 151 340 231Z" fill="${a}"/></g>`+`<g transform="rotate(6 371 211)">`+r(275,143,190,135,white,8)+c(394,187,29,b)+`<path d="M297 260 348 190 407 260Z" fill="${a}"/></g>`+r(284,22,182,31,a,5)+t('CREATE AN IMAGE',296,42,12);
 }else if(scene==='video'){
  s=panel(true)+r(40,65,260,129,light,6)+c(252,98,18,b)+`<path d="M40 194 100 121 157 165 221 102 300 194Z" fill="${a}"/><path d="m160 101 0 51 43-25Z" fill="${white}"/>`+t('EDIT / EXPORT',323,88,12,'#ecf2f2')+bars(323,109,119,4,'#49616c');for(let row=0;row<3;row++)for(let i=0;i<5;i++)s+=r(41+i*82,211+row*18,75-(i+seed)%18,11,row===0?a:row===1?b:'#719794',2);s+=p('M236 205v67','#f9d26b',2);
 }else if(scene==='audio'){
  s=r(21,35,458,230,ink,13)+t('LISTEN / EDIT / CREATE',43,68,13,'#dde8e8',650);for(let i=0;i<68;i++){const h=16+Math.round(Math.abs(Math.sin((i+seed%21)*.47))*119);s+=r(46+i*6.1,162-h/2,3.7,h,i<32?a:b,2);}s+=p('M43 235H456','#49636f',2)+p('M43 235H235',a,3)+p('M240 90v153',white,1);
 }else if(scene==='solid'){
  s=p('M63 227 287 280 445 197 M68 202 288 252 439 170 M123 252V174M210 270V119M307 271V90',b,1)+`<path d="M164 102 263 46 368 104 267 163Z" fill="${b}"/><path d="M164 102v127l103 60V163Z" fill="${a}"/><path d="M267 163v126l101-61V104Z" fill="${ink}"/>`+c(93,88,28,a)+p('M78 88h30M93 73v30',white,3)+p('M420 51v34M403 68h34',ink,3);
 }else if(scene==='canvas'){
  s=panel()+r(39,67,91,192,light,5)+bars(51,85,67,7)+r(149,70,305,189,light,4)+`<rect x="173" y="88" width="254" height="151" fill="${white}" stroke="${a}" stroke-width="2"/>`+r(193,108,211,20,a,4)+bars(193,145,182,3)+r(193,210,76,22,ink,4)+t('CREATE',205,225,9,white);[[173,88],[427,88],[173,239],[427,239]].forEach(([x,y])=>s+=r(x-3,y-3,6,6,white,0,a));s+=`<path d="M421 231 451 244 437 251 432 267Z" fill="${b}" stroke="${ink}" stroke-width="2"/>`;
 }else if(scene==='type'){
  s=r(37,30,426,241,white,11)+t('Aa',62,191,150,ink,650)+t('TYPE / FORM',265,82,13,muted)+t('012345',266,130,30,a,650)+t('abcde',267,175,36,ink,650)+t('Make words clear.',266,220,15)+p('M60 238H437',line,1)+r(65,27,81,7,a,2);
 }else if(scene==='photo'){
  s=r(57,34,339,228,white,10)+r(72,49,309,198,light,3)+c(316,92,29,b)+`<path d="M72 247 168 94 251 191 304 139 381 247Z" fill="${a}"/>`+`<g transform="rotate(9 383 194)">`+r(323,124,137,157,white,3)+r(334,136,115,112,b,1)+c(391,178,28,a)+r(335,260,90,5,line,1)+`</g>`+p('M44 28H24V48M411 28h20v20M24 250v23h23',ink,3);
 }else if(scene==='invoice'){
  s=r(97,15,234,269,white,9)+r(119,41,108,14,a,3)+t('INVOICE',119,91,28,ink,700)+t('SAMPLE DOCUMENT',119,112,10,muted)+p('M119 130H307',line,2);for(let i=0;i<4;i++)s+=r(120,149+i*24,118-(i%2)*34,6,line,2)+r(266,149+i*24,36,6,a,2);s+=p('M119 243H307',line,2)+r(225,258,79,8,ink,3)+r(307,51,90,66,b,8)+t('SEND',330,90,14)+r(50,174,114,70,a,9)+p('m82 209 17 16 30-32',ink,6);
 }else if(scene==='ledger'){
  s=r(25,50,450,217,white,14)+r(47,73,161,66,a,8)+t('YOUR PLAN',63,98,13)+r(63,117,112,7,ink,3)+`<circle cx="127" cy="204" r="42" fill="none" stroke="${light}" stroke-width="24"/><circle cx="127" cy="204" r="42" fill="none" stroke="${a}" stroke-width="24" stroke-dasharray="166 264" transform="rotate(-90 127 204)"/>`+t('CATEGORY',238,96,10,muted)+t('OVERVIEW',374,96,10,muted);['Home','Food','Projects','Other'].forEach((n,i)=>s+=t(n,238,134+i*34,14)+r(342,124+i*34,60+(seed>>(i+2))%60,11,i===seed%4?b:a,4));
 }else if(scene==='chart'){
  s=r(30,26,440,250,white,12)+t('EXPLORE THE DATA',54,63,15)+p('M62 235V87M62 235H439',line,2);for(let i=0;i<8;i++){const h=42+(seed>>(i+1))%105;s+=r(83+i*44,234-h,25,h,i===seed%8?a:b,4);}s+=p('M81 160 125 183 170 124 214 142 258 103 302 128 346 77 395 95',ink,3);
 }else if(scene==='map'){
  s=r(22,24,456,249,light,13)+p('M43 94 175 248 323 47 458 212',b,34)+p('M45 215 226 49 378 252 461 126',white,21)+p('M97 207 199 117 336 215 418 109',a,6);[[97,207],[199,117],[336,215],[418,109]].forEach(([x,y],i)=>s+=c(x,y,10,i===seed%4?ink:a)+c(x,y,4,white));s+=r(42,39,168,29,white,5)+t('FIND YOUR WAY',56,59,12);
 }else if(scene==='book'){
  s=`<path d="M248 62Q157 24 49 63V255Q151 219 248 263Z" fill="${white}"/><path d="M252 62Q356 24 451 63V255Q353 219 252 263Z" fill="${light}"/>`+p('M250 63v201',a,4)+bars(76,89,142,6)+bars(278,89,143,6)+r(324,46,27,86,a,1)+t('READ / LEARN',161,294,15);
 }else if(scene==='research'){
  s=`<g transform="rotate(-8 187 147)">`+r(64,34,218,234,white,7)+t('REFERENCE',86,68,13)+bars(86,91,167,7)+`</g>`+r(239,69,195,189,light,8)+t('[1]',259,111,34,a,750)+bars(261,132,150,5)+c(377,205,51,'none')+`<circle cx="377" cy="205" r="43" fill="none" stroke="${ink}" stroke-width="7"/>`+p('M407 238l47 41',ink,12);
 }else if(scene==='shield'){
  s=`<path d="M249 19 368 69V158Q368 236 249 286 130 236 130 158V69Z" fill="${a}" stroke="${ink}" stroke-width="3"/>`+r(209,121,81,77,white,12)+p('M227 120V98a23 23 0 0 1 46 0v22',ink,6)+c(249,151,8,ink)+r(246,154,6,19,ink,3)+r(74,133,60,67,white,11)+p('m91 165 11 11 18-24',b,5)+r(349,212,79,39,ink,8)+t('••••',366,237,16,white);
 }else if(scene==='lab'){
  s=panel()+t('AUTHORIZED PRACTICE',43,82,14)+r(45,104,173,142,light,9)+`<path d="M96 127v46l-24 42q-6 12 10 12h84q16 0 10-12l-24-42v-46" fill="${a}" stroke="${ink}" stroke-width="3"/>`+p('M90 127h68M88 196h73',ink,3)+bars(244,111,205,4)+r(246,211,140,33,ink,5)+t('LEARN SAFELY',260,232,12,white);
 }else if(scene==='workout'){
  s=r(49,35,212,232,white,12)+t('YOUR ROUTINE',70,70,15);['Choose a session','Keep it manageable','Record your progress'].forEach((n,i)=>s+=r(71,94+i*50,23,23,i===seed%3?a:light,6)+t(n,106,110+i*50,12));s+=p('M325 149h108',ink,17)+r(307,98,23,102,a,6)+r(286,120,20,59,b,5)+r(428,98,23,102,a,6)+r(452,120,20,59,b,5)+p('M307 246c37-42 85-12 139-48',a,6);
 }else if(scene==='game'){
  s=panel(true)+r(40,70,420,179,light,5);for(let i=0;i<10;i++)s+=r(40+i*42,224,42,24,i%2?a:b,0);[[80,166],[122,166],[164,166],[269,122],[311,122],[353,122]].forEach(([x,y])=>s+=r(x,y,40,20,a,2));s+=r(225,185,24,37,ink,3)+r(228,178,18,14,b,2)+c(396,93,15,a)+p('m394 82 0 22M386 93h18',white,2);
 }else if(scene==='circuit'){
  s=r(32,36,436,228,ink,13)+r(184,93,129,116,a,9);for(let i=0;i<5;i++)s+=p(`M${196+i*25} 93V68H${93+i*65}M${196+i*25} 209v27`,b,3);s+=p('M184 119H83v66h64M313 119h75v73h49M184 170h-18v60M313 170h35v51',b,4)+c(83,185,9,white)+c(437,192,9,white)+c(348,221,9,white)+t('BUILD',215,157,21)+r(52,55,75,12,b,3);
 }else if(scene==='notes'){
  [[47,45,-7],[194,57,3],[341,37,9]].forEach(([x,y,angle],i)=>{s+=`<g transform="rotate(${angle} ${x+55} ${y+105})">`+r(x,y,126,218,i===seed%3?a:white,6)+r(x+15,y+22,56,8,i===seed%3?ink:b,3)+bars(x+15,y+53,91,7)+`</g>`;});s+=t('Capture one useful idea.',142,290,16);
 }else if(scene==='calendar'){
  s=r(55,29,390,245,white,13)+r(55,29,390,58,a,13)+t('A SMALL DAILY PRACTICE',81,65,16)+p('M125 18v33M375 18v33',ink,8);for(let i=0;i<21;i++){const x=86+(i%7)*49,y=111+Math.floor(i/7)*49;s+=r(x,y,32,30,i===seed%21?b:light,5);if(i===seed%21)s+=p(`m${x+8} ${y+15} 6 6 11-13`,ink,3);}s+=r(83,256,193,5,line,2);
 }else{
  s=r(39,49,285,109,white,14)+t('Hello',64,120,48,ink,650)+r(183,173,278,93,a,14)+t('नमस्ते',206,232,43,ink,650)+p('M358 83h68v55m0 0-14-15m14 15 14-15',ink,4)+p('M117 218H65v-37m0 0-13 13m13-13 13 13',ink,4);
 }
 return s;
}
const intents:Record<Scene,string>={flow:'CONNECT A WORKFLOW',pipeline:'MAKE THE STEPS VISIBLE',terminal:'BUILD SOMETHING USEFUL',device:'MAKE A MOBILE IDEA',database:'KEEP A USEFUL RECORD',chat:'START A BETTER CONVERSATION',model:'EXPLORE A MODEL',image:'MAKE AN IDEA VISIBLE',video:'TELL A CLEARER STORY',audio:'MAKE ROOM FOR SOUND',solid:'SHAPE A NEW DIMENSION',canvas:'DESIGN WITH INTENTION',type:'MAKE WORDS CLEAR',photo:'FIND A DIFFERENT PERSPECTIVE',invoice:'MAKE THE DETAILS CLEAR',ledger:'A CLEARER MONEY PICTURE',chart:'TURN DATA INTO UNDERSTANDING',map:'EXPLORE A NEW DIRECTION',book:'LEARN SOMETHING WORTH KEEPING',research:'FOLLOW THE EVIDENCE',shield:'BUILD SAFER HABITS',lab:'LEARN IN A SAFE SPACE',workout:'ONE MANAGEABLE STEP',game:'MAKE A WORLD TO EXPLORE',circuit:'BUILD AN IDEA THAT CONNECTS',notes:'KEEP A USEFUL THOUGHT',calendar:'MAKE A LITTLE PROGRESS',translation:'LET AN IDEA TRAVEL'};
function titleLines(s:string,max:number){const words=s.trim().split(/\s+/),lines:string[]=[];let line='';for(const w of words){if((line+' '+w).trim().length>max&&line){lines.push(line);line=w;if(lines.length===2)break;}else line=(line+' '+w).trim();}if(lines.length<2&&line)lines.push(line);if(lines.length===2&&words.join(' ').length>lines.join(' ').length)lines[1]=clip(lines[1],max-1)+'…';return lines.map(x=>clip(x,max+7));}
export function resourceIllustration(r:IllustrationInput){
 const seed=fingerprint((r.id||r.name)+'|'+r.name),scene=pickScene(r,seed),layout=(seed>>>6)%8;
 const colors=[['#f6c842','#f69249','#fff1b9'],['#79b4c5','#bedde5','#e5f1f6'],['#f08159','#f7bb7b','#ffe6d6'],['#85baac','#b4d6b8','#e6f3ec'],['#b9bf7b','#edd080','#f2f3db'],['#a8a0c8','#ddc5df','#efebf6'],['#75a0c1','#c4dce9','#e5f0f7'],['#d2a16c','#ecd1a6','#f8efdf'],['#d18d9d','#ebc7c2','#f9e8ed'],['#93b6c4','#d4c399','#e7f0f3'],['#e6b55d','#eccf9d','#fcf1d9'],['#9fb88d','#c5d3a7','#edf2e5']];
 const [a,b,light]=colors[(seed>>>12)%colors.length],ink='#18242b',purpose=clip(r.subcategory||r.category,55),host=hostOf(r.url),uid='cover-'+seed.toString(36);
 const rect=(x:number,y:number,w:number,h:number,f:string,rx=0)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}"/>`;
 const text=(s:string,x:number,y:number,size=15,f=ink,weight=500)=>`<text x="${x}" y="${y}" font-family="Arial,Helvetica,sans-serif" font-size="${size}" font-weight="${weight}" fill="${f}">${escapeXml(s)}</text>`;
 const title=(x:number,y:number,color=ink,max=25,size=37)=>titleLines(r.name,max).map((s,i)=>{const units=[...s].reduce((v,c)=>v+(/[MW@]/.test(c)?.9:/[ilI.,' ]/.test(c)?.3:/[A-Z]/.test(c)?.65:c.charCodeAt(0)>255?1:.56),0),fitted=Math.max(17,Math.min(size,Math.floor(max*15.2/Math.max(1,units))));return text(s,x,y+i*(size+7),fitted,color,750);}).join('');
 const label=(x:number,y:number,color=ink)=>text(purpose.toUpperCase(),x,y,11,color,650),art=sceneArt(scene,seed,a,b,light);
 const object=(x:number,y:number,w:number,h:number,transform='')=>`<g${transform?` transform="${transform}"`:''}><svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 500 300">${art}</svg></g>`;
 const footer=(color=ink)=>text(host||'NEPOCORE RESOURCE LIBRARY',36,393,10,color,600)+text('ORIGINAL RESOURCE ILLUSTRATION',767,393,9,color,500);
 let cover='';
 if(layout===0)cover=rect(0,0,1000,420,light)+rect(0,0,440,420,ink)+label(36,47,'#d1dde3')+title(36,126,'#fff',23,37)+text(intents[scene],36,302,11,a,650)+object(450,29,524,334)+footer('#71818a');
 else if(layout===1)cover=rect(0,0,1000,420,a)+`<path d="M533 0H1000V420H353Z" fill="${light}"/>`+label(36,45)+title(36,117,ink,25,39)+text(intents[scene],36,315,11,ink,650)+object(463,52,509,303,'rotate(-4 721 203)')+footer();
 else if(layout===2)cover=rect(0,0,1000,420,ink)+rect(23,22,954,337,light,16)+label(48,57)+title(48,118,ink,24,36)+text(intents[scene],48,279,11,ink,650)+object(462,34,511,307)+footer('#b0c0c8');
 else if(layout===3)cover=rect(0,0,1000,420,light)+rect(0,0,1000,84,ink)+text(clip(r.name,49),35,56,r.name.length>35?25:31,'#fff',750)+object(26,94,550,285,'rotate(-3 302 235)')+rect(620,117,338,230,a,12)+label(645,153)+text(intents[scene].split(' ').slice(0,3).join(' '),645,220,24,ink,700)+text(intents[scene].split(' ').slice(3).join(' '),645,253,24,ink,700)+text('FIND IT. TRY IT. MAKE IT USEFUL.',645,310,10,ink,600)+footer();
 else if(layout===4)cover=rect(0,0,1000,420,'#f8f7f3')+`<path d="M582 0H1000V420H430Z" fill="${a}"/>`+label(37,51)+title(37,133,ink,24,40)+rect(37,281,289,34,ink,5)+text(clip(intents[scene],34),49,303,11,'#fff',650)+object(449,42,541,324)+footer();
 else if(layout===5)cover=rect(0,0,1000,420,light)+rect(35,28,930,333,ink,18)+object(28,39,529,318)+label(577,79,b)+title(577,147,'#fff',22,35)+text(intents[scene],577,308,10,b,650)+footer();
 else if(layout===6)cover=rect(0,0,1000,420,b)+rect(0,0,467,420,'#f9f8f5')+label(36,47)+title(36,126,ink,24,38)+text(intents[scene],36,302,11,ink,650)+object(468,52,515,309,'rotate(5 729 207)')+footer();
 else cover=rect(0,0,1000,420,'#edf0ee')+rect(23,22,954,337,light,8)+rect(23,22,337,337,a,8)+label(46,62)+title(46,141,ink,18,35)+text('A RESOURCE FOR YOUR',46,282,10,ink,500)+text('NEXT USEFUL PROJECT.',46,300,10,ink,650)+object(380,40,591,308)+footer();
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="420" viewBox="0 0 1000 420" role="img" data-art-scene="${scene}" data-art-layout="${layout}"><title>${escapeXml(r.name+' — '+purpose)}</title><desc>Original resource-specific illustration for ${escapeXml(r.name)}. A conceptual ${scene} scene, not a screenshot of the provider.</desc><defs><clipPath id="${uid}"><rect width="1000" height="420"/></clipPath></defs><g clip-path="url(#${uid})">${cover}</g></svg>`;
}
export function illustrationDataUrl(r:IllustrationInput){return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(resourceIllustration(r));}
