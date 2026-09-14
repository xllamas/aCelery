import{html as y,render as rt,useState as le,useEffect as Me,useCallback as st,Container as Z,ListGroup as W,Button as je,ButtonGroup as ct,Alert as dt,Panel as $t,Select as ut,ThemeSelect as ft,applyTheme as pt,currentTheme as Te,isDark as mt}from"acelery/ui.js";import*as U from"acelery/file.js";import{openDB as Pe}from"acelery/sql.js";import{runApp as bt}from"acelery/export.js";import{EDITOR_THEMES as Ae,isDarkTheme as yt}from"acelery/editor.js";import{html as S,useState as ee,useCallback as we,useRef as Ie,useDismiss as Be,Navbar as X,Nav as be,NavDropdown as ce,Container as Fe,Alert as de,Button as ye,Modal as z,ListGroup as he}from"acelery/ui.js";function B({title:a,items:n}){let[t,l]=ee(!1),[o,e]=ee(null),s=Ie(null),p=we(()=>{l(!1),e(null)},[]);Be(s,p,t);let c=i=>()=>{l(!1),e(null),i?.()};return S`
    <${X} expand="lg" className="bg-body-tertiary mb-3"
               expanded=${t} onToggle=${l}>
      <${Fe} fluid ref=${s}>
        <${X.Toggle} aria-controls="ide-nav" />
        <${X.Brand} className="h4 mb-0">${a}<//>
        <${X.Collapse} id="ide-nav">
          <${be} className="ms-auto">
            ${n.map(i=>i.items?S`
                    <${ce} key=${i.label} title=${i.label}
                                    id=${`nav-${i.label}`}
                                    disabled=${!!i.disabled}
                                    show=${o===i.label}
                                    onToggle=${d=>e(d?i.label:null)}>
                      ${i.items.map(d=>d.divider?S`<${ce.Divider} key=${d.key} />`:S`<${ce.Item} key=${d.label}
                                   disabled=${!!d.disabled}
                                   onClick=${c(d.onSelect)}>
                              ${d.label}
                            <//>`)}
                    <//>`:S`<${be.Link} key=${i.label} disabled=${!!i.disabled}
                          onClick=${c(i.onSelect)}>
                    ${i.label}
                  <//>`)}
          <//>
        <//>
      <//>
    <//>`}function Q({prompt:a,entries:n,icon:t="fa-solid fa-file",onPick:l,empty:o}){return n.length?S`
    <${de} variant="success">${a}<//>
    <${he}>
      ${n.map(e=>S`
          <${he.Item} key=${e.name} action
                             onClick=${()=>l(e.name)}>
            <div class="h5 mb-1"><i class=${t}></i> ${" "+e.name}</div>
            ${e.description?S`<p class="mb-0 text-body-secondary">${e.description}</p>`:null}
          <//>`)}
    <//>`:S`<${de} variant="secondary">
      ${o??"Nothing here yet."}
    <//>`}function te(){let[a,n]=ee(null),t=we((e,{title:s="aCelery",danger:p=!1}={})=>new Promise(c=>n({message:e,title:s,danger:p,resolve:c})),[]),l=e=>{a?.resolve(e),n(null)},o=a?S`
        <${z} show onHide=${()=>l(!1)} centered>
          <${z.Header} closeButton>
            <${z.Title}>${a.title}<//>
          <//>
          <${z.Body}>${a.message}<//>
          <${z.Footer}>
            <${ye} variant="secondary" onClick=${()=>l(!1)}>
              Cancel
            <//>
            <${ye} variant=${a.danger?"danger":"primary"}
                       onClick=${()=>l(!0)}>
              OK
            <//>
          <//>
        <//>`:null;return{confirm:t,dialog:o}}function F(){let[a,n]=ee(null);return{banner:a?S`<${de} variant=${a.variant??"info"} dismissible
                     onClose=${()=>n(null)}>
        ${a.text}
      <//>`:null,notify:(l,o="info")=>n({text:l,variant:o}),fail:l=>n({text:l?.message??String(l),variant:"danger"}),clear:()=>n(null)}}import{html as O,useState as H,useEffect as ae,useRef as ke,useCallback as $e,Button as V,ButtonGroup as Oe,Form as ve,Input as ue,Select as _e,Modal as N,notEmpty as ge}from"acelery/ui.js";import*as w from"acelery/file.js";import{runApp as Le,importProject as Re,exportProject as qe}from"acelery/export.js";var He="/aCelery/www/user/";async function Ge(a){let n=await w.listFiles("user",a.replace(/user\/$/,"")),t=[];for(let l of n){if(!l.directory)continue;let o="";try{let e=await w.open("acelery_app.json",a+l.fname),s=await e.read();await e.close(),s&&(o=JSON.parse(s).description??"")}catch{}t.push({name:l.fname,description:o})}return t.sort((l,o)=>l.name.localeCompare(o.name))}function Ue({show:a,onClose:n,onCreate:t}){return O`
    <${N} show=${a} onHide=${n} centered>
      <${N.Header} closeButton><${N.Title}>New Project<//><//>
      <${ve} initial=${{name:"",description:""}}
               onSubmit=${l=>t(l)}>
        <${N.Body}>
          <${ue} label="Name" name="name"
            placeholder="Letters and numbers, 16 max"
            validate=${[ge("A name is required"),l=>/^\w{1,16}$/.test(l??"")?!0:"Letters, numbers and underscore only, 16 at most"]} />
          <${ue} label="Description" name="description" as="textarea"
            placeholder="Short description, 140 chars max"
            validate=${[l=>(l??"").length<=140?!0:"140 characters at most"]} />
        <//>
        <${N.Footer}>
          <${V} variant="secondary" type="button" onClick=${n}>
            Close
          <//>
          <${V} variant="primary" type="submit">Create App<//>
        <//>
      <//>
    <//>`}function ze({show:a,project:n,onClose:t,onCreate:l}){return O`
    <${N} show=${a} onHide=${t} centered>
      <${N.Header} closeButton>
        <${N.Title}>New File for ${n}<//>
      <//>
      <${ve} initial=${{name:"",type:".js"}} onSubmit=${l}>
        <${N.Body}>
          <${ue} label="Name" name="name"
            placeholder="File name without extension"
            validate=${[ge("A name is required"),o=>/^[\w.-]+$/.test(o??"")?!0:"Letters, numbers, dot, dash and underscore only"]} />
          <${_e} label="Type" name="type" options=${[{label:"JavaScript",value:".js"},{label:"CSS",value:".css"}]} />
        <//>
        <${N.Footer}>
          <${V} variant="secondary" type="button" onClick=${t}>
            Close
          <//>
          <${V} variant="primary" type="submit">Create File<//>
        <//>
      <//>
    <//>`}var Qe=a=>`import { html, render, Panel } from "acelery/ui.js";

export default function main() {
  render(html\`
    <\${Panel} title="${a}">
      <p>Your app starts here.</p>
    <//>\`, document.body);
}
`;function Ce({onExit:a,editorTheme:n}){let[t,l]=H(null),[o,e]=H(""),[s,p]=H(""),[c,i]=H(!1),[d,C]=H({kind:"blank"}),[_,j]=H(null),{confirm:L,dialog:ie}=te(),{banner:K,notify:v,fail:x}=F(),R=ke(null),k=ke(null);ae(()=>{w.externalStoragePath().then($=>l($+He),x)},[]);let A=$e(async()=>{if(!(!s||!k.current))try{let $=await w.open(s,t+o);await $.write(k.current.getValue()),await $.close(),i(!1)}catch($){x($)}},[t,o,s]);ae(()=>(globalThis.forceSaveFile=()=>{s&&c&&A()},()=>{delete globalThis.forceSaveFile}),[s,c,A]);let g=$e(async()=>(s&&c&&await L(`Save changes to ${s}?`)&&await A(),k.current?.destroy(),k.current=null,p(""),i(!1),!0),[s,c,A,L]),Y=$e(async $=>{await g();try{let u=await w.open($,t+o),b=await u.read();await u.close(),p($),C({kind:"editor",name:$,text:b})}catch(u){x(u)}},[t,o,g]);ae(()=>{if(!(d.kind!=="editor"||!R.current))return k.current?.destroy(),k.current=globalThis.aceleryEditor.createEditor(R.current,{value:d.text,filename:d.name,theme:n,onChange:()=>i(!0)}),()=>{k.current?.destroy(),k.current=null}},[d.kind,d.name]),ae(()=>{k.current?.setTheme(n)},[n]);async function oe({name:$,description:u}){let b=$.trim().charAt(0).toUpperCase()+$.trim().slice(1);j(null);try{await w.mkdir(b,t);let M=await w.open("acelery_app.json",t+b);await M.write(JSON.stringify({name:b,description:u,entry:"main.js"})),await M.close();let me=await w.open("main.js",t+b);await me.write(Qe(b)),await me.close(),e(b),C({kind:"blank"})}catch(M){x(M)}}async function re({name:$,type:u}){j(null);let b=$.trim()+u;try{let M=await w.open(b,t+o);await M.write(""),await M.close(),await Y(b)}catch(M){x(M)}}async function T($){try{let u=$.startsWith("project")?await Ge(t):(await w.listFiles(o,t)).filter(b=>!b.directory).map(b=>({name:b.fname}));C({kind:"pick",mode:$,entries:u})}catch(u){x(u)}}async function I($,u){if($==="project-open")await g(),e(u),C({kind:"blank"});else if($==="project-delete"){if(!await L(`Delete project ${u} and all its files?`,{danger:!0}))return;await(await w.open(u,t)).delete(),u===o&&e(""),await T("project-delete"),v(`Deleted ${u}.`)}else if($==="project-export")qe(u);else if($==="file-open")await Y(u);else if($==="file-delete"){if(!await L(`Delete file ${u}?`,{danger:!0}))return;await(await w.open(u,t+o)).delete(),u===s&&await g(),await T("file-delete"),v(`Deleted ${u}.`)}}async function q(){await g(),e(""),C({kind:"blank"})}async function se(){await g(),a()}let h=o!=="",r=s!=="",f=[{label:"Project",items:[{label:"New",disabled:h,onSelect:()=>j("project")},{label:"Open",disabled:h,onSelect:()=>T("project-open")},{label:"Close",disabled:!h,onSelect:q},{label:"Delete",disabled:h,onSelect:()=>T("project-delete")},{divider:!0,key:"d1"},{label:"Import",onSelect:Re},{label:"Export",onSelect:()=>T("project-export")}]},{label:"File",disabled:!h,items:[{label:"New",disabled:r,onSelect:()=>j("file")},{label:"Open",disabled:r,onSelect:()=>T("file-open")},{label:"Save",disabled:!c,onSelect:A},{label:"Close",disabled:!r,onSelect:async()=>{await g(),C({kind:"blank"})}},{label:"Delete",disabled:r,onSelect:()=>T("file-delete")}]},{label:"Run",disabled:!h,onSelect:()=>Le(o,o,!0)},{label:"Main Menu",onSelect:se}],D=h?`aCelery Project: ${o}`:"aCelery IDE",E=null;if(!t)E=O`<p class="text-body-secondary">Starting…</p>`;else if(d.kind==="pick"){let $=d.mode.split("-")[1],u=d.mode.startsWith("project")?"project":"file";E=O`
      <${Q} prompt=${`Select ${u} to ${$}`} entries=${d.entries}
        icon=${u==="project"?"fa-solid fa-folder":"fa-solid fa-file"}
        empty=${`No ${u}s yet.`}
        onPick=${b=>I(d.mode,b)} />`}else d.kind==="editor"&&(E=O`
      <div class="acelery-editor border rounded" ref=${R}></div>
      ${c?O`<div class="mt-2">
            <${Oe} size="sm">
              <${V} variant="primary" onClick=${A}>Save<//>
            <//>
          </div>`:null}`);return O`
    <${B} title=${D} items=${f} />
    <div class="container-fluid">
      ${K}
      ${E}
    </div>
    <${Ue} show=${_==="project"}
      onClose=${()=>j(null)} onCreate=${oe} />
    <${ze} show=${_==="file"} project=${o}
      onClose=${()=>j(null)} onCreate=${re} />
    ${ie}`}import{html as m,useState as P,useEffect as Se,useCallback as xe,Button as G,ButtonGroup as Ve,Table as De,Form as Je,Input as We,TextArea as Ze,Modal as J,Alert as fe,CheckBox as Ke,TableMaint as Ye,notEmpty as Xe}from"acelery/ui.js";import*as ne from"acelery/file.js";import{openDB as et,deleteDB as tt}from"acelery/sql.js";function pe(a){if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(a))throw new Error(`"${a}" is not a usable table name`);return a}var at=["INT","DOU","REA","FLO","NUM","DEC","BOO","DAT"];function Ne({onExit:a}){let[n,t]=P(null),[l,o]=P(""),[e,s]=P(null),[p,c]=P(""),[i,d]=P({kind:"blank"}),[C,_]=P(!1),{confirm:j,dialog:L}=te(),{banner:ie,notify:K,fail:v}=F();Se(()=>{ne.externalStoragePath().then(r=>t(r+"/aCelery/"),v)},[]),Se(()=>()=>{e?.close()},[e]);let x=xe(async r=>{try{let f=await ne.listFiles("db",n);d({kind:"pick-db",mode:r,entries:f.filter(D=>!D.directory&&!D.fname.includes("journal")).map(D=>({name:D.fname}))})}catch(f){v(f)}},[n]);async function R(r){try{await e?.close();let f=await et(r);s(f),o(r),c(""),d({kind:"blank"})}catch(f){v(f)}}async function k(){await e?.close(),s(null),o(""),c(""),d({kind:"blank"})}async function A(r){if(await j(`Delete database ${r}?`,{danger:!0}))try{r===l&&await k(),await tt(r),await x("delete"),K(`Deleted ${r}.`)}catch(f){v(f)}}let g=xe(async r=>{if(e)try{let f=await e.select("select name from sqlite_master where type = ? order by name",["table"]);d({kind:"pick-table",mode:r,entries:f.map(D=>({name:D.name}))})}catch(f){v(f)}},[e]);async function Y(r){try{let f=await e.select(`PRAGMA table_info(${pe(r)})`);d({kind:"info",table:r,columns:f})}catch(f){v(f)}}async function oe(r){try{let f=await e.select(`PRAGMA table_info(${pe(r)})`);d({kind:"columns",table:r,columns:f})}catch(f){v(f)}}function re(r,f,D){c(r),d({kind:"table",table:r,fields:f.map(E=>({type:at.some($=>String(E.type).toUpperCase().includes($))?"number":"string",title:E.name,name:E.name,inList:D[E.name]??!0,inSearch:!0}))})}async function T(r){if(await j(`Delete table ${r}?`,{danger:!0}))try{await e.exec(`drop table ${pe(r)}`),r===p&&c(""),await g("delete"),K(`Dropped ${r}.`)}catch(f){v(f)}}let I=l!=="",q=p!=="",se=[{label:"Database",items:[{label:"New",disabled:I,onSelect:()=>_(!0)},{label:"Open",disabled:I,onSelect:()=>x("open")},{label:"Close",disabled:!I,onSelect:k},{label:"Delete",onSelect:()=>x("delete")}]},{label:"Table",disabled:!I,items:[{label:"Info",disabled:q,onSelect:()=>g("info")},{label:"Open",disabled:q,onSelect:()=>g("open")},{label:"Close",disabled:!q,onSelect:()=>{c(""),d({kind:"blank"})}},{label:"Delete",disabled:q,onSelect:()=>g("delete")}]},{label:"SQL",disabled:!I,onSelect:()=>d({kind:"sql"})},{label:"Main Menu",onSelect:async()=>{await k(),a()}}],h=null;return n?i.kind==="pick-db"?h=m`
      <${Q} prompt=${`Select database to ${i.mode}`}
        entries=${i.entries} icon="fa-solid fa-hard-drive"
        empty="No databases yet."
        onPick=${r=>i.mode==="open"?R(r):A(r)} />`:i.kind==="pick-table"?h=m`
      <${Q} prompt=${`Select table to ${i.mode}`}
        entries=${i.entries} icon="fa-solid fa-list"
        empty="This database has no tables yet."
        onPick=${r=>i.mode==="info"?Y(r):i.mode==="open"?oe(r):T(r)} />`:i.kind==="info"?h=m`<${lt} name=${i.table} columns=${i.columns} />`:i.kind==="columns"?h=m`
      <${it} name=${i.table} columns=${i.columns}
        onOpen=${r=>re(i.table,i.columns,r)} />`:i.kind==="table"?h=m`
      <${Ye} db=${e} title=${i.table} table=${i.table}
                     fields=${i.fields} onError=${v} />`:i.kind==="sql"&&(h=m`<${ot} db=${e}
                  onClose=${()=>d({kind:"blank"})} />`):h=m`<p class="text-body-secondary">Starting…</p>`,m`
    <${B} title=${I?`DB Manager: ${l}`:"DB Manager"}
                  items=${se} />
    <div class="container-fluid">
      ${ie}
      ${h}
    </div>
    <${nt} show=${C} onClose=${()=>_(!1)}
      onCreate=${({name:r})=>{_(!1),R(r.trim()+".db")}} />
    ${L}`}function nt({show:a,onClose:n,onCreate:t}){return m`
    <${J} show=${a} onHide=${n} centered>
      <${J.Header} closeButton><${J.Title}>New Database<//><//>
      <${Je} initial=${{name:""}} onSubmit=${t}>
        <${J.Body}>
          <${We} label="Name" name="name"
            placeholder="Database name without extension"
            validate=${[Xe("A name is required"),l=>/^[\w-]+$/.test(l??"")?!0:"Letters, numbers, dash and underscore only"]} />
        <//>
        <${J.Footer}>
          <${G} variant="secondary" type="button" onClick=${n}>
            Close
          <//>
          <${G} variant="primary" type="submit">Create Database<//>
        <//>
      <//>
    <//>`}function lt({name:a,columns:n}){return m`
    <h5>Table: ${a}</h5>
    <div class="table-responsive">
      <${De} striped size="sm">
        <thead>
          <tr>
            <th>Name</th><th>Type</th><th>Not Null</th><th>Default</th><th>PK</th>
          </tr>
        </thead>
        <tbody>
          ${n.map(t=>m`
              <tr key=${t.name}>
                <td>${t.name}</td>
                <td>${t.type}</td>
                <td>${t.notnull}</td>
                <td>${t.dflt_value??""}</td>
                <td>${t.pk}</td>
              </tr>`)}
        </tbody>
      <//>
    </div>`}function it({name:a,columns:n,onOpen:t}){let[l,o]=P(()=>Object.fromEntries(n.map(e=>[e.name,!0])));return m`
    <h5>Columns to list — ${a}</h5>
    ${n.map(e=>m`
        <${Ke} key=${e.name} label=${e.name} checked=${l[e.name]}
          onChange=${s=>o(p=>({...p,[e.name]:s}))} />`)}
    <${G} variant="primary" onClick=${()=>t(l)}>Open Table<//>`}function ot({db:a,onClose:n}){let[t,l]=P(""),[o,e]=P(null);async function s(){let c=t.trim();if(c)try{if(/^select\b/i.test(c)){let i=await a.select(c);e({kind:"rows",rows:i})}else/^insert\b/i.test(c)?e({kind:"text",text:`Inserted row id: ${await a.insert(c)}`}):e({kind:"text",text:`${await a.exec(c)} row(s) changed.`})}catch(i){e({kind:"error",text:i.message})}}let p=o?.rows?.length?Object.keys(o.rows[0]):[];return m`
    <h5>SQL Query</h5>
    <${Ze} label="Query" name="query" rows=${5} value=${t}
                 onChange=${l} />
    <${Ve} size="sm" className="mb-3">
      <${G} variant="primary" onClick=${s}>Exec<//>
      <${G} variant="secondary" onClick=${()=>{l(""),e(null)}}>
        Clear
      <//>
      <${G} variant="secondary" onClick=${n}>Close<//>
    <//>

    ${o?.kind==="error"?m`<${fe} variant="danger">${o.text}<//>`:null}
    ${o?.kind==="text"?m`<${fe} variant="info">${o.text}<//>`:null}
    ${o?.kind==="rows"&&!o.rows.length?m`<${fe} variant="secondary">Zero rows returned<//>`:null}
    ${o?.kind==="rows"&&o.rows.length?m`
          <div class="table-responsive">
            <${De} striped size="sm">
              <thead>
                <tr>${p.map(c=>m`<th key=${c}>${c}</th>`)}</tr>
              </thead>
              <tbody>
                ${o.rows.map((c,i)=>m`
                    <tr key=${i}>
                      ${p.map(d=>m`<td key=${d}>${c[d]??""}</td>`)}
                    </tr>`)}
              </tbody>
            <//>
          </div>`:null}`}async function ht(){let a=await Pe("acelery.db");await a.exec("create table if not exists config (cfg_key text unique, cfg_value text)");let n=await a.select("select cfg_key, cfg_value from config");return await a.close(),Object.fromEntries(n.map(t=>[t.cfg_key,t.cfg_value]))}async function wt(a){let n=await Pe("acelery.db");for(let[t,l]of Object.entries(a))await n.exec("insert into config (cfg_key, cfg_value) values (?, ?) on conflict(cfg_key) do update set cfg_value = excluded.cfg_value",[t,l]);await n.close()}var kt=[{key:"apps",icon:"fa-solid fa-table-cells",title:"My Apps",blurb:"List and run your aCelery apps"},{key:"ide",icon:"fa-solid fa-pen-to-square",title:"aCelery IDE",blurb:"Integrated Development Environment for aCelery apps"},{key:"db",icon:"fa-solid fa-hard-drive",title:"DB Manager",blurb:"Manage your SQL databases"},{key:"config",icon:"fa-solid fa-gear",title:"Configure",blurb:"Configure aCelery"},{key:"site",icon:"fa-solid fa-cloud",title:"Visit Website",blurb:"Visit www.acelery.com",href:"http://www.acelery.com/"}];function vt({onGo:a}){return y`
    <${Z} fluid className="p-0">
      <${W}>
        ${kt.map(n=>n.href?y`
                <${W.Item} key=${n.key} action href=${n.href}
                                   target="_blank" rel="noopener">
                  <${Ee} item=${n} />
                <//>`:y`
                <${W.Item} key=${n.key} action
                                   onClick=${()=>a(n.key)}>
                  <${Ee} item=${n} />
                <//>`)}
      <//>
    <//>`}var Ee=({item:a})=>y`
  <div class="h3 mb-1"><i class=${a.icon}></i> ${" "+a.title}</div>
  <p class="mb-0 text-body-secondary">${a.blurb}</p>`;function gt({onExit:a}){let[n,t]=le(null),{banner:l,fail:o}=F();return Me(()=>{(async()=>{try{let e=await U.externalStoragePath()+"/aCelery/www/",s=await U.listFiles("user",e),p=[];for(let c of s){if(!c.directory)continue;let i="";try{let d=await U.open("acelery_app.json",`${e}user/${c.fname}`),C=await d.read();await d.close(),C&&(i=JSON.parse(C).description??"")}catch{}p.push({name:c.fname,description:i})}t(p.sort((c,i)=>c.name.localeCompare(i.name)))}catch(e){o(e),t([])}})()},[]),y`
    <${B} title="aCelery Apps"
      items=${[{label:"Main Menu",onSelect:a}]} />
    <${Z} fluid>
      ${l}
      ${n===null?y`<p class="text-body-secondary">Looking for apps…</p>`:n.length?y`
              <${W}>
                ${n.map(e=>y`
                    <${W.Item} key=${e.name} action
                      onClick=${()=>bt(e.name,e.name,!1)}>
                      <div class="h3 mb-1">
                        <i class="fa-solid fa-table-cells"></i>
                        ${" "+e.name}
                      </div>
                      <p class="mb-0 text-body-secondary">${e.description}</p>
                    <//>`)}
              <//>`:y`<${dt} variant="secondary">
              No apps yet. Make one in the IDE.
            <//>`}
    <//>`}function Ct({settings:a,onChange:n,onExit:t}){let[l,o]=le(a.editortheme??""),{banner:e,notify:s,fail:p}=F();async function c(){try{await wt({theme:Te(),editortheme:l}),n({theme:Te(),editortheme:l}),s("Configuration saved.","success")}catch(i){p(i)}}return y`
    <${B} title="aCelery Configuration"
      items=${[{label:"Main Menu",onSelect:t}]} />
    <${Z} fluid>
      ${e}
      <${$t} title="aCelery Configuration">
        <${ft} label="aCelery Theme" />
        <${ut} label="Editor Theme" value=${l}
          onChange=${o} options=${Ae}
          help=${l?`${yt(l)?"A dark":"A light"} scheme, regardless of the aCelery theme.`:"Tracks whichever aCelery theme is active."} />
        <${ct}>
          <${je} variant="primary" onClick=${c}>Save<//>
          <${je} variant="secondary" onClick=${t}>Exit<//>
        <//>
      <//>
    <//>`}function St(){let[a,n]=le(new URLSearchParams(location.search).get("opt")==="apps"?"apps":"menu"),[t,l]=le(null);Me(()=>{ht().then(s=>{s.theme&&pt(s.theme),l(s)},()=>l({}))},[]);let o=st(()=>{let s=t?.editortheme;return s&&Ae.some(p=>p.value===s)?s:mt()?"dark":"light"},[t])(),e=()=>n("menu");if(!t)return y`<${Z} fluid className="pt-3">
      <p class="text-body-secondary">Starting…</p>
    <//>`;switch(a){case"apps":return y`<${gt} onExit=${e} />`;case"ide":return y`<${Ce} onExit=${e} editorTheme=${o} />`;case"db":return y`<${Ne} onExit=${e} />`;case"config":return y`<${Ct} settings=${t}
        onChange=${s=>l({...t,...s})}
        onExit=${e} />`;default:return y`<${Z} fluid className="pt-3">
        <${vt} onGo=${n} />
      <//>`}}function xt(a=document.body){rt(y`<${St} />`,a)}export{xt as default};
