import {toolkitData} from '../source-baseline/nepocore-library/lib/browser-collections.ts';
const HEADERS=['folder_id','folder_name','position','resource_id','note','folder_note'];
function cell(value){const text=String(value??'');return '"'+(/^[\s]*[=+\-@]|^[\t\r]/.test(text)?"'"+text:text).replaceAll('"','""')+'"';}
export function toolkitCsv(folders){return [HEADERS.join(','),...toolkitData(folders).flatMap(f=>(f.resourceIds.length?f.resourceIds:['']).map((id,position)=>[f.id,f.name,position,id,f.resourceNotes?.[id]||'',f.note||''].map(cell).join(',')))].join('\r\n')+'\r\n';}
export function parseToolkitCsv(text){
 if(typeof text!=='string'||text.length>2*1024*1024)throw Error('Use a CSV file smaller than 2 MB.');
 const rows=[];let row=[],field='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'&&text[i+1]==='"'){field+='"';i++;}else if(c==='"')quoted=false;else field+=c;}else if(c==='"'&&!field)quoted=true;else if(c===','){row.push(field);field='';}else if(c==='\n'){row.push(field.replace(/\r$/,''));if(row.some(Boolean))rows.push(row);row=[];field='';}else field+=c;if(rows.length>15001)throw Error('Use up to 30 folders and 500 entries per folder.');}
 if(quoted)throw Error('The CSV contains an unfinished quoted field.');if(field||row.length){row.push(field.replace(/\r$/,''));rows.push(row);}
 const header=rows.shift()?.map(s=>s.replace(/^\uFEFF/,'').trim());if(!header||HEADERS.some(h=>!header.includes(h)))throw Error('Use the CSV columns from Export CSV.');
 const groups=new Map(),value=(r,key)=>r[header.indexOf(key)]||'';
 for(const row of rows){const id=value(row,'folder_id'),name=value(row,'folder_name'),resourceId=value(row,'resource_id'),position=Number(value(row,'position'));if(!Number.isInteger(position)||position<0||position>500)throw Error('Use valid entry positions.');let group=groups.get(id);if(!group){group={id,name,note:value(row,'folder_note'),items:[],updatedAt:new Date().toISOString()};groups.set(id,group);}if(group.name!==name)throw Error('A folder ID has conflicting names.');if(resourceId)group.items.push({id:resourceId,position,note:value(row,'note')});}
 return toolkitData([...groups.values()].map(g=>{g.items.sort((a,b)=>a.position-b.position);return {id:g.id,name:g.name,note:g.note,resourceIds:g.items.map(i=>i.id),resourceNotes:Object.fromEntries(g.items.filter(i=>i.note).map(i=>[i.id,i.note])),updatedAt:g.updatedAt};}));
}
