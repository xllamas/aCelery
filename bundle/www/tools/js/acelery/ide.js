import{html as y,render as it,useState as le,useEffect as Pe,useCallback as rt,Container as Z,ListGroup as W,Button as je,ButtonGroup as st,Alert as ct,Panel as dt,Select as $t,ThemeSelect as ut,applyTheme as ft,currentTheme as Te,isDark as pt}from"acelery/ui.js";import*as U from"acelery/file.js";import{openDB as Me}from"acelery/sql.js";import{runApp as bt}from"acelery/export.js";import{html as S,useState as ee,useCallback as we,useRef as Fe,useDismiss as Be,Navbar as X,Nav as me,NavDropdown as ce,Container as Ie,Alert as de,Button as ye,Modal as z,ListGroup as he}from"acelery/ui.js";function I({title:a,items:n}){let[t,l]=ee(!1),[i,e]=ee(null),s=Fe(null),b=we(()=>{l(!1),e(null)},[]);Be(s,b,t);let c=o=>()=>{l(!1),e(null),o?.()};return S`
    <${X} expand="lg" className="bg-body-tertiary mb-3"
               expanded=${t} onToggle=${l}>
      <${Ie} fluid ref=${s}>
        <${X.Toggle} aria-controls="ide-nav" />
        <${X.Brand} className="h4 mb-0">${a}<//>
        <${X.Collapse} id="ide-nav">
          <${me} className="ms-auto">
            ${n.map(o=>o.items?S`
                    <${ce} key=${o.label} title=${o.label}
                                    id=${`nav-${o.label}`}
                                    disabled=${!!o.disabled}
                                    show=${i===o.label}
                                    onToggle=${d=>e(d?o.label:null)}>
                      ${o.items.map(d=>d.divider?S`<${ce.Divider} key=${d.key} />`:S`<${ce.Item} key=${d.label}
                                   disabled=${!!d.disabled}
                                   onClick=${c(d.onSelect)}>
                              ${d.label}
                            <//>`)}
                    <//>`:S`<${me.Link} key=${o.label} disabled=${!!o.disabled}
                          onClick=${c(o.onSelect)}>
                    ${o.label}
                  <//>`)}
          <//>
        <//>
      <//>
    <//>`}function Q({prompt:a,entries:n,icon:t="fa-solid fa-file",onPick:l,empty:i}){return n.length?S`
    <${de} variant="success">${a}<//>
    <${he}>
      ${n.map(e=>S`
          <${he.Item} key=${e.name} action
                             onClick=${()=>l(e.name)}>
            <div class="h5 mb-1"><i class=${t}></i> ${" "+e.name}</div>
            ${e.description?S`<p class="mb-0 text-body-secondary">${e.description}</p>`:null}
          <//>`)}
    <//>`:S`<${de} variant="secondary">
      ${i??"Nothing here yet."}
    <//>`}function te(){let[a,n]=ee(null),t=we((e,{title:s="aCelery",danger:b=!1}={})=>new Promise(c=>n({message:e,title:s,danger:b,resolve:c})),[]),l=e=>{a?.resolve(e),n(null)},i=a?S`
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
        <//>`:null;return{confirm:t,dialog:i}}function A(){let[a,n]=ee(null);return{banner:a?S`<${de} variant=${a.variant??"info"} dismissible
                     onClose=${()=>n(null)}>
        ${a.text}
      <//>`:null,notify:(l,i="info")=>n({text:l,variant:i}),fail:l=>n({text:l?.message??String(l),variant:"danger"}),clear:()=>n(null)}}import{html as O,useState as G,useEffect as ae,useRef as ke,useCallback as $e,Button as V,ButtonGroup as Ae,Form as ve,Input as ue,Select as Oe,Modal as N,notEmpty as ge}from"acelery/ui.js";import*as w from"acelery/file.js";import{runApp as _e,importProject as Le,exportProject as qe}from"acelery/export.js";var Re="/aCelery/www/user/";async function Ge(a){let n=await w.listFiles("user",a.replace(/user\/$/,"")),t=[];for(let l of n){if(!l.directory)continue;let i="";try{let e=await w.open("acelery_app.json",a+l.fname),s=await e.read();await e.close(),s&&(i=JSON.parse(s).description??"")}catch{}t.push({name:l.fname,description:i})}return t.sort((l,i)=>l.name.localeCompare(i.name))}function He({show:a,onClose:n,onCreate:t}){return O`
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
    <//>`}function Ue({show:a,project:n,onClose:t,onCreate:l}){return O`
    <${N} show=${a} onHide=${t} centered>
      <${N.Header} closeButton>
        <${N.Title}>New File for ${n}<//>
      <//>
      <${ve} initial=${{name:"",type:".js"}} onSubmit=${l}>
        <${N.Body}>
          <${ue} label="Name" name="name"
            placeholder="File name without extension"
            validate=${[ge("A name is required"),i=>/^[\w.-]+$/.test(i??"")?!0:"Letters, numbers, dot, dash and underscore only"]} />
          <${Oe} label="Type" name="type" options=${[{label:"JavaScript",value:".js"},{label:"CSS",value:".css"}]} />
        <//>
        <${N.Footer}>
          <${V} variant="secondary" type="button" onClick=${t}>
            Close
          <//>
          <${V} variant="primary" type="submit">Create File<//>
        <//>
      <//>
    <//>`}var ze=a=>`import { html, render, Panel } from "acelery/ui.js";

export default function main() {
  render(html\`
    <\${Panel} title="${a}">
      <p>Your app starts here.</p>
    <//>\`, document.body);
}
`;function Ce({onExit:a,editorTheme:n}){let[t,l]=G(null),[i,e]=G(""),[s,b]=G(""),[c,o]=G(!1),[d,C]=G({kind:"blank"}),[_,j]=G(null),{confirm:L,dialog:oe}=te(),{banner:K,notify:v,fail:x}=A(),q=ke(null),k=ke(null);ae(()=>{w.externalStoragePath().then($=>l($+Re),x)},[]);let F=$e(async()=>{if(!(!s||!k.current))try{let $=await w.open(s,t+i);await $.write(k.current.getValue()),await $.close(),o(!1)}catch($){x($)}},[t,i,s]);ae(()=>(globalThis.forceSaveFile=()=>{s&&c&&F()},()=>{delete globalThis.forceSaveFile}),[s,c,F]);let g=$e(async()=>(s&&c&&await L(`Save changes to ${s}?`)&&await F(),k.current?.destroy(),k.current=null,b(""),o(!1),!0),[s,c,F,L]),Y=$e(async $=>{await g();try{let u=await w.open($,t+i),m=await u.read();await u.close(),b($),C({kind:"editor",name:$,text:m})}catch(u){x(u)}},[t,i,g]);ae(()=>{if(!(d.kind!=="editor"||!q.current))return k.current?.destroy(),k.current=globalThis.aceleryEditor.createEditor(q.current,{value:d.text,filename:d.name,theme:n,onChange:()=>o(!0)}),()=>{k.current?.destroy(),k.current=null}},[d.kind,d.name]),ae(()=>{k.current?.setTheme(n)},[n]);async function ie({name:$,description:u}){let m=$.trim().charAt(0).toUpperCase()+$.trim().slice(1);j(null);try{await w.mkdir(m,t);let P=await w.open("acelery_app.json",t+m);await P.write(JSON.stringify({name:m,description:u,entry:"main.js"})),await P.close();let be=await w.open("main.js",t+m);await be.write(ze(m)),await be.close(),e(m),C({kind:"blank"})}catch(P){x(P)}}async function re({name:$,type:u}){j(null);let m=$.trim()+u;try{let P=await w.open(m,t+i);await P.write(""),await P.close(),await Y(m)}catch(P){x(P)}}async function T($){try{let u=$.startsWith("project")?await Ge(t):(await w.listFiles(i,t)).filter(m=>!m.directory).map(m=>({name:m.fname}));C({kind:"pick",mode:$,entries:u})}catch(u){x(u)}}async function B($,u){if($==="project-open")await g(),e(u),C({kind:"blank"});else if($==="project-delete"){if(!await L(`Delete project ${u} and all its files?`,{danger:!0}))return;await(await w.open(u,t)).delete(),u===i&&e(""),await T("project-delete"),v(`Deleted ${u}.`)}else if($==="project-export")qe(u);else if($==="file-open")await Y(u);else if($==="file-delete"){if(!await L(`Delete file ${u}?`,{danger:!0}))return;await(await w.open(u,t+i)).delete(),u===s&&await g(),await T("file-delete"),v(`Deleted ${u}.`)}}async function R(){await g(),e(""),C({kind:"blank"})}async function se(){await g(),a()}let h=i!=="",r=s!=="",f=[{label:"Project",items:[{label:"New",disabled:h,onSelect:()=>j("project")},{label:"Open",disabled:h,onSelect:()=>T("project-open")},{label:"Close",disabled:!h,onSelect:R},{label:"Delete",disabled:h,onSelect:()=>T("project-delete")},{divider:!0,key:"d1"},{label:"Import",onSelect:Le},{label:"Export",onSelect:()=>T("project-export")}]},{label:"File",disabled:!h,items:[{label:"New",disabled:r,onSelect:()=>j("file")},{label:"Open",disabled:r,onSelect:()=>T("file-open")},{label:"Save",disabled:!c,onSelect:F},{label:"Close",disabled:!r,onSelect:async()=>{await g(),C({kind:"blank"})}},{label:"Delete",disabled:r,onSelect:()=>T("file-delete")}]},{label:"Run",disabled:!h,onSelect:()=>_e(i,i,!0)},{label:"Main Menu",onSelect:se}],D=h?`aCelery Project: ${i}`:"aCelery IDE",E=null;if(!t)E=O`<p class="text-body-secondary">Starting…</p>`;else if(d.kind==="pick"){let $=d.mode.split("-")[1],u=d.mode.startsWith("project")?"project":"file";E=O`
      <${Q} prompt=${`Select ${u} to ${$}`} entries=${d.entries}
        icon=${u==="project"?"fa-solid fa-folder":"fa-solid fa-file"}
        empty=${`No ${u}s yet.`}
        onPick=${m=>B(d.mode,m)} />`}else d.kind==="editor"&&(E=O`
      <div class="acelery-editor border rounded" ref=${q}></div>
      ${c?O`<div class="mt-2">
            <${Ae} size="sm">
              <${V} variant="primary" onClick=${F}>Save<//>
            <//>
          </div>`:null}`);return O`
    <${I} title=${D} items=${f} />
    <div class="container-fluid">
      ${K}
      ${E}
    </div>
    <${He} show=${_==="project"}
      onClose=${()=>j(null)} onCreate=${ie} />
    <${Ue} show=${_==="file"} project=${i}
      onClose=${()=>j(null)} onCreate=${re} />
    ${oe}`}import{html as p,useState as M,useEffect as Se,useCallback as xe,Button as H,ButtonGroup as Qe,Table as De,Form as Ve,Input as Je,TextArea as We,Modal as J,Alert as fe,CheckBox as Ze,TableMaint as Ke,notEmpty as Ye}from"acelery/ui.js";import*as ne from"acelery/file.js";import{openDB as Xe,deleteDB as et}from"acelery/sql.js";function pe(a){if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(a))throw new Error(`"${a}" is not a usable table name`);return a}var tt=["INT","DOU","REA","FLO","NUM","DEC","BOO","DAT"];function Ne({onExit:a}){let[n,t]=M(null),[l,i]=M(""),[e,s]=M(null),[b,c]=M(""),[o,d]=M({kind:"blank"}),[C,_]=M(!1),{confirm:j,dialog:L}=te(),{banner:oe,notify:K,fail:v}=A();Se(()=>{ne.externalStoragePath().then(r=>t(r+"/aCelery/"),v)},[]),Se(()=>()=>{e?.close()},[e]);let x=xe(async r=>{try{let f=await ne.listFiles("db",n);d({kind:"pick-db",mode:r,entries:f.filter(D=>!D.directory&&!D.fname.includes("journal")).map(D=>({name:D.fname}))})}catch(f){v(f)}},[n]);async function q(r){try{await e?.close();let f=await Xe(r);s(f),i(r),c(""),d({kind:"blank"})}catch(f){v(f)}}async function k(){await e?.close(),s(null),i(""),c(""),d({kind:"blank"})}async function F(r){if(await j(`Delete database ${r}?`,{danger:!0}))try{r===l&&await k(),await et(r),await x("delete"),K(`Deleted ${r}.`)}catch(f){v(f)}}let g=xe(async r=>{if(e)try{let f=await e.select("select name from sqlite_master where type = ? order by name",["table"]);d({kind:"pick-table",mode:r,entries:f.map(D=>({name:D.name}))})}catch(f){v(f)}},[e]);async function Y(r){try{let f=await e.select(`PRAGMA table_info(${pe(r)})`);d({kind:"info",table:r,columns:f})}catch(f){v(f)}}async function ie(r){try{let f=await e.select(`PRAGMA table_info(${pe(r)})`);d({kind:"columns",table:r,columns:f})}catch(f){v(f)}}function re(r,f,D){c(r),d({kind:"table",table:r,fields:f.map(E=>({type:tt.some($=>String(E.type).toUpperCase().includes($))?"number":"string",title:E.name,name:E.name,inList:D[E.name]??!0,inSearch:!0}))})}async function T(r){if(await j(`Delete table ${r}?`,{danger:!0}))try{await e.exec(`drop table ${pe(r)}`),r===b&&c(""),await g("delete"),K(`Dropped ${r}.`)}catch(f){v(f)}}let B=l!=="",R=b!=="",se=[{label:"Database",items:[{label:"New",disabled:B,onSelect:()=>_(!0)},{label:"Open",disabled:B,onSelect:()=>x("open")},{label:"Close",disabled:!B,onSelect:k},{label:"Delete",onSelect:()=>x("delete")}]},{label:"Table",disabled:!B,items:[{label:"Info",disabled:R,onSelect:()=>g("info")},{label:"Open",disabled:R,onSelect:()=>g("open")},{label:"Close",disabled:!R,onSelect:()=>{c(""),d({kind:"blank"})}},{label:"Delete",disabled:R,onSelect:()=>g("delete")}]},{label:"SQL",disabled:!B,onSelect:()=>d({kind:"sql"})},{label:"Main Menu",onSelect:async()=>{await k(),a()}}],h=null;return n?o.kind==="pick-db"?h=p`
      <${Q} prompt=${`Select database to ${o.mode}`}
        entries=${o.entries} icon="fa-solid fa-hard-drive"
        empty="No databases yet."
        onPick=${r=>o.mode==="open"?q(r):F(r)} />`:o.kind==="pick-table"?h=p`
      <${Q} prompt=${`Select table to ${o.mode}`}
        entries=${o.entries} icon="fa-solid fa-list"
        empty="This database has no tables yet."
        onPick=${r=>o.mode==="info"?Y(r):o.mode==="open"?ie(r):T(r)} />`:o.kind==="info"?h=p`<${nt} name=${o.table} columns=${o.columns} />`:o.kind==="columns"?h=p`
      <${lt} name=${o.table} columns=${o.columns}
        onOpen=${r=>re(o.table,o.columns,r)} />`:o.kind==="table"?h=p`
      <${Ke} db=${e} title=${o.table} table=${o.table}
                     fields=${o.fields} onError=${v} />`:o.kind==="sql"&&(h=p`<${ot} db=${e}
                  onClose=${()=>d({kind:"blank"})} />`):h=p`<p class="text-body-secondary">Starting…</p>`,p`
    <${I} title=${B?`DB Manager: ${l}`:"DB Manager"}
                  items=${se} />
    <div class="container-fluid">
      ${oe}
      ${h}
    </div>
    <${at} show=${C} onClose=${()=>_(!1)}
      onCreate=${({name:r})=>{_(!1),q(r.trim()+".db")}} />
    ${L}`}function at({show:a,onClose:n,onCreate:t}){return p`
    <${J} show=${a} onHide=${n} centered>
      <${J.Header} closeButton><${J.Title}>New Database<//><//>
      <${Ve} initial=${{name:""}} onSubmit=${t}>
        <${J.Body}>
          <${Je} label="Name" name="name"
            placeholder="Database name without extension"
            validate=${[Ye("A name is required"),l=>/^[\w-]+$/.test(l??"")?!0:"Letters, numbers, dash and underscore only"]} />
        <//>
        <${J.Footer}>
          <${H} variant="secondary" type="button" onClick=${n}>
            Close
          <//>
          <${H} variant="primary" type="submit">Create Database<//>
        <//>
      <//>
    <//>`}function nt({name:a,columns:n}){return p`
    <h5>Table: ${a}</h5>
    <div class="table-responsive">
      <${De} striped size="sm">
        <thead>
          <tr>
            <th>Name</th><th>Type</th><th>Not Null</th><th>Default</th><th>PK</th>
          </tr>
        </thead>
        <tbody>
          ${n.map(t=>p`
              <tr key=${t.name}>
                <td>${t.name}</td>
                <td>${t.type}</td>
                <td>${t.notnull}</td>
                <td>${t.dflt_value??""}</td>
                <td>${t.pk}</td>
              </tr>`)}
        </tbody>
      <//>
    </div>`}function lt({name:a,columns:n,onOpen:t}){let[l,i]=M(()=>Object.fromEntries(n.map(e=>[e.name,!0])));return p`
    <h5>Columns to list — ${a}</h5>
    ${n.map(e=>p`
        <${Ze} key=${e.name} label=${e.name} checked=${l[e.name]}
          onChange=${s=>i(b=>({...b,[e.name]:s}))} />`)}
    <${H} variant="primary" onClick=${()=>t(l)}>Open Table<//>`}function ot({db:a,onClose:n}){let[t,l]=M(""),[i,e]=M(null);async function s(){let c=t.trim();if(c)try{if(/^select\b/i.test(c)){let o=await a.select(c);e({kind:"rows",rows:o})}else/^insert\b/i.test(c)?e({kind:"text",text:`Inserted row id: ${await a.insert(c)}`}):e({kind:"text",text:`${await a.exec(c)} row(s) changed.`})}catch(o){e({kind:"error",text:o.message})}}let b=i?.rows?.length?Object.keys(i.rows[0]):[];return p`
    <h5>SQL Query</h5>
    <${We} label="Query" name="query" rows=${5} value=${t}
                 onChange=${l} />
    <${Qe} size="sm" className="mb-3">
      <${H} variant="primary" onClick=${s}>Exec<//>
      <${H} variant="secondary" onClick=${()=>{l(""),e(null)}}>
        Clear
      <//>
      <${H} variant="secondary" onClick=${n}>Close<//>
    <//>

    ${i?.kind==="error"?p`<${fe} variant="danger">${i.text}<//>`:null}
    ${i?.kind==="text"?p`<${fe} variant="info">${i.text}<//>`:null}
    ${i?.kind==="rows"&&!i.rows.length?p`<${fe} variant="secondary">Zero rows returned<//>`:null}
    ${i?.kind==="rows"&&i.rows.length?p`
          <div class="table-responsive">
            <${De} striped size="sm">
              <thead>
                <tr>${b.map(c=>p`<th key=${c}>${c}</th>`)}</tr>
              </thead>
              <tbody>
                ${i.rows.map((c,o)=>p`
                    <tr key=${o}>
                      ${b.map(d=>p`<td key=${d}>${c[d]??""}</td>`)}
                    </tr>`)}
              </tbody>
            <//>
          </div>`:null}`}async function mt(){let a=await Me("acelery.db");await a.exec("create table if not exists config (cfg_key text unique, cfg_value text)");let n=await a.select("select cfg_key, cfg_value from config");return await a.close(),Object.fromEntries(n.map(t=>[t.cfg_key,t.cfg_value]))}async function yt(a){let n=await Me("acelery.db");for(let[t,l]of Object.entries(a))await n.exec("insert into config (cfg_key, cfg_value) values (?, ?) on conflict(cfg_key) do update set cfg_value = excluded.cfg_value",[t,l]);await n.close()}var ht=[{key:"apps",icon:"fa-solid fa-table-cells",title:"My Apps",blurb:"List and run your aCelery apps"},{key:"ide",icon:"fa-solid fa-pen-to-square",title:"aCelery IDE",blurb:"Integrated Development Environment for aCelery apps"},{key:"db",icon:"fa-solid fa-hard-drive",title:"DB Manager",blurb:"Manage your SQL databases"},{key:"config",icon:"fa-solid fa-gear",title:"Configure",blurb:"Configure aCelery"},{key:"site",icon:"fa-solid fa-cloud",title:"Visit Website",blurb:"Visit www.acelery.com",href:"http://www.acelery.com/"}];function wt({onGo:a}){return y`
    <${Z} fluid className="p-0">
      <${W}>
        ${ht.map(n=>n.href?y`
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
  <p class="mb-0 text-body-secondary">${a.blurb}</p>`;function kt({onExit:a}){let[n,t]=le(null),{banner:l,fail:i}=A();return Pe(()=>{(async()=>{try{let e=await U.externalStoragePath()+"/aCelery/www/",s=await U.listFiles("user",e),b=[];for(let c of s){if(!c.directory)continue;let o="";try{let d=await U.open("acelery_app.json",`${e}user/${c.fname}`),C=await d.read();await d.close(),C&&(o=JSON.parse(C).description??"")}catch{}b.push({name:c.fname,description:o})}t(b.sort((c,o)=>c.name.localeCompare(o.name)))}catch(e){i(e),t([])}})()},[]),y`
    <${I} title="aCelery Apps"
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
              <//>`:y`<${ct} variant="secondary">
              No apps yet. Make one in the IDE.
            <//>`}
    <//>`}function vt({settings:a,onChange:n,onExit:t}){let[l,i]=le(a.editortheme??""),{banner:e,notify:s,fail:b}=A();async function c(){try{await yt({theme:Te(),editortheme:l}),n({theme:Te(),editortheme:l}),s("Configuration saved.","success")}catch(o){b(o)}}return y`
    <${I} title="aCelery Configuration"
      items=${[{label:"Main Menu",onSelect:t}]} />
    <${Z} fluid>
      ${e}
      <${dt} title="aCelery Configuration">
        <${ut} label="aCelery Theme" />
        <${$t} label="Editor Theme" value=${l}
          onChange=${i}
          options=${[{label:"Follow app theme",value:""},{label:"Light",value:"light"},{label:"Dark",value:"dark"}]} />
        <${st}>
          <${je} variant="primary" onClick=${c}>Save<//>
          <${je} variant="secondary" onClick=${t}>Exit<//>
        <//>
      <//>
    <//>`}function gt(){let[a,n]=le(new URLSearchParams(location.search).get("opt")==="apps"?"apps":"menu"),[t,l]=le(null);Pe(()=>{mt().then(s=>{s.theme&&ft(s.theme),l(s)},()=>l({}))},[]);let i=rt(()=>{let s=t?.editortheme;return s==="light"||s==="dark"?s:pt()?"dark":"light"},[t])(),e=()=>n("menu");if(!t)return y`<${Z} fluid className="pt-3">
      <p class="text-body-secondary">Starting…</p>
    <//>`;switch(a){case"apps":return y`<${kt} onExit=${e} />`;case"ide":return y`<${Ce} onExit=${e} editorTheme=${i} />`;case"db":return y`<${Ne} onExit=${e} />`;case"config":return y`<${vt} settings=${t}
        onChange=${s=>l({...t,...s})}
        onExit=${e} />`;default:return y`<${Z} fluid className="pt-3">
        <${wt} onGo=${n} />
      <//>`}}function Ct(a=document.body){it(y`<${gt} />`,a)}export{Ct as default};
