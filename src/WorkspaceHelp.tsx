import {workspaceHelp} from '../data/workspace-help.mjs';
export default function WorkspaceHelp({type}:any){const help=(workspaceHelp as any)[type];if(!help)return null;return <section className="workspace-help"><h2>Common questions</h2>{help.questions.map(([question,answer]:string[])=><section key={question}><h3>{question}</h3><p>{answer}</p></section>)}</section>;}
