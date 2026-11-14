import {useState} from 'react';

type Field='email'|'password'|'code'|'current'|'new'|'confirm'|'answer';
const labels={email:'Email',password:'Password',code:'Authenticator code',current:'Current password',new:'New password',confirm:'Confirm new password',answer:'Extra verification answer'};
const normal=['1234567890','qwertyuiop','asdfghjkl','zxcvbnm'];
const symbols=['!@#$%^&*()','-_=+[]{}',';:\'",.<>','/\\`~?|'];

// Receives editing callbacks, never a password or code value. Nothing is logged
// or persisted; the normal masked input remains the only password display.
export default function TapKeyboard({field,fields,disabled,onField,onInsert,onBackspace,onClear,onClose}:{field:Field;fields:Field[];disabled:boolean;onField:(field:Field)=>void;onInsert:(text:string)=>void;onBackspace:()=>void;onClear:()=>void;onClose:()=>void}){
 const [shift,setShift]=useState(false),[symbolMode,setSymbolMode]=useState(false);
 const numeric=field==='code';
 const rows=numeric?['123','456','789','0']:symbolMode?symbols:normal.map((r,i)=>shift&&i?r.toUpperCase():r);
 return <section className="tap-keyboard" aria-label="On-screen keyboard">
  <div className="tap-keyboard-heading"><strong>Tap to enter {labels[field].toLowerCase()}</strong><button type="button" onClick={onClose}>Hide keyboard</button></div>
  {fields.length>1&&<div className="tap-keyboard-targets" role="group" aria-label="Choose input field">{fields.map(f=><button type="button" key={f} aria-pressed={field===f} disabled={disabled} onClick={()=>onField(f)}>{labels[f]}</button>)}</div>}
  <div className={'tap-keyboard-rows'+(numeric?' is-numeric':'')} role="group" aria-label={labels[field]+' keys'}>{rows.map((row,i)=><div className="tap-keyboard-row" key={i}>{[...row].map(char=><button type="button" key={char} aria-label={'Enter '+char} disabled={disabled} onClick={()=>onInsert(char)}>{char}</button>)}</div>)}</div>
  <div className="tap-keyboard-actions">{!numeric&&<><button type="button" disabled={disabled} aria-pressed={shift} onClick={()=>{setShift(!shift);setSymbolMode(false);}}>Shift</button><button type="button" disabled={disabled} aria-pressed={symbolMode} onClick={()=>setSymbolMode(!symbolMode)}>{symbolMode?'ABC':'Symbols'}</button><button type="button" disabled={disabled} onClick={()=>onInsert(' ')}>Space</button></>}<button type="button" disabled={disabled} onClick={onBackspace}>Backspace</button><button type="button" disabled={disabled} onClick={onClear}>Clear</button></div>
  <p>{['password','current','new','confirm','answer'].includes(field)?'Your entry stays masked. ':''}Keys add characters at the end. Clear this field to start again.</p>
 </section>;
}
