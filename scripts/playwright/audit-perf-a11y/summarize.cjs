const r=require("./screenshots/metrics.json");
for(const x of r){console.log("\n##",x.name,"load",x.loadMs,"fcp",x.fcp,"tot",x.totalKB,"img",x.imgKB,"font",x.fontKB,"req",x.requests,"3p",x.thirdParty.join(","),x.thirdKB);
console.log(" sb:",JSON.stringify(x.sbCounts)); console.log(" imgs:",JSON.stringify(x.imgs.slice(0,3)));
const d=x.dom; console.log(" dom: theme",d.theme,"main",d.main,"nav",d.nav,"h1",JSON.stringify(d.h1),"hd",d.headings,"live",d.live,"tgt",d.targets,"<24",d.small24n,JSON.stringify(d.small24.slice(0,4)),"<44",d.under44,"lang",d.lang);
for(const a of x.axe) console.log("  axe",a.id,a.impact,a.n,JSON.stringify(a.ex[0]).slice(0,230));}
