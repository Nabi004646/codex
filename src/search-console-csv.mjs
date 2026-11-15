export function parseSearchConsoleCsv(input){
 if(typeof input!=='string'||input.length>2*1024*1024)throw Error('Use an English Search Console CSV export smaller than 2 MB.');
 const rows=[];let row=[],field='',quoted=false;
 for(let i=0;i<input.length;i++){const c=input[i];if(quoted){if(c==='"'&&input[i+1]==='"'){field+='"';i++;}else if(c==='"')quoted=false;else field+=c;}else if(c==='"'&&!field)quoted=true;else if(c===','){row.push(field);field='';}else if(c==='\n'){row.push(field.replace(/\r$/,''));if(row.some(Boolean))rows.push(row);row=[];field='';}else field+=c;if(rows.length>5001)throw Error('Use an export with up to 5,000 rows.');}
 if(quoted)throw Error('The CSV contains an unfinished quoted field.');if(field||row.length){row.push(field.replace(/\r$/,''));rows.push(row);}
 const headers=rows.shift()?.map(s=>s.replace(/^\uFEFF/,'').trim().toLowerCase()),dimensions=[['top queries','queries'],['query','queries'],['top pages','pages'],['page','pages'],['country','countries'],['date','dates'],['search appearance','appearance']];
 if(!headers||!headers.includes('clicks')||!headers.includes('impressions'))throw Error('Choose a Search Console Performance CSV with Clicks and Impressions columns.');
 const dimension=dimensions.find(([key])=>headers.includes(key));if(!dimension)throw Error('This CSV dimension is not supported. Export Queries, Pages, Countries, Dates or Search Appearance.');
 const number=(value,integer=false)=>{const s=String(value||'').replaceAll(',','').trim();if(!/^\d+(?:\.\d+)?$/.test(s))throw Error();const n=Number(s);if(!Number.isFinite(n)||n<0||n>1e12||integer&&!Number.isInteger(n))throw Error();return n;};
 const clean=[];let invalidRows=0;
 for(const row of rows){try{const label=String(row[headers.indexOf(dimension[0])]||'').slice(0,1000),clicks=number(row[headers.indexOf('clicks')],true),impressions=number(row[headers.indexOf('impressions')],true),position=headers.includes('position')?number(row[headers.indexOf('position')]):null;if(!label||clicks>impressions)throw Error();clean.push({label,clicks,impressions,ctr:impressions?100*clicks/impressions:0,position});}catch{invalidRows++;}}
 if(!clean.length)throw Error('The export has no valid performance rows.');
 return {kind:dimension[1],rows:clean,invalidRows,clicks:clean.reduce((n,r)=>n+r.clicks,0),impressions:clean.reduce((n,r)=>n+r.impressions,0),source:'Manual Search Console CSV import; not a live account connection'};
}
