import{html as j,render as Hn,useState as ia,useEffect as sa,useCallback as On,Button as qn,applyTheme as ra,isDark as ca}from"acelery/ui.js";import{EDITOR_THEMES as _n}from"acelery/editor.js";import{html as U,useState as Ta}from"acelery/ui.js";import{useState as pa,useEffect as ha}from"acelery/ui.js";function va(e){let t=String(e??"").replace(/^#\/?/,"").split("/").filter(Boolean).map(ya);return{section:t[0]??"home",parts:t.slice(1)}}function ya(e){try{return decodeURIComponent(e)}catch{return e}}function G(e){return"#/"+e.map(t=>encodeURIComponent(t)).join("/")}var be=()=>window.location.hash||"#/",Ne=new Set;function Ue(){for(let e of Ne)e(be())}var mt=!1;function ba(){mt||(mt=!0,window.addEventListener("popstate",Ue),window.addEventListener("hashchange",Ue))}var X=null;function pt(e){return X=e,()=>{X===e&&(X=null)}}async function h(e,{replace:t=!1}={}){let a=G(e);a!==be()&&(X&&!await X()||(t?window.history.replaceState({from:window.history.state?.from??null},"",a):window.history.pushState({from:be()},"",a),Ue()))}async function ht(e){let t=G(e);if(window.history.state?.from===t){if(X&&!await X())return;window.history.back()}else await h(e,{replace:!0})}function vt(){ba();let[e,t]=pa(be());return ha(()=>(Ne.add(t),t(be()),()=>Ne.delete(t)),[]),va(e)}function yt(){new URLSearchParams(window.location.search).get("opt")==="apps"&&window.history.replaceState(null,"",window.location.pathname+G(["apps"]))}var Ke=null;function we(e){Ke=e}function Te(e){return Ke!==e?!1:(Ke=null,!0)}import{html as w,useState as Pe,useEffect as wa,useCallback as ga,useContext as ka,useRef as gt,createContext as Ca,Modal as Le,Dropdown as Ae,Placeholder as bt,Alert as Sa,Toast as xa,Button as Qn}from"acelery/ui.js";var C=({name:e})=>w`<i class=${e} aria-hidden="true"></i>`,Da="(min-width: 768px)",kt="(min-width: 992px)";function Ge(e){let t=()=>!!globalThis.matchMedia?.(e).matches,[a,n]=Pe(t);return wa(()=>{let i=globalThis.matchMedia?.(e);if(!i?.addEventListener)return;let o=()=>n(i.matches);return o(),i.addEventListener("change",o),()=>i.removeEventListener("change",o)},[e]),a}function H({icon:e,label:t,onClick:a,disabled:n,primary:i,className:o}){return w`
    <button type="button" aria-label=${t} title=${t}
      class=${`ac-iconbtn${i?" is-primary":""} ${o??""}`}
      disabled=${!!n} onClick=${a}>
      <${C} name=${e} />
    </button>`}function F({icon:e,title:t,children:a,action:n}){return w`
    <div class="ac-empty">
      <div class="ac-empty-icon"><${C} name=${e} /></div>
      <h2>${t}</h2>
      ${a?w`<p>${a}</p>`:null}
      ${n??null}
    </div>`}function A({rows:e=3,grid:t=!1}){let a=(i,o)=>w`
    <${bt} as="div" animation="glow">
      <${bt} xs=${i} size=${o} />
    <//>`,n=Array.from({length:e},(i,o)=>o);return t?w`
      <div class="ac-grid ac-skeleton" aria-busy="true" aria-label="Loading">
        ${n.map(i=>w`
          <div class="ac-card" key=${i}>
            <div class="ac-tile" style=${{background:"var(--ac-surface-2)"}}></div>
            ${a(8)}${a(10,"sm")}
          </div>`)}
      </div>`:w`
    <div class="ac-list ac-skeleton" aria-busy="true" aria-label="Loading">
      ${n.map(i=>w`
        <div class="ac-row" key=${i}>
          <div class="ac-row-icon"></div>
          <div class="ac-row-body">${a(6)}${a(4,"sm")}</div>
        </div>`)}
    </div>`}function M({error:e,onClose:t}){return e?w`
    <${Sa} variant="danger" className="ac-error" dismissible=${!!t}
              onClose=${t}>
      <${C} name="fa-solid fa-triangle-exclamation" />
      <span>${e?.message??String(e)}</span>
    <//>`:null}function z({what:e,action:t}){return w`
    <${F} icon="fa-solid fa-magnifying-glass" title=${`${e} not found`}
      action=${t}>
      It may have been deleted, or the link is out of date.
    <//>`}var Ct=Ca(()=>{});function St({children:e}){let[t,a]=Pe([]),n=gt(0),i=ga(r=>{let l=++n.current;a(d=>[...d.slice(-2),{id:l,text:r}])},[]),o=r=>a(l=>l.filter(d=>d.id!==r));return w`
    <${Ct.Provider} value=${i}>
      ${e}
      <div class="ac-toasts">
        ${t.map(r=>w`
          <${xa} key=${r.id} className="ac-toast" show autohide delay=${4e3}
                    onClose=${()=>o(r.id)}
                    role="status" aria-live="polite">
            <div class="d-flex align-items-center">
              <div class="toast-body">${r.text}</div>
              <${H} icon="fa-solid fa-xmark" label="Dismiss"
                onClick=${()=>o(r.id)} />
            </div>
          <//>`)}
      </div>
    <//>`}var O=()=>ka(Ct);function re({show:e,onHide:t,title:a,children:n}){return w`
    <${Le} show=${e} onHide=${t} centered dialogClassName="ac-sheet">
      ${a?w`<${Le.Header} closeButton>
            <${Le.Title} as="h2" className="fs-5">${a}<//>
          <//>`:null}
      ${n}
    <//>`}function ee({label:e="More actions",title:t,actions:a}){let n=Ge(Da),[i,o]=Pe(!1),r=gt(null),l=a.filter(Boolean);return l.length?n?w`
      <${Ae} align="end" className="ac-over">
        <${Ae.Toggle} as="button" type="button" bsPrefix="ac-iconbtn"
                            aria-label=${e} title=${e}>
          <${C} name="fa-solid fa-ellipsis-vertical" />
        <//>
        <${Ae.Menu} popperConfig=${{strategy:"fixed"}}>
          ${l.map(d=>w`
            <${Ae.Item} as="button" key=${d.label} disabled=${!!d.disabled}
                              className=${d.danger?"is-danger":""}
                              onClick=${d.onSelect}>
              ${d.icon?w`<${C} name=${d.icon} />`:null}
              <span>${d.label}</span>
            <//>`)}
        <//>
      <//>`:w`
    <span class="ac-over">
      <${H} icon="fa-solid fa-ellipsis-vertical" label=${e}
        onClick=${()=>o(!0)} />
      <${Le} show=${i} onHide=${()=>o(!1)} centered
                dialogClassName="ac-sheet"
                onExited=${()=>{let d=r.current;r.current=null,d?.()}}>
        ${t?w`<div class="ac-sheet-title">${t}</div>`:null}
        <div class="ac-actions" role="menu" aria-label=${e}>
          ${l.map(d=>w`
            <button key=${d.label} type="button" role="menuitem"
                    class=${`ac-action${d.danger?" is-danger":""}`}
                    disabled=${!!d.disabled}
                    onClick=${()=>{r.current=d.onSelect,o(!1)}}>
              ${d.icon?w`<${C} name=${d.icon} />`:null}
              <span>${d.label}</span>
            </button>`)}
        </div>
      <//>
    </span>`:null}function Ie({label:e,value:t,options:a,onChange:n,role:i="tablist"}){let o=i==="tablist"?"tab":"radio",r=i==="tablist"?"aria-selected":"aria-checked";return w`
    <div class="ac-segmented" role=${i} aria-label=${e}>
      ${a.map(l=>w`
        <button key=${l.value} type="button" role=${o} class="ac-segment"
                ...${{[r]:t===l.value?"true":"false"}}
                disabled=${!!l.disabled} onClick=${()=>n(l.value)}>
          ${l.icon?w`<${C} name=${l.icon} />`:null}
          <span>${l.label}</span>
        </button>`)}
    </div>`}var wt=["#3d6b63","#1f6f8b","#6b4fa0","#a14a2b","#2e7d32","#8a5a00","#9c2f5e","#45617d"];function Ea(e){let t=0;for(let a of e)t=t*31+a.codePointAt(0)>>>0;return wt[t%wt.length]}function ze({name:e,icon:t}){let[a,n]=Pe(!1);return t&&!a?w`
      <div class="ac-tile">
        <img src=${t} alt="" onError=${()=>n(!0)} />
      </div>`:w`
    <div class="ac-tile" style=${{background:Ea(e)}} aria-hidden="true">
      ${([...e][0]??"?").toUpperCase()}
    </div>`}function Fe({project:e,verb:t,onOpen:a,actions:n}){return w`
    <div class="ac-card">
      <div class="ac-card-head">
        <${ze} name=${e.name} icon=${e.icon} />
        <${ee} title=${e.name} label=${`Actions for ${e.name}`}
          actions=${n} />
      </div>
      <h3 class="ac-card-title">
        <button type="button" class="ac-stretch"
                aria-label=${`${t} ${e.name}`} onClick=${a}>
          ${e.name}
        </button>
      </h3>
      ${e.description?w`<p class="ac-card-text">${e.description}</p>`:null}
    </div>`}function J({icon:e,title:t,meta:a,onOpen:n,selected:i,actions:o,badge:r}){return w`
    <div class=${`ac-row${n?" is-action":""}${i?" is-selected":""}`}>
      <div class="ac-row-icon" aria-hidden="true"><${C} name=${e} /></div>
      <div class="ac-row-body">
        ${n?w`<button type="button" class="ac-stretch ac-row-title"
                   aria-current=${i?"true":void 0}
                   onClick=${n}>${t}</button>`:w`<div class="ac-row-title">${t}</div>`}
        ${a?w`<div class="ac-row-meta">${a}</div>`:null}
      </div>
      ${r?w`<span class="ac-badge">${r}</span>`:null}
      ${o?w`<${ee} title=${t} label=${`Actions for ${t}`}
                 actions=${o} />`:null}
    </div>`}var Aa=[{key:"home",path:[],label:"Home",icon:"fa-solid fa-house"},{key:"apps",path:["apps"],label:"Apps",icon:"fa-solid fa-table-cells"},{key:"code",path:["code"],label:"Code",icon:"fa-solid fa-code"},{key:"data",path:["data"],label:"Data",icon:"fa-solid fa-database"},{key:"settings",path:["settings"],label:"Settings",icon:"fa-solid fa-gear"}];function xt({section:e}){return Aa.map(t=>U`
      <a key=${t.key} href=${G(t.path)}
         class=${`ac-navitem${t.key==="settings"?" is-settings":""}`}
         aria-current=${e===t.key?"page":void 0}
         onClick=${a=>{a.button!==0||a.metaKey||a.ctrlKey||a.shiftKey||a.altKey||(a.preventDefault(),h(t.path,{replace:!0}))}}>
        <span class="ac-navicon"><${C} name=${t.icon} /></span>
        <span class="ac-navlabel">${t.label}</span>
      </a>`)}function Je({section:e,children:t}){return U`
    <div class="ac-frame">
      <nav class="ac-rail" aria-label="Main">
        <div class="ac-brand">
          <span class="ac-brand-mark" aria-hidden="true">
            <${C} name="fa-solid fa-seedling" />
          </span>
          <span class="ac-brand-name">aCelery</span>
        </div>
        <${xt} section=${e} />
      </nav>
      <main class="ac-main">${t}</main>
      <nav class="ac-bottomnav" aria-label="Main">
        <${xt} section=${e} />
      </nav>
    </div>`}function D({title:e,subtitle:t,back:a,actions:n,subbar:i,fab:o,fill:r,children:l}){let[d,c]=Ta(!1);return U`
    <section class="ac-screen" aria-labelledby="ac-screen-title">
      <header class=${`ac-appbar${a?"":" no-back"}${d?" is-scrolled":""}${i?" has-subbar":""}`}>
        ${a?U`<${H} icon="fa-solid fa-arrow-left" label="Back"
                   onClick=${()=>ht(a)} />`:null}
        <div class="ac-appbar-titles">
          <h1 class="ac-appbar-title" id="ac-screen-title">${e}</h1>
          ${t?U`<div class="ac-appbar-subtitle">${t}</div>`:null}
        </div>
        <div class="ac-appbar-actions">${n??null}</div>
      </header>
      ${i?U`<div class="ac-subbar">${i}</div>`:null}
      ${r?U`<div class="ac-content is-fill">${l}</div>`:U`
            <div class=${`ac-content${o?" has-fab":""}`}
                 onScroll=${s=>c(s.currentTarget.scrollTop>0)}>
              <div class="ac-content-inner">${l}</div>
            </div>`}
      ${o?U`
            <button type="button" class="ac-fab" aria-label=${o.label}
                    onClick=${o.onClick}>
              <${C} name=${o.icon} />
              <span class="ac-fab-label" aria-hidden="true">${o.label}</span>
            </button>`:null}
    </section>`}import*as P from"acelery/file.js";import{openDB as Dt}from"acelery/sql.js";async function Et(){let e=await Dt("acelery.db");try{await e.exec("create table if not exists config (cfg_key text unique, cfg_value text)");let t=await e.select("select cfg_key, cfg_value from config");return Object.fromEntries(t.map(a=>[a.cfg_key,a.cfg_value]))}finally{await e.close()}}async function Tt(e){let t=await Dt("acelery.db");try{await t.exec("create table if not exists config (cfg_key text unique, cfg_value text)");for(let[a,n]of Object.entries(e))await t.exec("insert into config (cfg_key, cfg_value) values (?, ?) on conflict(cfg_key) do update set cfg_value = excluded.cfg_value",[a,n??""])}finally{await t.close()}}var We=null;function At(){return We??=P.externalStoragePath().catch(e=>{throw We=null,e}),We}async function K(){return await At()+"/aCelery/www/user/"}async function La(){return await At()+"/aCelery/"}function Pa(e,t){return typeof t!="string"||!/^[\w.-]+(\/[\w.-]+)*$/.test(t)||t.split("/").includes("..")?null:`/user/${encodeURIComponent(e)}/${t}`}async function Qe(e,t){t??=await K();try{let a=await P.open("acelery_app.json",t+e),n=await a.read();await a.close();let i=n?JSON.parse(n):{};return{description:typeof i.description=="string"?i.description:"",entry:typeof i.entry=="string"&&i.entry?i.entry:"main.js",icon:Pa(e,i.icon)}}catch{return{description:"",entry:"main.js",icon:null}}}async function ce(){let e=await K(),t=await P.listFiles("user",e.replace(/user\/$/,"")),a=[];for(let n of t)n.directory&&a.push({name:n.fname,...await Qe(n.fname,e)});return a.sort((n,i)=>n.name.localeCompare(i.name))}async function Lt(e){let t=await K();return(await P.listFiles("user",t.replace(/user\/$/,""))).some(n=>n.directory&&n.fname===e)}async function Me(e){return(await P.listFiles(e,await K())).filter(a=>!a.directory).map(a=>({name:a.fname,length:a.length,modified:a.lastmodified})).sort((a,n)=>a.name.localeCompare(n.name))}async function Pt(e,t){let a=await P.open(t,await K()+e);try{return await a.read()}finally{await a.close()}}async function le(e,t,a){let n=await P.open(t,await K()+e);try{await n.write(a)}finally{await n.close()}}async function It(e,t){await(await P.open(t,await K()+e)).delete()}async function de(e){await(await P.open(e,await K())).delete()}var Ia=e=>`import { html, render, Panel } from "acelery/ui.js";

export default function main() {
  render(html\`
    <\${Panel} title="${e}">
      <p>Your app starts here.</p>
    <//>\`, document.body);
}
`;async function Ft({name:e,description:t}){let a=e.trim(),n=a.charAt(0).toUpperCase()+a.slice(1),i=await K();return await P.mkdir(n,i),await le(n,"acelery_app.json",JSON.stringify({name:n,description:t,entry:"main.js"})),await le(n,"main.js",Ia(n)),n}async function ge(){return(await P.listFiles("db",await La())).filter(t=>!t.directory&&!t.fname.includes("journal")).map(t=>({name:t.fname,length:t.length,modified:t.lastmodified})).sort((t,a)=>t.name.localeCompare(a.name))}async function Mt(e){return(await ge()).some(t=>t.name===e)}function je(e){if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(e))throw new Error(`"${e}" is not a usable table name`);return e}function ue(){return!!globalThis.ACeleryHost}function ke(e){globalThis.ACeleryHost?.postMessage(JSON.stringify(e))}function fe(e){return typeof e!="number"||!Number.isFinite(e)?"":e<1024?`${e} B`:e<1024*1024?`${(e/1024).toFixed(e<10240?1:0)} KB`:`${(e/1024/1024).toFixed(1)} MB`}function jt(e){if(typeof e!="number"||!e)return"";let t=new Date(e);return t.toDateString()===new Date().toDateString()?t.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):t.toLocaleDateString([],{day:"numeric",month:"short",year:"numeric"})}import{html as W,useState as Bt,useEffect as Fa,Button as Ce}from"acelery/ui.js";import{runApp as Rt}from"acelery/export.js";function Ma(e=new Date){let t=e.getHours();return t<5?"Working late":t<12?"Good morning":t<18?"Good afternoon":"Good evening"}var Ht=e=>t=>{t.button!==0||t.metaKey||t.ctrlKey||t.shiftKey||t.altKey||(t.preventDefault(),h(e))};function Ot({settings:e,updateSettings:t}){let[a,n]=Bt(null),[i,o]=Bt(null);Fa(()=>{let v=!0;return(async()=>{try{let[m,$]=await Promise.all([ce(),ge()]);if(!v)return;n({projects:m,databases:$});let y={},g=e["recent.project"];g&&!m.some(R=>R.name===g)&&(y["recent.project"]="",y["recent.file"]="");let x=e["recent.db"];x&&!$.some(R=>R.name===x)&&(y["recent.db"]=""),Object.keys(y).length&&t(y)}catch(m){if(!v)return;o(m),n({projects:[],databases:[]})}})(),()=>{v=!1}},[]);let r=a?.projects.find(v=>v.name===e["recent.project"]),l=r?e["recent.file"]:"",d=a?.databases.find(v=>v.name===e["recent.db"]),c=a?.projects.find(v=>v.name==="Example"),s=()=>{we("new-project"),h(["code"])},f=()=>{we("new-db"),h(["data"])},b;a?r||d?b=W`
      <div class="ac-continue">
        ${r?W`
              <div class="ac-continue-card">
                <${ze} name=${r.name} icon=${r.icon} />
                <div class="ac-row-body">
                  <div class="ac-row-title">${r.name}</div>
                  <div class="ac-row-meta">${l||r.description||"Project"}</div>
                </div>
                <div class="ac-button-row">
                  <${Ce} variant="outline-primary"
                    onClick=${()=>h(l?["code",r.name,l]:["code",r.name])}>
                    Open
                  <//>
                  <${Ce} variant="primary"
                    onClick=${()=>Rt(r.name,r.name,!0)}>
                    <${C} name="fa-solid fa-play" /> Run
                  <//>
                </div>
              </div>`:null}
        ${d?W`
              <div class="ac-continue-card">
                <div class="ac-row-icon" aria-hidden="true">
                  <${C} name="fa-solid fa-database" />
                </div>
                <div class="ac-row-body">
                  <div class="ac-row-title">${d.name}</div>
                  <div class="ac-row-meta">Database · ${fe(d.length)}</div>
                </div>
                <div class="ac-button-row">
                  <${Ce} variant="outline-primary" onClick=${()=>h(["data",d.name])}>
                    Open
                  <//>
                </div>
              </div>`:null}
      </div>`:b=W`
      <div class="ac-welcome">
        <h2>Welcome to aCelery</h2>
        <p>
          An aCelery app is a few JavaScript files you write on this device and
          run straight away. Try the example, or start your own.
        </p>
        <div class="ac-button-row">
          ${c?W`<${Ce} variant="primary"
                     onClick=${()=>Rt(c.name,c.name,!1)}>
                <${C} name="fa-solid fa-play" /> Run the Example app
              <//>`:null}
          <${Ce} variant=${c?"outline-primary":"primary"} onClick=${s}>
            Create your first app
          <//>
        </div>
      </div>`:b=W`<${A} rows=${2} />`;let k=v=>v?String(v.length):"\u2013";return W`
    <${D} title=${W`
      <span class="ac-brand-inline">
        <span class="ac-brand-mark" aria-hidden="true"><${C} name="fa-solid fa-seedling" /></span>
        aCelery
      </span>`}>
      <${M} error=${i} onClose=${()=>o(null)} />
      <div class="ac-home">
        <div>
          <div class="ac-hero">
            <h2>${Ma()}</h2>
            <p>Build and run your own JavaScript apps.</p>
          </div>
          <section class="ac-section" aria-label=${r||d?"Continue":"Get started"}>
            <h2 class="ac-section-title">${r||d?"Continue":"Get started"}</h2>
            ${b}
          </section>
        </div>
        <div>
          <section class="ac-section">
            <h2 class="ac-section-title">Create</h2>
            <div class="ac-quick">
              <button type="button" class="ac-quick-btn" onClick=${s}>
                <span class="ac-quick-icon"><${C} name="fa-solid fa-code" /></span>
                New app
              </button>
              <button type="button" class="ac-quick-btn" onClick=${f}>
                <span class="ac-quick-icon"><${C} name="fa-solid fa-database" /></span>
                New database
              </button>
            </div>
          </section>
          <section class="ac-section">
            <h2 class="ac-section-title">On this device</h2>
            <div class="ac-stats">
              <a class="ac-stat" href=${G(["apps"])} onClick=${Ht(["apps"])}>
                <span class="ac-stat-value">${k(a?.projects)}</span>
                <span class="ac-stat-label">${a?.projects.length===1?"app":"apps"}</span>
              </a>
              <a class="ac-stat" href=${G(["data"])} onClick=${Ht(["data"])}>
                <span class="ac-stat-value">${k(a?.databases)}</span>
                <span class="ac-stat-label">
                  ${a?.databases.length===1?"database":"databases"}
                </span>
              </a>
            </div>
          </section>
        </div>
      </div>
    <//>`}import{html as _,useState as Ve,useEffect as Ha,useCallback as Oa,Button as qa}from"acelery/ui.js";import{runApp as _a,exportProject as Na}from"acelery/export.js";import{html as ja,useState as Ba,useCallback as Ra,Modal as Se,Button as qt}from"acelery/ui.js";function q(){let[e,t]=Ba(null),a=Ra((o,{title:r="aCelery",danger:l=!1,confirmLabel:d="OK",cancelLabel:c="Cancel",dismissValue:s=!1}={})=>new Promise(f=>t({message:o,title:r,danger:l,confirmLabel:d,cancelLabel:c,dismissValue:s,resolve:f})),[]),n=o=>{e?.resolve(o),t(null)},i=e?ja`
        <${Se} show onHide=${()=>n(e.dismissValue)} centered>
          <${Se.Header} closeButton>
            <${Se.Title} as="h2" className="fs-5">${e.title}<//>
          <//>
          <${Se.Body}>${e.message}<//>
          <${Se.Footer}>
            <${qt} variant="outline-secondary" onClick=${()=>n(!1)}>
              ${e.cancelLabel}
            <//>
            <${qt} variant=${e.danger?"danger":"primary"}
                       onClick=${()=>n(!0)}>
              ${e.confirmLabel}
            <//>
          <//>
        <//>`:null;return{confirm:a,dialog:i}}var Ye=6;function Ze({value:e,onChange:t,label:a}){return _`
    <div class="ac-search" role="search">
      <${C} name="fa-solid fa-magnifying-glass" />
      <input type="search" class="form-control" aria-label=${a}
             placeholder=${a} value=${e}
             onInput=${n=>t(n.currentTarget.value)} />
    </div>`}function Xe(e,t){let a=t.trim().toLowerCase();return!a||e.name.toLowerCase().includes(a)||e.description.toLowerCase().includes(a)}async function xe(e,t){return e(`${t} and all of its files will be deleted. This cannot be undone.`,{title:`Delete ${t}?`,danger:!0,confirmLabel:"Delete"})}function _t({settings:e,updateSettings:t}){let[a,n]=Ve(null),[i,o]=Ve(null),[r,l]=Ve(""),d=O(),{confirm:c,dialog:s}=q(),f=Oa(async()=>{try{n(await ce())}catch(v){o(v),n([])}},[]);Ha(()=>{f()},[f]);async function b(v){if(await xe(c,v.name))try{await de(v.name),e["recent.project"]===v.name&&t({"recent.project":"","recent.file":""}),d(`Deleted ${v.name}`),await f()}catch(m){o(m)}}let k;if(a===null)k=_`<${A} rows=${4} grid />`;else if(!a.length)k=_`
      <${F} icon="fa-solid fa-table-cells" title="No apps yet"
        action=${_`
          <${qa} variant="primary"
            onClick=${()=>{we("new-project"),h(["code"])}}>
            Create an app
          <//>`}>
        An app is a folder of JavaScript you write in Code.
      <//>`;else{let v=a.filter(m=>Xe(m,r));k=_`
      ${a.length>Ye?_`<div class="ac-toolbar">
            <${Ze} label="Search apps" value=${r} onChange=${l} />
          </div>`:null}
      ${v.length?_`
            <div class="ac-grid">
              ${v.map(m=>_`
                <${Fe} key=${m.name} project=${m} verb="Run"
                  onOpen=${()=>_a(m.name,m.name,!1)}
                  actions=${[{label:"Edit in Code",icon:"fa-solid fa-pen-to-square",onSelect:()=>h(["code",m.name])},{label:"Export",icon:"fa-solid fa-file-export",onSelect:()=>Na(m.name)},{label:"Delete",icon:"fa-solid fa-trash",danger:!0,onSelect:()=>b(m)}]} />`)}
            </div>`:_`<p class="text-body-secondary px-1">Nothing matches “${r}”.</p>`}`}return _`
    <${D} title="Apps">
      <${M} error=${i} onClose=${()=>o(null)} />
      ${k}
    <//>
    ${s}`}import{html as B,useState as Be,useEffect as Ua,useCallback as Ka,Button as et,Modal as Nt,Form as Ga,Input as Ut,notEmpty as za}from"acelery/ui.js";import{runApp as Ja,exportProject as Wa,importProject as Qa}from"acelery/export.js";function Va({show:e,existing:t,onClose:a,onCreate:n}){let i=o=>{let r=(o??"").trim().toLowerCase();return t.some(l=>l.name.toLowerCase()===r)?"A project with that name already exists":!0};return B`
    <${re} show=${e} onHide=${a} title="New project">
      <${Ga} initial=${{name:"",description:""}} onSubmit=${n}>
        <${Nt.Body}>
          <${Ut} label="Name" name="name"
            placeholder="Letters and numbers, 16 max"
            autocapitalize="off" autocomplete="off" spellcheck=${!1}
            validate=${[za("A name is required"),o=>/^\w{1,16}$/.test((o??"").trim())?!0:"Letters, numbers and underscore only, 16 at most",i]} />
          <${Ut} label="Description" name="description" as="textarea"
            placeholder="What it does, in a sentence (optional)"
            validate=${[o=>(o??"").length<=140?!0:"140 characters at most"]} />
        <//>
        <${Nt.Footer}>
          <${et} variant="outline-secondary" type="button" onClick=${a}>
            Cancel
          <//>
          <${et} variant="primary" type="submit">Create project<//>
        <//>
      <//>
    <//>`}function Kt({settings:e,updateSettings:t}){let[a,n]=Be(null),[i,o]=Be(null),[r,l]=Be(""),[d,c]=Be(()=>Te("new-project")),s=O(),{confirm:f,dialog:b}=q(),k=Ka(async()=>{try{n(await ce())}catch(y){o(y),n([])}},[]);Ua(()=>{k()},[k]);async function v(y){c(!1);try{let g=await Ft(y);s(`Created ${g}`),h(["code",g,"main.js"])}catch(g){o(g)}}async function m(y){if(await xe(f,y.name))try{await de(y.name),e["recent.project"]===y.name&&t({"recent.project":"","recent.file":""}),s(`Deleted ${y.name}`),await k()}catch(g){o(g)}}let $;if(a===null)$=B`<${A} rows=${4} grid />`;else if(!a.length)$=B`
      <${F} icon="fa-solid fa-folder" title="No projects yet"
        action=${B`
          <${et} variant="primary" onClick=${()=>c(!0)}>
            New project
          <//>`}>
        A project is a folder holding an app's JavaScript, CSS and manifest.
      <//>`;else{let y=a.filter(g=>Xe(g,r));$=B`
      ${a.length>Ye?B`<div class="ac-toolbar">
            <${Ze} label="Search projects" value=${r} onChange=${l} />
          </div>`:null}
      ${y.length?B`
            <div class="ac-grid">
              ${y.map(g=>B`
                <${Fe} key=${g.name} project=${g} verb="Open"
                  onOpen=${()=>h(["code",g.name])}
                  actions=${[{label:"Run",icon:"fa-solid fa-play",onSelect:()=>Ja(g.name,g.name,!0)},{label:"Export",icon:"fa-solid fa-file-export",onSelect:()=>Wa(g.name)},{label:"Delete",icon:"fa-solid fa-trash",danger:!0,onSelect:()=>m(g)}]} />`)}
            </div>`:B`<p class="text-body-secondary px-1">Nothing matches “${r}”.</p>`}`}return B`
    <${D} title="Code"
      actions=${ue()?B`<${H} icon="fa-solid fa-file-import" label="Import project"
                 onClick=${Qa} />`:null}
      fab=${{icon:"fa-solid fa-plus",label:"New project",onClick:()=>c(!0)}}>
      <${M} error=${i} onClose=${()=>o(null)} />
      ${$}
    <//>
    <${Va} show=${d} existing=${a??[]}
      onClose=${()=>c(!1)} onCreate=${v} />
    ${b}`}import{html as S,useState as Q,useEffect as te,useRef as $e,useCallback as Gt,Button as me,Modal as zt,Form as Ya,Input as Za,Select as Xa,notEmpty as en}from"acelery/ui.js";import{runApp as tn,exportProject as an}from"acelery/export.js";var Re=e=>e.includes(".")?e.split(".").pop().toLowerCase():"",tt={js:"JavaScript",mjs:"JavaScript",json:"JSON",css:"CSS",html:"HTML",htm:"HTML",xml:"XML",svg:"SVG",md:"Markdown",txt:"Text"},Jt=new Set(["png","jpg","jpeg","gif","webp","bmp","ico"]),nn=new Set(["zip","woff","woff2","ttf","otf","mp3","mp4","pdf","db"]);function on(e){let t=Re(e);return Jt.has(t)?"fa-solid fa-file-image":["md","txt"].includes(t)?"fa-solid fa-file-lines":tt[t]?"fa-solid fa-file-code":"fa-solid fa-file"}function sn(e){let t=Re(e);return Jt.has(t)?"image":nn.has(t)?"binary":"text"}function rn({show:e,project:t,existing:a,onClose:n,onCreate:i}){return S`
    <${re} show=${e} onHide=${n} title=${`New file in ${t}`}>
      <${Ya} initial=${{name:"",type:".js"}} onSubmit=${i}>
        <${zt.Body}>
          <${Za} label="Name" name="name" placeholder="File name without extension"
            autocapitalize="off" autocomplete="off" spellcheck=${!1}
            validate=${[en("A name is required"),o=>/^[\w.-]+$/.test((o??"").trim())?!0:"Letters, numbers, dot, dash and underscore only"]} />
          <${Xa} label="Type" name="type" options=${[{label:"JavaScript",value:".js"},{label:"CSS",value:".css"}]} />
        <//>
        <${zt.Footer}>
          <${me} variant="outline-secondary" type="button" onClick=${n}>
            Cancel
          <//>
          <${me} variant="primary" type="submit"
            onClick=${o=>{let r=o.currentTarget.form,l=`${r.elements.name.value.trim()}${r.elements.type.value}`;a.some(d=>d.name===l)&&(o.preventDefault(),i({duplicate:l}))}}>
            Create file
          <//>
        <//>
      <//>
    <//>`}function Wt({project:e,fileName:t,editorTheme:a,settings:n,updateSettings:i}){let o=Ge(kt),r=O(),{confirm:l,dialog:d}=q(),[c,s]=Q("loading"),[f,b]=Q([]),[k,v]=Q(null),[m,$]=Q(null),[y,g]=Q(!1),[x,R]=Q(null),[oe,he]=Q(!1),[De,ve]=Q(!1),ie=$e(null),T=$e(null),L=$e(!1),V=$e(null);V.current=x;let it=$e(a);it.current=a;let se=u=>{L.current=u,he(u)},st=Gt(async()=>{b(await Me(e))},[e]);te(()=>{let u=!0;return(async()=>{try{if(!await Lt(e)){u&&s("missing");return}let[E,I]=await Promise.all([Me(e),Qe(e)]);if(!u)return;b(E),v(I),s("ready")}catch(E){if(!u)return;$(E),s("ready")}})(),()=>{u=!1}},[e]),te(()=>{c==="ready"&&!t&&n["recent.project"]!==e&&i({"recent.project":e,"recent.file":""})},[c,e,t]),te(()=>{if(R(null),c!=="ready"||!t)return;let u=!0;return(async()=>{try{let E=await Me(e);if(!u)return;if(!E.some(ma=>ma.name===t)){R({name:t,kind:"missing"});return}let I=sn(t),_e=I==="text"?await Pt(e,t):null;if(!u)return;R({name:t,kind:I,text:_e}),i({"recent.project":e,"recent.file":t})}catch(E){u&&$(E)}})(),()=>{u=!1}},[e,t,c]);let ye=Gt(async()=>{let u=T.current,E=V.current;if(!u||E?.kind!=="text")return!0;let I=u.getValue();ve(!0);try{return await le(e,E.name,I),T.current===u&&u.getValue()===I&&se(!1),!0}catch(_e){return $(_e),!1}finally{ve(!1)}},[e]),Ee=$e(ye);Ee.current=ye,te(()=>{if(x?.kind!=="text"||!ie.current)return;let u=x.name,E=globalThis.aceleryEditor.createEditor(ie.current,{value:x.text,filename:u,theme:it.current,onChange:()=>{L.current||se(!0)},onSave:()=>Ee.current()});return T.current=E,se(!1),()=>{L.current&&(le(e,u,E.getValue()).catch(I=>console.error(`aCelery: could not save ${u}`,I)),L.current=!1),E.destroy(),T.current===E&&(T.current=null)}},[x]),te(()=>{T.current?.setTheme(a)},[a]),te(()=>(globalThis.forceSaveFile=()=>{L.current&&Ee.current()},()=>{delete globalThis.forceSaveFile}),[]),te(()=>pt(async()=>{if(!L.current)return!0;let u=await l(`Save your changes to ${V.current?.name??"this file"} before leaving?`,{title:"Unsaved changes",confirmLabel:"Save",cancelLabel:"Discard",dismissValue:null});return u===null?!1:u?Ee.current():(se(!1),!0)}),[l]);async function da(){L.current&&!await ye()||tn(e,e,!0)}async function ua(){L.current&&!await ye()||an(e)}async function fa(u){if(u.duplicate){$(new Error(`${u.duplicate} already exists in ${e}`)),g(!1);return}g(!1);let E=u.name.trim()+u.type;try{await le(e,E,""),await st(),h(["code",e,E],{replace:o&&!!t})}catch(I){$(I)}}async function rt(u){if(await l(`${u} will be deleted from ${e}. This cannot be undone.`,{title:`Delete ${u}?`,danger:!0,confirmLabel:"Delete"}))try{u===t&&se(!1),await It(e,u),await st(),r(`Deleted ${u}`),u===t&&h(["code",e],{replace:!0})}catch(I){$(I)}}async function $a(){if(await xe(l,e))try{se(!1),await de(e),n["recent.project"]===e&&i({"recent.project":"","recent.file":""}),r(`Deleted ${e}`),h(["code"],{replace:!0})}catch(u){$(u)}}let lt=u=>h(["code",e,u],{replace:o&&!!t});if(c==="missing")return S`
      <${D} title=${e} back=${["code"]}>
        <${z} what="Project" action=${S`
          <${me} variant="primary" onClick=${()=>h(["code"],{replace:!0})}>
            All projects
          <//>`} />
      <//>`;if(c==="loading")return S`
      <${D} title=${e} back=${["code"]}>
        <${A} rows=${4} />
      <//>`;let Y=!!t,ct=S`<${M} error=${m} onClose=${()=>$(null)} />`,dt=f.length?S`
        <div class="ac-list">
          ${f.map(u=>S`
            <${J} key=${u.name} icon=${on(u.name)} title=${u.name}
              meta=${`${tt[Re(u.name)]??"File"} \xB7 ${fe(u.length)}`}
              badge=${u.name===k?.entry?"entry":null}
              selected=${u.name===t}
              onOpen=${()=>lt(u.name)}
              actions=${[{label:"Delete",icon:"fa-solid fa-trash",danger:!0,onSelect:()=>rt(u.name)}]} />`)}
        </div>`:S`
        <${F} icon="fa-solid fa-file-code" title="No files yet"
          action=${S`<${me} variant="primary" onClick=${()=>g(!0)}>
            New file
          <//>`}>
          Add a JavaScript file for the app to run.
        <//>`,Z;if(Y)x?x.kind==="missing"?Z=S`
      <${z} what="File" action=${S`
        <${me} variant="primary"
          onClick=${()=>h(["code",e],{replace:!0})}>
          Back to ${e}
        <//>`} />`:x.kind==="image"?Z=S`
      <div class="ac-preview">
        <img alt=${x.name}
          src=${`/user/${encodeURIComponent(e)}/${encodeURIComponent(x.name)}`} />
      </div>`:x.kind==="binary"?Z=S`
      <${F} icon="fa-solid fa-file" title="Not a text file">
        ${x.name} can't be edited here.
      <//>`:Z=S`
      <div class="ac-editor-host"><div class="ac-editor-mount" ref=${ie}></div></div>
      <div class="ac-status">
        <span>${tt[Re(x.name)]??"Text"}</span>
        <span role="status">${De?"Saving\u2026":oe?"Unsaved changes":"Saved"}</span>
      </div>`:Z=S`<div class="ac-empty" aria-busy="true"><p>Opening ${t}…</p></div>`;else{let u=f.find(E=>E.name===k?.entry);Z=S`
      <${F} icon="fa-solid fa-file-code" title="Pick a file"
        action=${u?S`<${me} variant="outline-primary" onClick=${()=>lt(u.name)}>
              Open ${u.name}
            <//>`:null}>
        Choose a file from the list to edit it.
      <//>`}let ut=Y?S`${t}${oe?S`<span class="ac-dirty" role="img" aria-label="unsaved changes"></span>`:null}`:e,ft=S`
    ${x?.kind==="text"?S`<${H} icon="fa-solid fa-floppy-disk" label="Save"
               disabled=${!oe||De} onClick=${ye} />`:null}
    <${H} icon="fa-solid fa-play" label=${`Run ${e}`} primary onClick=${da} />
    <${ee} title=${Y?t:e} actions=${[{label:"New file",icon:"fa-solid fa-plus",onSelect:()=>g(!0)},{label:"Export project",icon:"fa-solid fa-file-export",onSelect:ua},Y&&{label:`Delete ${t}`,icon:"fa-solid fa-trash",danger:!0,onSelect:()=>rt(t)},{label:"Delete project",icon:"fa-solid fa-trash",danger:!0,onSelect:$a}]} />`,$t=S`
    <${rn} show=${y} project=${e} existing=${f}
      onClose=${()=>g(!1)} onCreate=${fa} />
    ${d}`;return!o&&!Y?S`
      <${D} title=${ut} subtitle=${k?.description||null} back=${["code"]}
        actions=${ft}
        fab=${{icon:"fa-solid fa-plus",label:"New file",onClick:()=>g(!0)}}>
        ${ct}
        <h2 class="ac-section-title">Files</h2>
        ${dt}
      <//>
      ${$t}`:S`
    <${D} title=${ut} subtitle=${Y?e:k?.description||null}
      back=${Y?["code",e]:["code"]} actions=${ft} fill>
      <div class="ac-split">
        ${o?S`
              <aside class="ac-sidebar" aria-label="Files">
                <div class="ac-sidebar-head">
                  <h2 class="ac-section-title">Files</h2>
                  <${H} icon="fa-solid fa-plus" label="New file"
                    onClick=${()=>g(!0)} />
                </div>
                ${dt}
              </aside>`:null}
        <div class="ac-pane">
          ${ct}
          ${Z}
        </div>
      </div>
    <//>
    ${$t}`}import{html as ae,useState as at,useEffect as ln,useCallback as cn,Button as nt,Modal as Qt,Form as dn,Input as un,notEmpty as fn}from"acelery/ui.js";import{openDB as $n,deleteDB as mn}from"acelery/sql.js";function pn({show:e,existing:t,onClose:a,onCreate:n}){return ae`
    <${re} show=${e} onHide=${a} title="New database">
      <${dn} initial=${{name:""}} onSubmit=${n}>
        <${Qt.Body}>
          <${un} label="Name" name="name" placeholder="Database name without extension"
            autocapitalize="off" autocomplete="off" spellcheck=${!1}
            help="Saved as a SQLite file ending in .db."
            validate=${[fn("A name is required"),i=>/^[\w-]+$/.test((i??"").trim())?!0:"Letters, numbers, dash and underscore only",i=>t.some(o=>o.name===`${(i??"").trim()}.db`)?"A database with that name already exists":!0]} />
        <//>
        <${Qt.Footer}>
          <${nt} variant="outline-secondary" type="button" onClick=${a}>
            Cancel
          <//>
          <${nt} variant="primary" type="submit">Create database<//>
        <//>
      <//>
    <//>`}function Vt({settings:e,updateSettings:t}){let[a,n]=at(null),[i,o]=at(null),[r,l]=at(()=>Te("new-db")),d=O(),{confirm:c,dialog:s}=q(),f=cn(async()=>{try{n(await ge())}catch(m){o(m),n([])}},[]);ln(()=>{f()},[f]);async function b({name:m}){l(!1);let $=`${m.trim()}.db`;try{await(await $n($)).close(),d(`Created ${$}`),h(["data",$])}catch(y){o(y)}}async function k(m){if(await c(`${m} and every table in it will be deleted. This cannot be undone.`,{title:`Delete ${m}?`,danger:!0,confirmLabel:"Delete"}))try{await mn(m),e["recent.db"]===m&&t({"recent.db":""}),d(`Deleted ${m}`),await f()}catch(y){o(y)}}let v;return a===null?v=ae`<${A} rows=${3} />`:a.length?v=ae`
      <div class="ac-list">
        ${a.map(m=>ae`
          <${J} key=${m.name} icon="fa-solid fa-database" title=${m.name}
            meta=${[fe(m.length),jt(m.modified)].filter(Boolean).join(" \xB7 ")}
            badge=${m.name==="acelery.db"?"settings":null}
            onOpen=${()=>h(["data",m.name])}
            actions=${[{label:"Delete",icon:"fa-solid fa-trash",danger:!0,onSelect:()=>k(m.name)}]} />`)}
      </div>`:v=ae`
      <${F} icon="fa-solid fa-database" title="No databases yet"
        action=${ae`
          <${nt} variant="primary" onClick=${()=>l(!0)}>
            New database
          <//>`}>
        A database is a SQLite file your apps read and write.
      <//>`,ae`
    <${D} title="Data"
      fab=${{icon:"fa-solid fa-plus",label:"New database",onClick:()=>l(!0)}}>
      <${M} error=${i} onClose=${()=>o(null)} />
      ${v}
    <//>
    <${pn} show=${r} existing=${a??[]}
      onClose=${()=>l(!1)} onCreate=${b} />
    ${s}`}import{html as p,useState as N,useEffect as He,useCallback as hn,useMemo as vn,Button as pe,Dropdown as ne,Table as Yt,CheckBox as yn,TableMaint as bn}from"acelery/ui.js";import{openDB as wn,deleteDB as gn}from"acelery/sql.js";var Oe=(e,t,a=`${t}s`)=>`${e} ${e===1?t:a}`,kn=["INT","DOU","REA","FLO","NUM","DEC","BOO","DAT"],Cn=`create table new_table (
  id integer primary key,
  name text not null
)`,Sn=200;function Zt({dbName:e,parts:t,settings:a,updateSettings:n}){let[i,o]=N(null),[r,l]=N("loading"),[d,c]=N(null),[s,f]=N(""),[b,k]=N(null),[v,m]=N([]),$=O(),{confirm:y,dialog:g}=q();He(()=>{let T=!0,L=null;return(async()=>{try{if(!await Mt(e)){T&&l("missing");return}if(L=await wn(e),!T)return;o(L),l("ready"),a["recent.db"]!==e&&n({"recent.db":e})}catch(V){if(!T)return;c(V),l("ready")}})(),()=>{T=!1,L?.close().catch(()=>{})}},[e]);async function x(){if(await y(`${e} and every table in it will be deleted. This cannot be undone.`,{title:`Delete ${e}?`,danger:!0,confirmLabel:"Delete"}))try{await i?.close(),await gn(e),a["recent.db"]===e&&n({"recent.db":""}),$(`Deleted ${e}`),h(["data"],{replace:!0})}catch(L){c(L)}}async function R(T){if(!await y(`The table ${T} and all of its rows will be deleted. This cannot be undone.`,{title:`Drop ${T}?`,danger:!0,confirmLabel:"Drop table"}))return!1;try{return await i.exec(`drop table ${je(T)}`),$(`Dropped ${T}`),!0}catch(V){return c(V),!1}}let[oe,he,De]=t,ve=p`<${M} error=${d} onClose=${()=>c(null)} />`;if(r==="missing")return p`
      <${D} title=${e} back=${["data"]}>
        <${z} what="Database" action=${p`
          <${pe} variant="primary" onClick=${()=>h(["data"],{replace:!0})}>
            All databases
          <//>`} />
      <//>`;if(oe==="table"&&he)return p`
      <${Dn} db=${i} dbName=${e} table=${he} structure=${De==="structure"}
        error=${ve} onError=${c}
        onDrop=${async()=>{await R(he)&&h(["data",e],{replace:!0})}} />
      ${g}`;let ie=oe==="sql"?"sql":"tables";return p`
    <${D} title=${e} back=${["data"]}
      actions=${p`<${ee} title=${e} actions=${[{label:"Delete database",icon:"fa-solid fa-trash",danger:!0,onSelect:x}]} />`}
      subbar=${p`
        <${Ie} label="Database view" value=${ie}
          options=${[{value:"tables",label:"Tables",icon:"fa-solid fa-table"},{value:"sql",label:"SQL",icon:"fa-solid fa-terminal"}]}
          onChange=${T=>h(T==="sql"?["data",e,"sql"]:["data",e],{replace:!0})} />`}>
      ${ve}
      ${i?ie==="sql"?p`<${En} db=${i} sql=${s} setSql=${f}
                   result=${b} setResult=${k}
                   history=${v} setHistory=${m} />`:p`<${xn} db=${i} dbName=${e} onError=${c}
                   onDrop=${R}
                   onCreate=${()=>{f(Cn),k(null),h(["data",e,"sql"],{replace:!0})}} />`:r==="loading"?p`<${A} rows=${3} />`:null}
    <//>
    ${g}`}function xn({db:e,dbName:t,onError:a,onDrop:n,onCreate:i}){let[o,r]=N(null),[l,d]=N({}),c=hn(async()=>{try{let s=await e.select("select name from sqlite_master where type = ? order by name",["table"]);r(s.map(f=>f.name))}catch(s){a(s),r([])}},[e]);return He(()=>{c()},[c]),He(()=>{if(!o)return;let s=!0;return(async()=>{for(let f of o){if(!s)return;try{je(f);let b=await e.select(`PRAGMA table_info(${f})`),k=await e.selectOne(`select count(*) as n from ${f}`);s&&d(v=>({...v,[f]:{columns:b.length,rows:k?.n??0}}))}catch{}}})(),()=>{s=!1}},[o]),o===null?p`<${A} rows=${3} />`:o.length?p`
    <div class="ac-list">
      ${o.map(s=>{let f=l[s];return p`
          <${J} key=${s} icon="fa-solid fa-table" title=${s}
            meta=${f?`${Oe(f.columns,"column")} \xB7 ${Oe(f.rows,"row")}`:"\xA0"}
            onOpen=${()=>h(["data",t,"table",s])}
            actions=${[{label:"Structure",icon:"fa-solid fa-table-columns",onSelect:()=>h(["data",t,"table",s,"structure"])},{label:"Drop table",icon:"fa-solid fa-trash",danger:!0,onSelect:async()=>{await n(s)&&c()}}]} />`})}
    </div>`:p`
      <${F} icon="fa-solid fa-table" title="No tables yet"
        action=${p`<${pe} variant="primary" onClick=${i}>Create a table<//>`}>
        Start from a template in the SQL tab.
      <//>`}function Dn({db:e,dbName:t,table:a,structure:n,error:i,onError:o,onDrop:r}){let[l,d]=N(null),[c,s]=N(()=>new Set);He(()=>{if(!e)return;let $=!0;return(async()=>{try{je(a);let y=await e.select(`PRAGMA table_info(${a})`);$&&d(y)}catch(y){if(!$)return;o(y),d([])}})(),()=>{$=!1}},[e,a]);let f=vn(()=>(l??[]).map($=>({type:kn.some(y=>String($.type).toUpperCase().includes(y))?"number":"string",title:$.name,name:$.name,inList:!c.has($.name),inSearch:!0})),[l,c]),b=($,y)=>s(g=>{let x=new Set(g);return y?x.delete($):x.add($),x}),k=p`<${ee} title=${a} actions=${[n?{label:"Browse rows",icon:"fa-solid fa-table",onSelect:()=>h(["data",t,"table",a],{replace:!0})}:{label:"Structure",icon:"fa-solid fa-table-columns",onSelect:()=>h(["data",t,"table",a,"structure"])},{label:"Drop table",icon:"fa-solid fa-trash",danger:!0,onSelect:r}]} />`,v=!n&&l?.length?p`
        <${ne} autoClose="outside" align="end" className="ac-over">
          <${ne.Toggle} as="button" type="button" bsPrefix="ac-chip"
                              aria-label="Choose columns">
            <${C} name="fa-solid fa-table-columns" />
            <span class="d-none d-md-inline">Columns</span>
          <//>
          <${ne.Menu} className="ac-columns-menu" popperConfig=${{strategy:"fixed"}}>
            ${l.map($=>p`
              <${yn} key=${$.name} label=${$.name} className="mb-2"
                checked=${!c.has($.name)}
                onChange=${y=>b($.name,y)} />`)}
          <//>
        <//>`:null,m;return!e||l===null?m=p`<${A} rows=${4} />`:l.length?n?m=p`
      <div class="ac-results">
        <${Yt} hover size="sm">
          <thead>
            <tr><th>Column</th><th>Type</th><th>Not null</th><th>Default</th><th>Key</th></tr>
          </thead>
          <tbody>
            ${l.map($=>p`
              <tr key=${$.name}>
                <td>${$.name}</td>
                <td>${$.type||p`<span class="ac-null">none</span>`}</td>
                <td>${$.notnull?"yes":""}</td>
                <td>${$.dflt_value??p`<span class="ac-null">NULL</span>`}</td>
                <td>${$.pk?"primary":""}</td>
              </tr>`)}
          </tbody>
        <//>
      </div>`:m=p`
      <${bn} key=${f.filter($=>$.inList).map($=>$.name).join("|")}
        db=${e} title=${a} table=${a} fields=${f} onError=${o} />`:m=p`
      <${z} what="Table" action=${p`
        <${pe} variant="primary"
          onClick=${()=>h(["data",t],{replace:!0})}>
          All tables
        <//>`} />`,p`
    <${D} title=${a}
      subtitle=${n?`Structure \xB7 ${t}`:t}
      back=${n?["data",t,"table",a]:["data",t]}
      actions=${p`${v}${k}`}>
      ${i}
      ${m}
    <//>`}function En({db:e,sql:t,setSql:a,result:n,setResult:i,history:o,setHistory:r}){async function l(){let c=t.trim();if(!c)return;let s=performance.now(),f=()=>Math.max(0,Math.round(performance.now()-s));try{if(/^(select|pragma|with|explain)\b/i.test(c)){let b=await e.select(c);i({kind:"rows",rows:b,ms:f(),limit:Sn})}else if(/^insert\b/i.test(c)){let b=await e.insert(c);i({kind:"text",text:`Inserted row ${b}`,ms:f()})}else{let b=await e.exec(c);i({kind:"text",text:`${Oe(b,"row")} changed`,ms:f()})}r(b=>[c,...b.filter(k=>k!==c)].slice(0,10))}catch(b){i({kind:"error",text:b.message??String(b)})}}let d=null;return n?.kind==="error"?d=p`<${M} error=${n.text} onClose=${()=>i(null)} />`:n?.kind==="text"?d=p`<div class="ac-results-meta" role="status">${n.text} · ${n.ms} ms</div>`:n?.kind==="rows"&&(d=p`<${Tn} result=${n}
      onShowAll=${()=>i({...n,limit:1/0})} />`),p`
    <div class="ac-sql">
      <label class="visually-hidden" for="ac-sql-input">SQL statement</label>
      <textarea id="ac-sql-input" class="form-control ac-sql-input"
        placeholder="select * from …" spellcheck="false" autocapitalize="off"
        autocomplete="off" autocorrect="off" value=${t}
        onInput=${c=>a(c.currentTarget.value)}
        onKeyDown=${c=>{(c.metaKey||c.ctrlKey)&&c.key==="Enter"&&(c.preventDefault(),l())}}></textarea>
      <div class="ac-button-row">
        <${pe} variant="primary" onClick=${l} disabled=${!t.trim()}>
          <${C} name="fa-solid fa-play" /> Run
        <//>
        <${pe} variant="outline-secondary"
          onClick=${()=>{a(""),i(null)}}>
          Clear
        <//>
        ${o.length?p`
              <${ne}>
                <${ne.Toggle} variant="outline-secondary">
                  <${C} name="fa-solid fa-clock-rotate-left" /> History
                <//>
                <${ne.Menu} popperConfig=${{strategy:"fixed"}}>
                  ${o.map(c=>p`
                    <${ne.Item} as="button" key=${c}
                      className="font-monospace text-truncate" style=${{maxWidth:"22rem"}}
                      onClick=${()=>a(c)}>${c}<//>`)}
                <//>
              <//>`:null}
      </div>
      ${d}
    </div>`}function Tn({result:e,onShowAll:t}){let{rows:a,ms:n,limit:i}=e;if(!a.length)return p`<div class="ac-results-meta" role="status">No rows · ${n} ms</div>`;let o=[...new Set(a.flatMap(l=>Object.keys(l)))],r=a.slice(0,i);return p`
    <div class="ac-results-meta" role="status">
      ${Oe(a.length,"row")} · ${n} ms
    </div>
    <div class="ac-results">
      <${Yt} hover size="sm">
        <thead>
          <tr>${o.map(l=>p`<th key=${l} scope="col">${l}</th>`)}</tr>
        </thead>
        <tbody>
          ${r.map((l,d)=>p`
            <tr key=${d}>
              ${o.map(c=>{let s=l[c];return p`
                  <td key=${c} class=${typeof s=="number"?"ac-num":""}
                      title=${s==null?void 0:String(s)}>
                    ${s==null?p`<span class="ac-null">NULL</span>`:String(s)}
                  </td>`})}
            </tr>`)}
        </tbody>
      <//>
    </div>
    ${a.length>r.length?p`<div>
          <${pe} variant="outline-secondary" onClick=${t}>
            Show all ${a.length}
          <//>
        </div>`:null}`}import{html as qe,useState as An,THEMES as Ln,applyTheme as Xt,currentTheme as ea,currentMode as Pn,themeHasModes as In,isDark as ta}from"acelery/ui.js";import{EDITOR_THEMES as Fn,isDarkTheme as Mn}from"acelery/editor.js";var jn=e=>e.charAt(0).toUpperCase()+e.slice(1),aa=e=>e==="acelery"?"aCelery":jn(e),na="acelery.keepAwake";function Bn(){try{return sessionStorage.getItem(na)==="1"}catch{return!1}}function Rn(e){try{sessionStorage.setItem(na,e?"1":"0")}catch{}}function oa({settings:e,updateSettings:t}){let[a,n]=An(Bn),i=ea(),o=In(i),r=e.editortheme??"";function l(s){t({theme:Xt(s)})}function d(s){Xt(ea(),{mode:s}),t({"theme.mode":s})}function c(s){n(s),Rn(s),ke({action:"setKeepAwake",on:s})}return qe`
    <${D} title="Settings">
      <section class="ac-section" aria-labelledby="settings-appearance">
        <h2 class="ac-section-title" id="settings-appearance">Appearance</h2>
        <div class="ac-list">
          <div class="ac-setting">
            <div class="ac-setting-label">
              <span class="ac-setting-name" id="settings-mode">Mode</span>
              <div class="ac-setting-help">
                ${o?"Follow the device, or always light or dark.":`${aa(i)} is always ${ta()?"dark":"light"}.`}
              </div>
            </div>
            <${Ie} role="radiogroup" label="Mode"
              value=${o?Pn():ta()?"dark":"light"}
              onChange=${d}
              options=${[{value:"system",label:"System",icon:"fa-solid fa-circle-half-stroke",disabled:!o},{value:"light",label:"Light",icon:"fa-solid fa-sun",disabled:!o},{value:"dark",label:"Dark",icon:"fa-solid fa-moon",disabled:!o}]} />
          </div>
          <div class="ac-setting">
            <div class="ac-setting-label">
              <label for="settings-theme">Theme</label>
              <div class="ac-setting-help">aCelery and Default follow Mode.</div>
            </div>
            <select id="settings-theme" class="form-select" value=${i}
                    onChange=${s=>l(s.currentTarget.value)}>
              ${Ln.map(s=>qe`<option key=${s} value=${s}>${aa(s)}</option>`)}
            </select>
          </div>
          <div class="ac-setting">
            <div class="ac-setting-label">
              <label for="settings-editor">Editor colours</label>
              <div class="ac-setting-help">
                ${r?`A ${Mn(r)?"dark":"light"} scheme, whatever the mode.`:"Light or dark, to match the app."}
              </div>
            </div>
            <select id="settings-editor" class="form-select" value=${r}
                    onChange=${s=>t({editortheme:s.currentTarget.value})}>
              ${Fn.map(s=>qe`<option key=${s.value} value=${s.value}>${s.label}</option>`)}
            </select>
          </div>
        </div>
      </section>

      ${ue()?qe`
            <section class="ac-section" aria-labelledby="settings-device">
              <h2 class="ac-section-title" id="settings-device">This device</h2>
              <div class="ac-list">
                <${J} icon="fa-solid fa-wifi" title="Network access"
                  meta="Let other devices on your network open aCelery"
                  onOpen=${()=>ke({action:"showNetworkAccess"})} />
                <div class="ac-setting">
                  <div class="ac-setting-label">
                    <label for="settings-awake">Keep screen on</label>
                    <div class="ac-setting-help">While aCelery is open</div>
                  </div>
                  <div class="form-check form-switch m-0">
                    <input id="settings-awake" class="form-check-input" type="checkbox"
                      role="switch" checked=${a}
                      onChange=${s=>c(s.currentTarget.checked)} />
                  </div>
                </div>
              </div>
            </section>`:null}

      <section class="ac-section" aria-labelledby="settings-about">
        <h2 class="ac-section-title" id="settings-about">About</h2>
        <div class="ac-list">
          <div class="ac-row">
            <div class="ac-row-icon" aria-hidden="true"><${C} name="fa-solid fa-seedling" /></div>
            <div class="ac-row-body">
              <div class="ac-row-title">aCelery</div>
              <div class="ac-row-meta">Build and run your own JavaScript apps · GPLv3</div>
            </div>
          </div>
          <div class="ac-row">
            <div class="ac-row-icon" aria-hidden="true"><${C} name="fa-solid fa-circle-info" /></div>
            <div class="ac-row-body">
              <div class="ac-row-title">Serving</div>
              <div class="ac-row-meta">${window.location.origin}</div>
            </div>
          </div>
          <div class="ac-row is-action">
            <div class="ac-row-icon" aria-hidden="true">
              <${C} name="fa-solid fa-arrow-up-right-from-square" />
            </div>
            <div class="ac-row-body">
              <a class="ac-stretch ac-row-title" href="http://www.acelery.com/"
                 target="_blank" rel="noopener">Website</a>
              <div class="ac-row-meta">www.acelery.com</div>
            </div>
          </div>
        </div>
      </section>
    <//>`}var la=Promise.resolve();function Nn(e){let t=la.then(()=>Tt(e));return la=t.catch(a=>console.error("aCelery: could not save settings",a)),t}function Un(e){let t=String(e).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);return t?"#"+t.slice(1,4).map(a=>Number(a).toString(16).padStart(2,"0")).join(""):null}function ot(){ue()&&requestAnimationFrame(()=>{let e=document.querySelector(".ac-appbar")??document.body,t=Un(getComputedStyle(e).backgroundColor);ke({action:"setChrome",dark:ca(),...t?{color:t}:{}})})}function Kn(){let e=vt(),[t,a]=ia(null),[,n]=ia(0);sa(()=>{Et().then(f=>{ra(f.theme||"acelery",{mode:f["theme.mode"]||"system"}),a(f)},f=>{console.error("aCelery: could not read settings",f),ra("acelery",{mode:"system"}),a({})})},[]),sa(()=>{let f=()=>{n(k=>k+1),ot()};document.addEventListener("acelery:themechange",f);let b=document.getElementById("xbtheme");return b?.addEventListener("load",ot),()=>{document.removeEventListener("acelery:themechange",f),b?.removeEventListener("load",ot)}},[]);let i=On(f=>{a(b=>({...b,...f})),Nn(f)},[]);if(!t)return j`
      <${Je} section=${e.section}>
        <${D} title="aCelery"><${A} rows=${3} /><//>
      <//>`;let o=t.editortheme,r=o&&_n.some(f=>f.value===o)?o:ca()?"dark":"light",{section:l,parts:d}=e,c={settings:t,updateSettings:i},s;switch(l){case"home":s=j`<${Ot} ...${c} />`;break;case"apps":s=j`<${_t} ...${c} />`;break;case"code":s=d[0]?j`<${Wt} key=${d[0]} project=${d[0]} fileName=${d[1]}
                 editorTheme=${r} ...${c} />`:j`<${Kt} ...${c} />`;break;case"data":s=d[0]?j`<${Zt} key=${d[0]} dbName=${d[0]}
                 parts=${d.slice(1)} ...${c} />`:j`<${Vt} ...${c} />`;break;case"settings":s=j`<${oa} ...${c} />`;break;default:s=j`
        <${D} title="Not found">
          <${z} what="Page" action=${j`
            <${qn} variant="primary" onClick=${()=>h([],{replace:!0})}>
              Go home
            <//>`} />
        <//>`}return j`
    <${St}>
      <${Je} section=${l}>${s}<//>
    <//>`}function Gn(e=document.body){yt(),Hn(j`<${Kn} />`,e)}export{Gn as default};
