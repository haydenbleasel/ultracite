import{_ as U,a as j,b as A}from"./C8mEIphS.js";import{_ as q}from"./CUiVfWy_.js";import{f as z,m as H,g as O,r as W,h as X,j as J,i as K,V as P,o,c as n,a as e,t as g,F as a,b as m,q as d,l as h,w as M,d as F,W as Q,s as T,x as s,n as R,X as _,G as x,H as f}from"./Dio59dAG.js";const Y=["open"],Z={block:""},ee={class:"absolute right-[calc(100%+10px)] top-1.5","text-right":"","font-mono":"",op35:"","lt-lg:hidden":""},oe={flex:"~ gap-2 items-start wrap items-center","cursor-pointer":"","select-none":"","bg-hover":"",px2:"",py2:"","text-sm":"","font-mono":""},te=e("div",{class:"[details[open]_&]:rotate-90","i-ph-caret-right":"",op50:"",transition:""},null,-1),ne={flex:"","flex-auto":"","flex-col":"","gap-3":"","md:flex-row":""},se={"flex-auto":"",flex:"~ gap-2 items-center"},ie=e("span",{op75:""},"Config",-1),le=e("span",{op75:""},"Globs",-1),ae={key:2,op50:""},re={flex:"~ gap-2 items-start wrap"},de={"pointer-events-none":"",absolute:"","right-2":"","top-2":"","text-right":"","text-5em":"","font-mono":"",op5:""},pe={key:0,flex:"~ col gap-4","of-auto":"",px4:"",py4:""},ce={flex:"~ gap-2 items-center"},ue=e("div",{"i-ph-stack-duotone":"","flex-none":""},null,-1),_e={flex:"~ col gap-1",ml6:"","mt--2":""},fe={badge:"","text-start":""},ge={key:0,"max-h":"50vh","min-w-100":""},he={flex:"~ items-center gap-2",p3:""},me=["onClick"],ve=e("div",{"i-ph-stack-duotone":""},null,-1),be={p3:"",border:"t base"},xe={flex:"~ gap-2 items-start"},ye=e("div",{"i-ph-file-magnifying-glass-duotone":"",my1:"","flex-none":"",op75:""},null,-1),ke={flex:"~ col gap-2"},$e=e("div",{op50:""}," Applies to files matching ",-1),we={flex:"~ gap-2 items-center wrap"},Ce=e("div",{flex:"~ gap-2 items-center"},[e("div",{"i-ph-file-magnifying-glass-duotone":"","flex-none":""}),e("div",null,"Matched Globs")],-1),Fe={flex:"~ gap-1 wrap",ml6:"","mt--2":""},Te={flex:"~ gap-2 items-center"},Ge=e("div",{"i-ph-files-duotone":"","flex-none":""},null,-1),Ne={flex:"~ col gap-1",ml7:"","mt--2":""},Se=z({__name:"FileGroupItem",props:H({index:{},group:{}},{open:{default:!0},openModifiers:{}}),emits:["update:open"],setup(y){const p=y,c=O(y,"open"),v=W(c.value);if(!v.value){const t=X(()=>{c.value&&(v.value=!0,t())})}const l=J(()=>{if(p.group.configs.length===1)return{type:"config",config:p.group.configs[0]};if(p.group.globs.size<=2)return{type:"glob",globs:[...p.group.globs.values()]}}),k=K();function $(t){k.push(`/configs?index=${t+1}`)}return(t,u)=>{var N,S,V;const b=U,w=j,G=q,B=P("VDropdown"),L=A;return o(),n("details",{class:"flat-config-item",open:c.value,border:"~ base rounded-lg",relative:"",onToggle:u[0]||(u[0]=i=>c.value=i.target.open)},[e("summary",Z,[e("div",ee," #"+g(t.index+1),1),e("div",oe,[te,e("div",ne,[e("span",se,[((N=l.value)==null?void 0:N.type)==="config"?(o(),n(a,{key:0},[ie,m(b,{badge:"",name:l.value.config.name,index:l.value.config.index},null,8,["name","index"])],64)):((S=l.value)==null?void 0:S.type)==="glob"?(o(),n(a,{key:1},[le,(o(!0),n(a,null,d(l.value.globs,(i,r)=>(o(),h(w,{key:r,glob:i,"text-gray":""},null,8,["glob"]))),128))],64)):(o(),n("span",ae," Files group #"+g(t.index+1),1))]),e("div",re,[m(G,{icon:"i-ph-files-duotone",number:((V=t.group.files)==null?void 0:V.length)||0,color:"text-yellow5",title:"Files"},null,8,["number"]),m(G,{icon:"i-ph-stack-duotone",number:t.group.configs.length,color:"text-blue5 dark:text-blue4",title:"Rules","mr-2":""},null,8,["number"])])])])]),e("div",de," #"+g(t.index+1),1),v.value?(o(),n("div",pe,[e("div",ce,[ue,e("div",null,"Configs Specific to the Files ("+g(t.group.configs.length)+")",1)]),e("div",_e,[(o(!0),n(a,null,d(t.group.configs,(i,r)=>(o(),n("div",{key:r,"font-mono":"",flex:"~ gap-2"},[m(B,null,{popper:M(({shown:D})=>{var I;return[D?(o(),n("div",ge,[e("div",he,[e("button",{"btn-action-sm":"",title:"Copy",onClick:C=>$(r)},[ve,F(" Go to this config ")],8,me),Q(t.$slots,"popup-actions")]),e("div",be,[e("div",xe,[ye,e("div",ke,[$e,e("div",we,[(o(!0),n(a,null,d((I=i.files)==null?void 0:I.flat(),(C,E)=>(o(),h(w,{key:E,glob:C,active:t.group.globs.has(C)},null,8,["glob","active"]))),128))])])])])])):T("",!0)]}),default:M(()=>[e("button",fe,[m(b,{name:i.name,index:r},null,8,["name","index"])])]),_:2},1024)]))),128))]),Ce,e("div",Fe,[(o(!0),n(a,null,d(t.group.globs,(i,r)=>(o(),h(w,{key:r,glob:i},null,8,["glob"]))),128))]),e("div",Te,[Ge,e("div",null,"Matched Local Files ("+g(t.group.files.length)+")",1)]),e("div",Ne,[(o(!0),n(a,null,d(t.group.files,i=>(o(),h(L,{key:i,"font-mono":"",filepath:i},null,8,["filepath"]))),128))])])):T("",!0)],40,Y)}}}),Ve={key:0,flex:"~ col gap-4",my4:""},Ie=e("div",{"text-gray:75":""},[F(" This tab shows the preview for files match from the workspace. This feature is "),e("span",{"text-amber":""},"experimental"),F(" and may not be 100% accurate. ")],-1),Me={flex:"~ gap-2 items-center"},Re={border:"~ base rounded",flex:"~ inline"},Ae=e("div",{"i-ph-files-duotone":""},null,-1),ze=e("span",null,"List",-1),Be=[Ae,ze],Le=e("div",{border:"l base"},null,-1),De=e("div",{"i-ph-rows-duotone":""},null,-1),Ee=e("span",null,"File Groups",-1),Ue=[De,Ee],je=e("div",{"flex-auto":""},null,-1),qe={key:0,flex:"~ gap-2 col"},He={key:1},Oe={flex:"~ gap-2 items-center"},We=e("div",{"i-ph-files-duotone":"","flex-none":""},null,-1),Xe={flex:"~ col gap-1",py4:"","font-mono":""},Je={key:1},Ke=e("div",{p3:"",italic:"",op50:""}," No matched files found in the workspace. ",-1),Pe=[Ke],eo=z({__name:"files",setup(y){function p(){_.value=_.value.map(()=>!0)}function c(){_.value=_.value.map(()=>!1)}return(v,l)=>{const k=Se,$=A;return s(x).filesResolved?(o(),n("div",Ve,[Ie,e("div",Me,[e("div",Re,[e("button",{class:R(s(f).viewFilesTab==="list"?"btn-action-active":"op50"),"border-none":"","btn-action":"",onClick:l[0]||(l[0]=t=>s(f).viewFilesTab="list")},Be,2),Le,e("button",{class:R(s(f).viewFilesTab==="group"?"btn-action-active":"op50"),"border-none":"","btn-action":"",onClick:l[1]||(l[1]=t=>s(f).viewFilesTab="group")},Ue,2)]),je,s(f).viewFilesTab==="group"?(o(),n(a,{key:0},[e("button",{px3:"","btn-action":"",onClick:p}," Expand All "),e("button",{px3:"","btn-action":"",onClick:c}," Collapse All ")],64)):T("",!0)]),s(f).viewFilesTab==="group"?(o(),n("div",qe,[(o(!0),n(a,null,d(s(x).filesResolved.groups,(t,u)=>(o(),h(k,{key:t.id,open:s(_)[u],"onUpdate:open":b=>s(_)[u]=b,group:t,index:u},null,8,["open","onUpdate:open","group","index"]))),128))])):(o(),n("div",He,[e("div",Oe,[We,e("div",null,"Matched Local Files ("+g(s(x).filesResolved.list.length)+")",1)]),e("div",Xe,[(o(!0),n(a,null,d(s(x).filesResolved.list,t=>(o(),h($,{key:t,filepath:t},null,8,["filepath"]))),128))])]))])):(o(),n("div",Je,Pe))}}});export{eo as default};
