const hex=bytes=>[...bytes].map(n=>n.toString(16).padStart(2,'0')).join('');
export async function answerDigest(answer,salt,iterations=600000){
 if(typeof answer!=='string'||answer.length<1||answer.length>200||!/^[a-f0-9]{64}$/.test(salt)||!Number.isInteger(iterations)||iterations<100000||iterations>2000000)throw Error('Invalid verification input.');
 const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(answer.normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase()),'PBKDF2',false,['deriveBits']);
 const saltBytes=Uint8Array.from(salt.match(/../g),v=>parseInt(v,16));
 return hex(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:saltBytes,iterations},material,256)));
}
export function passwordFields(payload){
 const current=payload?.current_password,next=payload?.new_password,answer=payload?.answer;
 if(typeof current!=='string'||current.length<1||current.length>512||typeof next!=='string'||next.length<12||new TextEncoder().encode(next).length>72||next===current||typeof answer!=='string'||!answer.trim()||answer.length>200)throw Error('Use your current password and a different new password of 12–72 UTF-8 bytes, then answer the extra check.');
 return {current,next,answer};
}
