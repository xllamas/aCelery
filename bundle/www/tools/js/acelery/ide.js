import{html as y,render as lt,useState as le,useEffect as Ee,useCallback as it,Container as Z,ListGroup as W,Button as Ne,ButtonGroup as ot,Alert as rt,Panel as st,Select as ct,ThemeSelect as dt,applyTheme as $t,currentTheme as je,isDark as ut}from"acelery/ui.js";import*as U from"acelery/file.js";import{openDB as Pe}from"acelery/sql.js";import{runApp as ft}from"acelery/export.js";import{html as S,useState as ee,useCallback as Me,Navbar as X,Nav as me,NavDropdown as ce,Container as Fe,Alert as de,Button as ye,Modal as z,ListGroup as he}from"acelery/ui.js";function I({title:a,items:n}){let[t,l]=ee(!1),[i,e]=ee(null),s=d=>()=>{l(!1),e(null),d?.()};return S`
    <${X} expand="lg" className="bg-body-tertiary mb-3"
               expanded=${t} onToggle=${l}>
      <${Fe} fluid>
        <${X.Toggle} aria-controls="ide-nav" />
        <${X.Brand} className="h4 mb-0">${a}<//>
        <${X.Collapse} id="ide-nav">
          <${me} className="ms-auto">
            ${n.map(d=>d.items?S`
                    <${ce} key=${d.label} title=${d.label}
                                    id=${`nav-${d.label}`}
                                    disabled=${!!d.disabled}
                                    show=${i===d.label}
                                    onToggle=${o=>e(o?d.label:null)}>
                      ${d.items.map(o=>o.divider?S`<${ce.Divider} key=${o.key} />`:S`<${ce.Item} key=${o.label}
                                   disabled=${!!o.disabled}
                                   onClick=${s(o.onSelect)}>
                              ${o.label}
                            <//>`)}
                    <//>`:S`<${me.Link} key=${d.label} disabled=${!!d.disabled}
                          onClick=${s(d.onSelect)}>
                    ${d.label}
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
    <//>`}function te(){let[a,n]=ee(null),t=Me((e,{title:s="aCelery",danger:d=!1}={})=>new Promise(o=>n({message:e,title:s,danger:d,resolve:o})),[]),l=e=>{a?.resolve(e),n(null)},i=a?S`
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
      <//>`:null,notify:(l,i="info")=>n({text:l,variant:i}),fail:l=>n({text:l?.message??String(l),variant:"danger"}),clear:()=>n(null)}}import{html as O,useState as G,useEffect as ae,useRef as we,useCallback as $e,Button as V,ButtonGroup as Be,Form as ke,Input as ue,Select as Ie,Modal as N,notEmpty as ve}from"acelery/ui.js";import*as w from"acelery/file.js";import{runApp as Ae,importProject as Oe,exportProject as _e}from"acelery/export.js";var Le="/aCelery/www/user/";async function qe(a){let n=await w.listFiles("user",a.replace(/user\/$/,"")),t=[];for(let l of n){if(!l.directory)continue;let i="";try{let e=await w.open("acelery_app.json",a+l.fname),s=await e.read();await e.close(),s&&(i=JSON.parse(s).description??"")}catch{}t.push({name:l.fname,description:i})}return t.sort((l,i)=>l.name.localeCompare(i.name))}function Re({show:a,onClose:n,onCreate:t}){return O`
    <${N} show=${a} onHide=${n} centered>
      <${N.Header} closeButton><${N.Title}>New Project<//><//>
      <${ke} initial=${{name:"",description:""}}
               onSubmit=${l=>t(l)}>
        <${N.Body}>
          <${ue} label="Name" name="name"
            placeholder="Letters and numbers, 16 max"
            validate=${[ve("A name is required"),l=>/^\w{1,16}$/.test(l??"")?!0:"Letters, numbers and underscore only, 16 at most"]} />
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
    <//>`}function Ge({show:a,project:n,onClose:t,onCreate:l}){return O`
    <${N} show=${a} onHide=${t} centered>
      <${N.Header} closeButton>
        <${N.Title}>New File for ${n}<//>
      <//>
      <${ke} initial=${{name:"",type:".js"}} onSubmit=${l}>
        <${N.Body}>
          <${ue} label="Name" name="name"
            placeholder="File name without extension"
            validate=${[ve("A name is required"),i=>/^[\w.-]+$/.test(i??"")?!0:"Letters, numbers, dot, dash and underscore only"]} />
          <${Ie} label="Type" name="type" options=${[{label:"JavaScript",value:".js"},{label:"CSS",value:".css"}]} />
        <//>
        <${N.Footer}>
          <${V} variant="secondary" type="button" onClick=${t}>
            Close
          <//>
          <${V} variant="primary" type="submit">Create File<//>
        <//>
      <//>
    <//>`}var He=a=>`import { html, render, Panel } from "acelery/ui.js";

export default function main() {
  render(html\`
    <\${Panel} title="${a}">
      <p>Your app starts here.</p>
    <//>\`, document.body);
}
`;function ge({onExit:a,editorTheme:n}){let[t,l]=G(null),[i,e]=G(""),[s,d]=G(""),[o,c]=G(!1),[$,C]=G({kind:"blank"}),[_,j]=G(null),{confirm:L,dialog:ie}=te(),{banner:K,notify:v,fail:x}=A(),q=we(null),k=we(null);ae(()=>{w.externalStoragePath().then(u=>l(u+Le),x)},[]);let F=$e(async()=>{if(!(!s||!k.current))try{let u=await w.open(s,t+i);await u.write(k.current.getValue()),await u.close(),c(!1)}catch(u){x(u)}},[t,i,s]);ae(()=>(globalThis.forceSaveFile=()=>{s&&o&&F()},()=>{delete globalThis.forceSaveFile}),[s,o,F]);let g=$e(async()=>(s&&o&&await L(`Save changes to ${s}?`)&&await F(),k.current?.destroy(),k.current=null,d(""),c(!1),!0),[s,o,F,L]),Y=$e(async u=>{await g();try{let f=await w.open(u,t+i),m=await f.read();await f.close(),d(u),C({kind:"editor",name:u,text:m})}catch(f){x(f)}},[t,i,g]);ae(()=>{if(!($.kind!=="editor"||!q.current))return k.current?.destroy(),k.current=globalThis.aceleryEditor.createEditor(q.current,{value:$.text,filename:$.name,theme:n,onChange:()=>c(!0)}),()=>{k.current?.destroy(),k.current=null}},[$.kind,$.name]),ae(()=>{k.current?.setTheme(n)},[n]);async function oe({name:u,description:f}){let m=u.trim().charAt(0).toUpperCase()+u.trim().slice(1);j(null);try{await w.mkdir(m,t);let P=await w.open("acelery_app.json",t+m);await P.write(JSON.stringify({name:m,description:f,entry:"main.js"})),await P.close();let be=await w.open("main.js",t+m);await be.write(He(m)),await be.close(),e(m),C({kind:"blank"})}catch(P){x(P)}}async function re({name:u,type:f}){j(null);let m=u.trim()+f;try{let P=await w.open(m,t+i);await P.write(""),await P.close(),await Y(m)}catch(P){x(P)}}async function T(u){try{let f=u.startsWith("project")?await qe(t):(await w.listFiles(i,t)).filter(m=>!m.directory).map(m=>({name:m.fname}));C({kind:"pick",mode:u,entries:f})}catch(f){x(f)}}async function B(u,f){if(u==="project-open")await g(),e(f),C({kind:"blank"});else if(u==="project-delete"){if(!await L(`Delete project ${f} and all its files?`,{danger:!0}))return;await(await w.open(f,t)).delete(),f===i&&e(""),await T("project-delete"),v(`Deleted ${f}.`)}else if(u==="project-export")_e(f);else if(u==="file-open")await Y(f);else if(u==="file-delete"){if(!await L(`Delete file ${f}?`,{danger:!0}))return;await(await w.open(f,t+i)).delete(),f===s&&await g(),await T("file-delete"),v(`Deleted ${f}.`)}}async function R(){await g(),e(""),C({kind:"blank"})}async function se(){await g(),a()}let h=i!=="",r=s!=="",p=[{label:"Project",items:[{label:"New",disabled:h,onSelect:()=>j("project")},{label:"Open",disabled:h,onSelect:()=>T("project-open")},{label:"Close",disabled:!h,onSelect:R},{label:"Delete",disabled:h,onSelect:()=>T("project-delete")},{divider:!0,key:"d1"},{label:"Import",onSelect:Oe},{label:"Export",onSelect:()=>T("project-export")}]},{label:"File",disabled:!h,items:[{label:"New",disabled:r,onSelect:()=>j("file")},{label:"Open",disabled:r,onSelect:()=>T("file-open")},{label:"Save",disabled:!o,onSelect:F},{label:"Close",disabled:!r,onSelect:async()=>{await g(),C({kind:"blank"})}},{label:"Delete",disabled:r,onSelect:()=>T("file-delete")}]},{label:"Run",disabled:!h,onSelect:()=>Ae(i,i,!0)},{label:"Main Menu",onSelect:se}],D=h?`aCelery Project: ${i}`:"aCelery IDE",E=null;if(!t)E=O`<p class="text-body-secondary">Starting…</p>`;else if($.kind==="pick"){let u=$.mode.split("-")[1],f=$.mode.startsWith("project")?"project":"file";E=O`
      <${Q} prompt=${`Select ${f} to ${u}`} entries=${$.entries}
        icon=${f==="project"?"fa-solid fa-folder":"fa-solid fa-file"}
        empty=${`No ${f}s yet.`}
        onPick=${m=>B($.mode,m)} />`}else $.kind==="editor"&&(E=O`
      <div class="acelery-editor border rounded" ref=${q}></div>
      ${o?O`<div class="mt-2">
            <${Be} size="sm">
              <${V} variant="primary" onClick=${F}>Save<//>
            <//>
          </div>`:null}`);return O`
    <${I} title=${D} items=${p} />
    <div class="container-fluid">
      ${K}
      ${E}
    </div>
    <${Re} show=${_==="project"}
      onClose=${()=>j(null)} onCreate=${oe} />
    <${Ge} show=${_==="file"} project=${i}
      onClose=${()=>j(null)} onCreate=${re} />
    ${ie}`}import{html as b,useState as M,useEffect as Ce,useCallback as Se,Button as H,ButtonGroup as Ue,Table as xe,Form as ze,Input as Qe,TextArea as Ve,Modal as J,Alert as fe,CheckBox as Je,TableMaint as We,notEmpty as Ze}from"acelery/ui.js";import*as ne from"acelery/file.js";import{openDB as Ke,deleteDB as Ye}from"acelery/sql.js";function pe(a){if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(a))throw new Error(`"${a}" is not a usable table name`);return a}var Xe=["INT","DOU","REA","FLO","NUM","DEC","BOO","DAT"];function De({onExit:a}){let[n,t]=M(null),[l,i]=M(""),[e,s]=M(null),[d,o]=M(""),[c,$]=M({kind:"blank"}),[C,_]=M(!1),{confirm:j,dialog:L}=te(),{banner:ie,notify:K,fail:v}=A();Ce(()=>{ne.externalStoragePath().then(r=>t(r+"/aCelery/"),v)},[]),Ce(()=>()=>{e?.close()},[e]);let x=Se(async r=>{try{let p=await ne.listFiles("db",n);$({kind:"pick-db",mode:r,entries:p.filter(D=>!D.directory&&!D.fname.includes("journal")).map(D=>({name:D.fname}))})}catch(p){v(p)}},[n]);async function q(r){try{await e?.close();let p=await Ke(r);s(p),i(r),o(""),$({kind:"blank"})}catch(p){v(p)}}async function k(){await e?.close(),s(null),i(""),o(""),$({kind:"blank"})}async function F(r){if(await j(`Delete database ${r}?`,{danger:!0}))try{r===l&&await k(),await Ye(r),await x("delete"),K(`Deleted ${r}.`)}catch(p){v(p)}}let g=Se(async r=>{if(e)try{let p=await e.select("select name from sqlite_master where type = ? order by name",["table"]);$({kind:"pick-table",mode:r,entries:p.map(D=>({name:D.name}))})}catch(p){v(p)}},[e]);async function Y(r){try{let p=await e.select(`PRAGMA table_info(${pe(r)})`);$({kind:"info",table:r,columns:p})}catch(p){v(p)}}async function oe(r){try{let p=await e.select(`PRAGMA table_info(${pe(r)})`);$({kind:"columns",table:r,columns:p})}catch(p){v(p)}}function re(r,p,D){o(r),$({kind:"table",table:r,fields:p.map(E=>({type:Xe.some(u=>String(E.type).toUpperCase().includes(u))?"number":"string",title:E.name,name:E.name,inList:D[E.name]??!0,inSearch:!0}))})}async function T(r){if(await j(`Delete table ${r}?`,{danger:!0}))try{await e.exec(`drop table ${pe(r)}`),r===d&&o(""),await g("delete"),K(`Dropped ${r}.`)}catch(p){v(p)}}let B=l!=="",R=d!=="",se=[{label:"Database",items:[{label:"New",disabled:B,onSelect:()=>_(!0)},{label:"Open",disabled:B,onSelect:()=>x("open")},{label:"Close",disabled:!B,onSelect:k},{label:"Delete",onSelect:()=>x("delete")}]},{label:"Table",disabled:!B,items:[{label:"Info",disabled:R,onSelect:()=>g("info")},{label:"Open",disabled:R,onSelect:()=>g("open")},{label:"Close",disabled:!R,onSelect:()=>{o(""),$({kind:"blank"})}},{label:"Delete",disabled:R,onSelect:()=>g("delete")}]},{label:"SQL",disabled:!B,onSelect:()=>$({kind:"sql"})},{label:"Main Menu",onSelect:async()=>{await k(),a()}}],h=null;return n?c.kind==="pick-db"?h=b`
      <${Q} prompt=${`Select database to ${c.mode}`}
        entries=${c.entries} icon="fa-solid fa-hard-drive"
        empty="No databases yet."
        onPick=${r=>c.mode==="open"?q(r):F(r)} />`:c.kind==="pick-table"?h=b`
      <${Q} prompt=${`Select table to ${c.mode}`}
        entries=${c.entries} icon="fa-solid fa-list"
        empty="This database has no tables yet."
        onPick=${r=>c.mode==="info"?Y(r):c.mode==="open"?oe(r):T(r)} />`:c.kind==="info"?h=b`<${tt} name=${c.table} columns=${c.columns} />`:c.kind==="columns"?h=b`
      <${at} name=${c.table} columns=${c.columns}
        onOpen=${r=>re(c.table,c.columns,r)} />`:c.kind==="table"?h=b`
      <${We} db=${e} title=${c.table} table=${c.table}
                     fields=${c.fields} onError=${v} />`:c.kind==="sql"&&(h=b`<${nt} db=${e}
                  onClose=${()=>$({kind:"blank"})} />`):h=b`<p class="text-body-secondary">Starting…</p>`,b`
    <${I} title=${B?`DB Manager: ${l}`:"DB Manager"}
                  items=${se} />
    <div class="container-fluid">
      ${ie}
      ${h}
    </div>
    <${et} show=${C} onClose=${()=>_(!1)}
      onCreate=${({name:r})=>{_(!1),q(r.trim()+".db")}} />
    ${L}`}function et({show:a,onClose:n,onCreate:t}){return b`
    <${J} show=${a} onHide=${n} centered>
      <${J.Header} closeButton><${J.Title}>New Database<//><//>
      <${ze} initial=${{name:""}} onSubmit=${t}>
        <${J.Body}>
          <${Qe} label="Name" name="name"
            placeholder="Database name without extension"
            validate=${[Ze("A name is required"),l=>/^[\w-]+$/.test(l??"")?!0:"Letters, numbers, dash and underscore only"]} />
        <//>
        <${J.Footer}>
          <${H} variant="secondary" type="button" onClick=${n}>
            Close
          <//>
          <${H} variant="primary" type="submit">Create Database<//>
        <//>
      <//>
    <//>`}function tt({name:a,columns:n}){return b`
    <h5>Table: ${a}</h5>
    <div class="table-responsive">
      <${xe} striped size="sm">
        <thead>
          <tr>
            <th>Name</th><th>Type</th><th>Not Null</th><th>Default</th><th>PK</th>
          </tr>
        </thead>
        <tbody>
          ${n.map(t=>b`
              <tr key=${t.name}>
                <td>${t.name}</td>
                <td>${t.type}</td>
                <td>${t.notnull}</td>
                <td>${t.dflt_value??""}</td>
                <td>${t.pk}</td>
              </tr>`)}
        </tbody>
      <//>
    </div>`}function at({name:a,columns:n,onOpen:t}){let[l,i]=M(()=>Object.fromEntries(n.map(e=>[e.name,!0])));return b`
    <h5>Columns to list — ${a}</h5>
    ${n.map(e=>b`
        <${Je} key=${e.name} label=${e.name} checked=${l[e.name]}
          onChange=${s=>i(d=>({...d,[e.name]:s}))} />`)}
    <${H} variant="primary" onClick=${()=>t(l)}>Open Table<//>`}function nt({db:a,onClose:n}){let[t,l]=M(""),[i,e]=M(null);async function s(){let o=t.trim();if(o)try{if(/^select\b/i.test(o)){let c=await a.select(o);e({kind:"rows",rows:c})}else/^insert\b/i.test(o)?e({kind:"text",text:`Inserted row id: ${await a.insert(o)}`}):e({kind:"text",text:`${await a.exec(o)} row(s) changed.`})}catch(c){e({kind:"error",text:c.message})}}let d=i?.rows?.length?Object.keys(i.rows[0]):[];return b`
    <h5>SQL Query</h5>
    <${Ve} label="Query" name="query" rows=${5} value=${t}
                 onChange=${l} />
    <${Ue} size="sm" className="mb-3">
      <${H} variant="primary" onClick=${s}>Exec<//>
      <${H} variant="secondary" onClick=${()=>{l(""),e(null)}}>
        Clear
      <//>
      <${H} variant="secondary" onClick=${n}>Close<//>
    <//>

    ${i?.kind==="error"?b`<${fe} variant="danger">${i.text}<//>`:null}
    ${i?.kind==="text"?b`<${fe} variant="info">${i.text}<//>`:null}
    ${i?.kind==="rows"&&!i.rows.length?b`<${fe} variant="secondary">Zero rows returned<//>`:null}
    ${i?.kind==="rows"&&i.rows.length?b`
          <div class="table-responsive">
            <${xe} striped size="sm">
              <thead>
                <tr>${d.map(o=>b`<th key=${o}>${o}</th>`)}</tr>
              </thead>
              <tbody>
                ${i.rows.map((o,c)=>b`
                    <tr key=${c}>
                      ${d.map($=>b`<td key=${$}>${o[$]??""}</td>`)}
                    </tr>`)}
              </tbody>
            <//>
          </div>`:null}`}async function pt(){let a=await Pe("acelery.db");await a.exec("create table if not exists config (cfg_key text unique, cfg_value text)");let n=await a.select("select cfg_key, cfg_value from config");return await a.close(),Object.fromEntries(n.map(t=>[t.cfg_key,t.cfg_value]))}async function bt(a){let n=await Pe("acelery.db");for(let[t,l]of Object.entries(a))await n.exec("insert into config (cfg_key, cfg_value) values (?, ?) on conflict(cfg_key) do update set cfg_value = excluded.cfg_value",[t,l]);await n.close()}var mt=[{key:"apps",icon:"fa-solid fa-table-cells",title:"My Apps",blurb:"List and run your aCelery apps"},{key:"ide",icon:"fa-solid fa-pen-to-square",title:"aCelery IDE",blurb:"Integrated Development Environment for aCelery apps"},{key:"db",icon:"fa-solid fa-hard-drive",title:"DB Manager",blurb:"Manage your SQL databases"},{key:"config",icon:"fa-solid fa-gear",title:"Configure",blurb:"Configure aCelery"},{key:"site",icon:"fa-solid fa-cloud",title:"Visit Website",blurb:"Visit www.acelery.com",href:"http://www.acelery.com/"}];function yt({onGo:a}){return y`
    <${Z} fluid className="p-0">
      <${W}>
        ${mt.map(n=>n.href?y`
                <${W.Item} key=${n.key} action href=${n.href}
                                   target="_blank" rel="noopener">
                  <${Te} item=${n} />
                <//>`:y`
                <${W.Item} key=${n.key} action
                                   onClick=${()=>a(n.key)}>
                  <${Te} item=${n} />
                <//>`)}
      <//>
    <//>`}var Te=({item:a})=>y`
  <div class="h3 mb-1"><i class=${a.icon}></i> ${" "+a.title}</div>
  <p class="mb-0 text-body-secondary">${a.blurb}</p>`;function ht({onExit:a}){let[n,t]=le(null),{banner:l,fail:i}=A();return Ee(()=>{(async()=>{try{let e=await U.externalStoragePath()+"/aCelery/www/",s=await U.listFiles("user",e),d=[];for(let o of s){if(!o.directory)continue;let c="";try{let $=await U.open("acelery_app.json",`${e}user/${o.fname}`),C=await $.read();await $.close(),C&&(c=JSON.parse(C).description??"")}catch{}d.push({name:o.fname,description:c})}t(d.sort((o,c)=>o.name.localeCompare(c.name)))}catch(e){i(e),t([])}})()},[]),y`
    <${I} title="aCelery Apps"
      items=${[{label:"Main Menu",onSelect:a}]} />
    <${Z} fluid>
      ${l}
      ${n===null?y`<p class="text-body-secondary">Looking for apps…</p>`:n.length?y`
              <${W}>
                ${n.map(e=>y`
                    <${W.Item} key=${e.name} action
                      onClick=${()=>ft(e.name,e.name,!1)}>
                      <div class="h3 mb-1">
                        <i class="fa-solid fa-table-cells"></i>
                        ${" "+e.name}
                      </div>
                      <p class="mb-0 text-body-secondary">${e.description}</p>
                    <//>`)}
              <//>`:y`<${rt} variant="secondary">
              No apps yet. Make one in the IDE.
            <//>`}
    <//>`}function wt({settings:a,onChange:n,onExit:t}){let[l,i]=le(a.editortheme??""),{banner:e,notify:s,fail:d}=A();async function o(){try{await bt({theme:je(),editortheme:l}),n({theme:je(),editortheme:l}),s("Configuration saved.","success")}catch(c){d(c)}}return y`
    <${I} title="aCelery Configuration"
      items=${[{label:"Main Menu",onSelect:t}]} />
    <${Z} fluid>
      ${e}
      <${st} title="aCelery Configuration">
        <${dt} label="aCelery Theme" />
        <${ct} label="Editor Theme" value=${l}
          onChange=${i}
          options=${[{label:"Follow app theme",value:""},{label:"Light",value:"light"},{label:"Dark",value:"dark"}]} />
        <${ot}>
          <${Ne} variant="primary" onClick=${o}>Save<//>
          <${Ne} variant="secondary" onClick=${t}>Exit<//>
        <//>
      <//>
    <//>`}function kt(){let[a,n]=le(new URLSearchParams(location.search).get("opt")==="apps"?"apps":"menu"),[t,l]=le(null);Ee(()=>{pt().then(s=>{s.theme&&$t(s.theme),l(s)},()=>l({}))},[]);let i=it(()=>{let s=t?.editortheme;return s==="light"||s==="dark"?s:ut()?"dark":"light"},[t])(),e=()=>n("menu");if(!t)return y`<${Z} fluid className="pt-3">
      <p class="text-body-secondary">Starting…</p>
    <//>`;switch(a){case"apps":return y`<${ht} onExit=${e} />`;case"ide":return y`<${ge} onExit=${e} editorTheme=${i} />`;case"db":return y`<${De} onExit=${e} />`;case"config":return y`<${wt} settings=${t}
        onChange=${s=>l({...t,...s})}
        onExit=${e} />`;default:return y`<${Z} fluid className="pt-3">
        <${yt} onGo=${n} />
      <//>`}}function vt(a=document.body){lt(y`<${kt} />`,a)}export{vt as default};
