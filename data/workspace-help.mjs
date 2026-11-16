// These answers describe the actual local tools, not an external AI service.
export const workspaceHelp={
 workflows:{description:'Build a free browser-based workflow with ordered steps, resource choices, deliverables and private notes. Save locally, share a public plan, export JSON or CSV, or print on Letter/A4.',questions:[
  ['Where is my workflow saved?','Saved workflows stay in this browser’s local storage. They do not synchronize to an account. Export a JSON backup before changing devices or clearing browser data.'],
  ['What does a share link include?','The link contains your workflow title, goal, step titles, deliverables and resource IDs. Private step notes are left out. Anyone who receives the link can read the public plan, so keep sensitive information out of those fields.'],
  ['How do I make a printable planning sheet?','Choose Letter or A4, then use Print / save PDF. The browser controls the printer or PDF destination. Keep the editable JSON as well if you want to change the workflow later.']
 ]},
 selector:{description:'Choose free resource candidates by task, recorded operating-system support and account requirements. See an explainable shortlist without fabricated scores or compatibility claims.',questions:[
  ['Why did an application disappear after I chose a platform?','The selector includes only recorded support for the chosen platform. An unknown requirement is not treated as confirmed support. Change the constraint or check the original provider if you need more options.'],
  ['Does the shortlist guarantee compatibility?','No. A listed platform is one documented fact. Your files, hardware, plugins, provider conditions and country can affect whether an application fits the task. Try a small representative project before changing your workflow.'],
  ['What should I do after choosing a candidate?','Read its access label, original source and limitations. Define one deliverable and use the workflow builder to plan a short trial you can evaluate.']
 ]},
 finder:{description:'Describe a task to find source-reviewed apps and resources, with recorded platform, account, offline and access constraints and an optional country preference.',questions:[
  ['How should I describe a task?','Name the work and any constraints, for example: free video editing on Linux without an account. The finder extracts recorded constraints and matches catalog facts; it does not send the request to an AI model.'],
  ['What does the country preference establish?','Country availability has not been reviewed for most catalog entries. The finder states when it is showing worldwide candidates. Check the provider’s current regional conditions rather than assuming a country selection guarantees access.'],
  ['Can I inspect more than reviewed entries?','Yes. Choose the community-entry option to inspect broader discovery metadata. Entries marked Check terms need current provider conditions checked before you depend on them.']
 ]},
 widgets:{description:'Embed an attributed, read-only collection of video, design, automation or learning resources. Copy a lightweight iframe without exposing personal toolkit data.',questions:[
  ['How do I add a collection to my website?','Choose a topic, copy the iframe code and insert it into a page that permits iframe embeds. The preview shows the same read-only collection. Keep the attribution and verify the provider links before recommending a resource.'],
  ['Does the widget expose my saved folders?','No. It contains a fixed public shortlist and original-source links. Browser bookmarks, private notes, comparison choices and saved workflow plans are not included.'],
  ['Is this a live popularity ranking?','No. The lists are editorial starting points, not measured trends, endorsements or country-availability guarantees. Each provider controls its own software and current terms.']
 ]}
};
