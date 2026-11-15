export type FreeDetails={
 access_model:'Unknown'|'Fully free'|'Free tier'|'Open-source code'|'Self-hosted'|'Trial';
 signup:'Unknown'|'Required'|'Not required';
 credit_card:'Unknown'|'Required'|'Not required';
 platforms:string[];
 limits:string;
 requirements:string;
 cost_notes:string;
 reviewed_on:string;
 source_urls:string[];
};
export type GithubFacts={full_name:string;stars:number;license:string;language:string;archived:boolean;pushed_at:string;checked_at:string};
export type ResourceHealth={resource_id:string;url:string;link_status:'unchecked'|'working'|'redirect'|'restricted'|'warning'|'broken'|'unreachable';http_status:number|null;checked_at:string;failures:number;note:string;github?:GithubFacts};
export type ImportSummary={new:number;updated:number;unchanged:number;duplicates:number;published:number;draft:number};
export type ImportJob={id:string;file_name:string;file_hash:string;total_rows:number;saved_rows:number;actor_id:string;created_at:string;updated_at:string;status:string;summary_json:string;restored_rows:number;conflict_rows:number};
export type Toolkit={id:string;name:string;resourceIds:string[];note?:string;resourceNotes?:Record<string,string>;updatedAt:string};

export type DeviceDetails={minimum_ram_gb:number|null;recommended_ram_gb:number|null;ram_scope:string;workload_ram_gb:Record<string,number>;dedicated_gpu:'Unknown'|'Required'|'Not required';graphics_requirement:string;offline:'Unknown'|'Yes'|'Limited'|'No';offline_note:string;reviewed_on:string;source_urls:string[]};
