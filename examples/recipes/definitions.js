// Application presets, not new public layout names or showcase APIs.
export const recipes=Object.freeze({
 workspace:{title:'Workspace',primary:'draft',workspace:true,layout:/** @type {const} */('grid'),assembled:false},
 orbit:{title:'Portfolio orbit',primary:'atlas',workspace:false,layout:/** @type {const} */('grid'),assembled:false},
 comparison:{title:'Comparison',primary:'before',workspace:false,layout:/** @type {const} */('grid'),assembled:false},
 breakdown:{title:'Product breakdown',primary:'header',workspace:true,layout:/** @type {const} */('grid'),assembled:true},
 onboarding:{title:'Onboarding steps',primary:'account',workspace:false,layout:/** @type {const} */('rail'),assembled:false},
 board:{title:'Reference board',primary:'reading',workspace:false,layout:/** @type {const} */('fan'),assembled:false},
 dashboard:{title:'Dashboard focus',primary:'summary',workspace:false,layout:/** @type {const} */('grid'),assembled:false},
 stacked:{title:'Responsive stacked cards',primary:'basics',workspace:false,layout:/** @type {const} */('pile'),assembled:false},
});
