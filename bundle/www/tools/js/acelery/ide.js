import{html as F,render as Kn,useState as ua,useEffect as fa,useCallback as Gn,Button as zn,applyTheme as $a,isDark as pa}from"acelery/ui.js";import{EDITOR_THEMES as Jn}from"acelery/editor.js";import{html as U,useState as ja}from"acelery/ui.js";import{useState as ga,useEffect as ka}from"acelery/ui.js";function Ca(e){let t=String(e??"").replace(/^#\/?/,"").split("/").filter(Boolean).map(Sa);return{section:t[0]??"home",parts:t.slice(1)}}function Sa(e){try{return decodeURIComponent(e)}catch{return e}}function G(e){return"#/"+e.map(t=>encodeURIComponent(t)).join("/")}var be=()=>window.location.hash||"#/",Ne=new Set;function Ue(){for(let e of Ne)e(be())}var pt=!1;function xa(){pt||(pt=!0,window.addEventListener("popstate",Ue),window.addEventListener("hashchange",Ue))}var Z=null;function ht(e){return Z=e,()=>{Z===e&&(Z=null)}}async function h(e,{replace:t=!1}={}){let a=G(e);a!==be()&&(Z&&!await Z()||(t?window.history.replaceState({from:window.history.state?.from??null},"",a):window.history.pushState({from:be()},"",a),Ue()))}async function vt(e){let t=G(e);if(window.history.state?.from===t){if(Z&&!await Z())return;window.history.back()}else await h(e,{replace:!0})}function yt(){xa();let[e,t]=ga(be());return ka(()=>(Ne.add(t),t(be()),()=>Ne.delete(t)),[]),Ca(e)}function bt(){new URLSearchParams(window.location.search).get("opt")==="apps"&&window.history.replaceState(null,"",window.location.pathname+G(["apps"]))}var Ke=null;function we(e){Ke=e}function Te(e){return Ke!==e?!1:(Ke=null,!0)}import{html as w,useState as Pe,useEffect as Da,useCallback as Ea,useContext as Ta,useRef as kt,createContext as Aa,Modal as Le,Dropdown as Ae,Placeholder as wt,Alert as La,Toast as Pa,Button as to}from"acelery/ui.js";var C=({name:e})=>w`<i class=${e} aria-hidden="true"></i>`,Ia="(min-width: 768px)",Ct="(min-width: 992px)";function Ge(e){let t=()=>!!globalThis.matchMedia?.(e).matches,[a,n]=Pe(t);return Da(()=>{let i=globalThis.matchMedia?.(e);if(!i?.addEventListener)return;let o=()=>n(i.matches);return o(),i.addEventListener("change",o),()=>i.removeEventListener("change",o)},[e]),a}function H({icon:e,label:t,onClick:a,disabled:n,primary:i,className:o}){return w`
    <button type="button" aria-label=${t} title=${t}
      class=${`ac-iconbtn${i?" is-primary":""} ${o??""}`}
      disabled=${!!n} onClick=${a}>
      <${C} name=${e} />
    </button>`}function M({icon:e,title:t,children:a,action:n}){return w`
    <div class="ac-empty">
      <div class="ac-empty-icon"><${C} name=${e} /></div>
      <h2>${t}</h2>
      ${a?w`<p>${a}</p>`:null}
      ${n??null}
    </div>`}function A({rows:e=3,grid:t=!1}){let a=(i,o)=>w`
    <${wt} as="div" animation="glow">
      <${wt} xs=${i} size=${o} />
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
    </div>`}function j({error:e,onClose:t}){return e?w`
    <${La} variant="danger" className="ac-error" dismissible=${!!t}
              onClose=${t}>
      <${C} name="fa-solid fa-triangle-exclamation" />
      <span>${e?.message??String(e)}</span>
    <//>`:null}function z({what:e,action:t}){return w`
    <${M} icon="fa-solid fa-magnifying-glass" title=${`${e} not found`}
      action=${t}>
      It may have been deleted, or the link is out of date.
    <//>`}var St=Aa(()=>{});function xt({children:e}){let[t,a]=Pe([]),n=kt(0),i=Ea(s=>{let l=++n.current;a(d=>[...d.slice(-2),{id:l,text:s}])},[]),o=s=>a(l=>l.filter(d=>d.id!==s));return w`
    <${St.Provider} value=${i}>
      ${e}
      <div class="ac-toasts">
        ${t.map(s=>w`
          <${Pa} key=${s.id} className="ac-toast" show autohide delay=${4e3}
                    onClose=${()=>o(s.id)}
                    role="status" aria-live="polite">
            <div class="d-flex align-items-center">
              <div class="toast-body">${s.text}</div>
              <${H} icon="fa-solid fa-xmark" label="Dismiss"
                onClick=${()=>o(s.id)} />
            </div>
          <//>`)}
      </div>
    <//>`}var O=()=>Ta(St);function se({show:e,onHide:t,title:a,children:n}){return w`
    <${Le} show=${e} onHide=${t} centered dialogClassName="ac-sheet">
      ${a?w`<${Le.Header} closeButton>
            <${Le.Title} as="h2" className="fs-5">${a}<//>
          <//>`:null}
      ${n}
    <//>`}function ee({label:e="More actions",title:t,actions:a}){let n=Ge(Ia),[i,o]=Pe(!1),s=kt(null),l=a.filter(Boolean);return l.length?n?w`
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
                onExited=${()=>{let d=s.current;s.current=null,d?.()}}>
        ${t?w`<div class="ac-sheet-title">${t}</div>`:null}
        <div class="ac-actions" role="menu" aria-label=${e}>
          ${l.map(d=>w`
            <button key=${d.label} type="button" role="menuitem"
                    class=${`ac-action${d.danger?" is-danger":""}`}
                    disabled=${!!d.disabled}
                    onClick=${()=>{s.current=d.onSelect,o(!1)}}>
              ${d.icon?w`<${C} name=${d.icon} />`:null}
              <span>${d.label}</span>
            </button>`)}
        </div>
      <//>
    </span>`:null}function Ie({label:e,value:t,options:a,onChange:n,role:i="tablist"}){let o=i==="tablist"?"tab":"radio",s=i==="tablist"?"aria-selected":"aria-checked";return w`
    <div class="ac-segmented" role=${i} aria-label=${e}>
      ${a.map(l=>w`
        <button key=${l.value} type="button" role=${o} class="ac-segment"
                ...${{[s]:t===l.value?"true":"false"}}
                disabled=${!!l.disabled} onClick=${()=>n(l.value)}>
          ${l.icon?w`<${C} name=${l.icon} />`:null}
          <span>${l.label}</span>
        </button>`)}
    </div>`}var gt=["#3d6b63","#1f6f8b","#6b4fa0","#a14a2b","#2e7d32","#8a5a00","#9c2f5e","#45617d"];function Ma(e){let t=0;for(let a of e)t=t*31+a.codePointAt(0)>>>0;return gt[t%gt.length]}function ze({name:e,icon:t}){let[a,n]=Pe(!1);return t&&!a?w`
      <div class="ac-tile">
        <img src=${t} alt="" onError=${()=>n(!0)} />
      </div>`:w`
    <div class="ac-tile" style=${{background:Ma(e)}} aria-hidden="true">
      ${([...e][0]??"?").toUpperCase()}
    </div>`}function Me({project:e,verb:t,onOpen:a,actions:n}){return w`
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
    </div>`}function J({icon:e,title:t,meta:a,onOpen:n,selected:i,actions:o,badge:s}){return w`
    <div class=${`ac-row${n?" is-action":""}${i?" is-selected":""}`}>
      <div class="ac-row-icon" aria-hidden="true"><${C} name=${e} /></div>
      <div class="ac-row-body">
        ${n?w`<button type="button" class="ac-stretch ac-row-title"
                   aria-current=${i?"true":void 0}
                   onClick=${n}>${t}</button>`:w`<div class="ac-row-title">${t}</div>`}
        ${a?w`<div class="ac-row-meta">${a}</div>`:null}
      </div>
      ${s?w`<span class="ac-badge">${s}</span>`:null}
      ${o?w`<${ee} title=${t} label=${`Actions for ${t}`}
                 actions=${o} />`:null}
    </div>`}var Fa=[{key:"home",path:[],label:"Home",icon:"fa-solid fa-house"},{key:"apps",path:["apps"],label:"Apps",icon:"fa-solid fa-table-cells"},{key:"code",path:["code"],label:"Code",icon:"fa-solid fa-code"},{key:"data",path:["data"],label:"Data",icon:"fa-solid fa-database"},{key:"settings",path:["settings"],label:"Settings",icon:"fa-solid fa-gear"}];function Dt({section:e}){return Fa.map(t=>U`
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
        <${Dt} section=${e} />
      </nav>
      <main class="ac-main">${t}</main>
      <nav class="ac-bottomnav" aria-label="Main">
        <${Dt} section=${e} />
      </nav>
    </div>`}function D({title:e,subtitle:t,back:a,actions:n,subbar:i,fab:o,fill:s,children:l}){let[d,c]=ja(!1);return U`
    <section class="ac-screen" aria-labelledby="ac-screen-title">
      <header class=${`ac-appbar${a?"":" no-back"}${d?" is-scrolled":""}${i?" has-subbar":""}`}>
        ${a?U`<${H} icon="fa-solid fa-arrow-left" label="Back"
                   onClick=${()=>vt(a)} />`:null}
        <div class="ac-appbar-titles">
          <h1 class="ac-appbar-title" id="ac-screen-title">${e}</h1>
          ${t?U`<div class="ac-appbar-subtitle">${t}</div>`:null}
        </div>
        <div class="ac-appbar-actions">${n??null}</div>
      </header>
      ${i?U`<div class="ac-subbar">${i}</div>`:null}
      ${s?U`<div class="ac-content is-fill">${l}</div>`:U`
            <div class=${`ac-content${o?" has-fab":""}`}
                 onScroll=${r=>c(r.currentTarget.scrollTop>0)}>
              <div class="ac-content-inner">${l}</div>
            </div>`}
      ${o?U`
            <button type="button" class="ac-fab" aria-label=${o.label}
                    onClick=${o.onClick}>
              <${C} name=${o.icon} />
              <span class="ac-fab-label" aria-hidden="true">${o.label}</span>
            </button>`:null}
    </section>`}import*as P from"acelery/file.js";import{openDB as It}from"acelery/sql.js";var We="main.js",Ba=/^\w{1,16}$/;function Et(e){let t=(e??"").trim();return t?Ba.test(t)?null:"Letters, numbers and underscore only, 16 at most":"A name is required"}function Tt(e){return(e??"").length<=140?null:"140 characters at most"}function At(e){let t=e.trim();return t.charAt(0).toUpperCase()+t.slice(1)}function Lt(e,t){return JSON.stringify({name:e,description:t,entry:We})}function Pt(e){return`import { html, render, Panel } from "acelery/ui.js";

export default function main() {
  render(html\`
    <\${Panel} title="${e}">
      <p>Your app starts here.</p>
    <//>\`, document.body);
}
`}async function Mt(){let e=await It("acelery.db");try{await e.exec("create table if not exists config (cfg_key text unique, cfg_value text)");let t=await e.select("select cfg_key, cfg_value from config");return Object.fromEntries(t.map(a=>[a.cfg_key,a.cfg_value]))}finally{await e.close()}}async function jt(e){let t=await It("acelery.db");try{await t.exec("create table if not exists config (cfg_key text unique, cfg_value text)");for(let[a,n]of Object.entries(e))await t.exec("insert into config (cfg_key, cfg_value) values (?, ?) on conflict(cfg_key) do update set cfg_value = excluded.cfg_value",[a,n??""])}finally{await t.close()}}var Qe=null;function Ft(){return Qe??=P.externalStoragePath().catch(e=>{throw Qe=null,e}),Qe}async function K(){return await Ft()+"/aCelery/www/user/"}async function Ra(){return await Ft()+"/aCelery/"}function Ha(e,t){return typeof t!="string"||!/^[\w.-]+(\/[\w.-]+)*$/.test(t)||t.split("/").includes("..")?null:`/user/${encodeURIComponent(e)}/${t}`}async function Ve(e,t){t??=await K();try{let a=await P.open("acelery_app.json",t+e),n=await a.read();await a.close();let i=n?JSON.parse(n):{};return{description:typeof i.description=="string"?i.description:"",entry:typeof i.entry=="string"&&i.entry?i.entry:"main.js",icon:Ha(e,i.icon)}}catch{return{description:"",entry:"main.js",icon:null}}}async function ce(){let e=await K(),t=await P.listFiles("user",e.replace(/user\/$/,"")),a=[];for(let n of t)n.directory&&a.push({name:n.fname,...await Ve(n.fname,e)});return a.sort((n,i)=>n.name.localeCompare(i.name))}async function Bt(e){let t=await K();return(await P.listFiles("user",t.replace(/user\/$/,""))).some(n=>n.directory&&n.fname===e)}async function je(e){return(await P.listFiles(e,await K())).filter(a=>!a.directory).map(a=>({name:a.fname,length:a.length,modified:a.lastmodified})).sort((a,n)=>a.name.localeCompare(n.name))}async function Rt(e,t){let a=await P.open(t,await K()+e);try{return await a.read()}finally{await a.close()}}async function le(e,t,a){let n=await P.open(t,await K()+e);try{await n.write(a)}finally{await n.close()}}async function Ht(e,t){await(await P.open(t,await K()+e)).delete()}async function de(e){await(await P.open(e,await K())).delete()}async function Ot({name:e,description:t}){let a=At(e),n=await K();return await P.mkdir(a,n),await le(a,"acelery_app.json",Lt(a,t)),await le(a,We,Pt(a)),a}async function ge(){return(await P.listFiles("db",await Ra())).filter(t=>!t.directory&&!t.fname.includes("journal")).map(t=>({name:t.fname,length:t.length,modified:t.lastmodified})).sort((t,a)=>t.name.localeCompare(a.name))}async function _t(e){return(await ge()).some(t=>t.name===e)}function Fe(e){if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(e))throw new Error(`"${e}" is not a usable table name`);return e}function ue(){return!!globalThis.ACeleryHost}function ke(e){globalThis.ACeleryHost?.postMessage(JSON.stringify(e))}function fe(e){return typeof e!="number"||!Number.isFinite(e)?"":e<1024?`${e} B`:e<1024*1024?`${(e/1024).toFixed(e<10240?1:0)} KB`:`${(e/1024/1024).toFixed(1)} MB`}function qt(e){if(typeof e!="number"||!e)return"";let t=new Date(e);return t.toDateString()===new Date().toDateString()?t.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):t.toLocaleDateString([],{day:"numeric",month:"short",year:"numeric"})}import{html as W,useState as Nt,useEffect as Oa,Button as Ce}from"acelery/ui.js";import{runApp as Ut}from"acelery/export.js";function _a(e=new Date){let t=e.getHours();return t<5?"Working late":t<12?"Good morning":t<18?"Good afternoon":"Good evening"}var Kt=e=>t=>{t.button!==0||t.metaKey||t.ctrlKey||t.shiftKey||t.altKey||(t.preventDefault(),h(e))};function Gt({settings:e,updateSettings:t}){let[a,n]=Nt(null),[i,o]=Nt(null);Oa(()=>{let v=!0;return(async()=>{try{let[m,$]=await Promise.all([ce(),ge()]);if(!v)return;n({projects:m,databases:$});let y={},g=e["recent.project"];g&&!m.some(R=>R.name===g)&&(y["recent.project"]="",y["recent.file"]="");let x=e["recent.db"];x&&!$.some(R=>R.name===x)&&(y["recent.db"]=""),Object.keys(y).length&&t(y)}catch(m){if(!v)return;o(m),n({projects:[],databases:[]})}})(),()=>{v=!1}},[]);let s=a?.projects.find(v=>v.name===e["recent.project"]),l=s?e["recent.file"]:"",d=a?.databases.find(v=>v.name===e["recent.db"]),c=a?.projects.find(v=>v.name==="Example"),r=()=>{we("new-project"),h(["code"])},f=()=>{we("new-db"),h(["data"])},b;a?s||d?b=W`
      <div class="ac-continue">
        ${s?W`
              <div class="ac-continue-card">
                <${ze} name=${s.name} icon=${s.icon} />
                <div class="ac-row-body">
                  <div class="ac-row-title">${s.name}</div>
                  <div class="ac-row-meta">${l||s.description||"Project"}</div>
                </div>
                <div class="ac-button-row">
                  <${Ce} variant="outline-primary"
                    onClick=${()=>h(l?["code",s.name,l]:["code",s.name])}>
                    Open
                  <//>
                  <${Ce} variant="primary"
                    onClick=${()=>Ut(s.name,s.name,!0)}>
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
                     onClick=${()=>Ut(c.name,c.name,!1)}>
                <${C} name="fa-solid fa-play" /> Run the Example app
              <//>`:null}
          <${Ce} variant=${c?"outline-primary":"primary"} onClick=${r}>
            Create your first app
          <//>
        </div>
      </div>`:b=W`<${A} rows=${2} />`;let k=v=>v?String(v.length):"\u2013";return W`
    <${D} title=${W`
      <span class="ac-brand-inline">
        <span class="ac-brand-mark" aria-hidden="true"><${C} name="fa-solid fa-seedling" /></span>
        aCelery
      </span>`}>
      <${j} error=${i} onClose=${()=>o(null)} />
      <div class="ac-home">
        <div>
          <div class="ac-hero">
            <h2>${_a()}</h2>
            <p>Build and run your own JavaScript apps.</p>
          </div>
          <section class="ac-section" aria-label=${s||d?"Continue":"Get started"}>
            <h2 class="ac-section-title">${s||d?"Continue":"Get started"}</h2>
            ${b}
          </section>
        </div>
        <div>
          <section class="ac-section">
            <h2 class="ac-section-title">Create</h2>
            <div class="ac-quick">
              <button type="button" class="ac-quick-btn" onClick=${r}>
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
              <a class="ac-stat" href=${G(["apps"])} onClick=${Kt(["apps"])}>
                <span class="ac-stat-value">${k(a?.projects)}</span>
                <span class="ac-stat-label">${a?.projects.length===1?"app":"apps"}</span>
              </a>
              <a class="ac-stat" href=${G(["data"])} onClick=${Kt(["data"])}>
                <span class="ac-stat-value">${k(a?.databases)}</span>
                <span class="ac-stat-label">
                  ${a?.databases.length===1?"database":"databases"}
                </span>
              </a>
            </div>
          </section>
        </div>
      </div>
    <//>`}import{html as q,useState as Ye,useEffect as Ka,useCallback as Ga,Button as za}from"acelery/ui.js";import{runApp as Ja,exportProject as Wa}from"acelery/export.js";import{html as qa,useState as Na,useCallback as Ua,Modal as Se,Button as zt}from"acelery/ui.js";function _(){let[e,t]=Na(null),a=Ua((o,{title:s="aCelery",danger:l=!1,confirmLabel:d="OK",cancelLabel:c="Cancel",dismissValue:r=!1}={})=>new Promise(f=>t({message:o,title:s,danger:l,confirmLabel:d,cancelLabel:c,dismissValue:r,resolve:f})),[]),n=o=>{e?.resolve(o),t(null)},i=e?qa`
        <${Se} show onHide=${()=>n(e.dismissValue)} centered>
          <${Se.Header} closeButton>
            <${Se.Title} as="h2" className="fs-5">${e.title}<//>
          <//>
          <${Se.Body}>${e.message}<//>
          <${Se.Footer}>
            <${zt} variant="outline-secondary" onClick=${()=>n(!1)}>
              ${e.cancelLabel}
            <//>
            <${zt} variant=${e.danger?"danger":"primary"}
                       onClick=${()=>n(!0)}>
              ${e.confirmLabel}
            <//>
          <//>
        <//>`:null;return{confirm:a,dialog:i}}var Xe=6;function Ze({value:e,onChange:t,label:a}){return q`
    <div class="ac-search" role="search">
      <${C} name="fa-solid fa-magnifying-glass" />
      <input type="search" class="form-control" aria-label=${a}
             placeholder=${a} value=${e}
             onInput=${n=>t(n.currentTarget.value)} />
    </div>`}function et(e,t){let a=t.trim().toLowerCase();return!a||e.name.toLowerCase().includes(a)||e.description.toLowerCase().includes(a)}async function xe(e,t){return e(`${t} and all of its files will be deleted. This cannot be undone.`,{title:`Delete ${t}?`,danger:!0,confirmLabel:"Delete"})}function Jt({settings:e,updateSettings:t}){let[a,n]=Ye(null),[i,o]=Ye(null),[s,l]=Ye(""),d=O(),{confirm:c,dialog:r}=_(),f=Ga(async()=>{try{n(await ce())}catch(v){o(v),n([])}},[]);Ka(()=>{f()},[f]);async function b(v){if(await xe(c,v.name))try{await de(v.name),e["recent.project"]===v.name&&t({"recent.project":"","recent.file":""}),d(`Deleted ${v.name}`),await f()}catch(m){o(m)}}let k;if(a===null)k=q`<${A} rows=${4} grid />`;else if(!a.length)k=q`
      <${M} icon="fa-solid fa-table-cells" title="No apps yet"
        action=${q`
          <${za} variant="primary"
            onClick=${()=>{we("new-project"),h(["code"])}}>
            Create an app
          <//>`}>
        An app is a folder of JavaScript you write in Code.
      <//>`;else{let v=a.filter(m=>et(m,s));k=q`
      ${a.length>Xe?q`<div class="ac-toolbar">
            <${Ze} label="Search apps" value=${s} onChange=${l} />
          </div>`:null}
      ${v.length?q`
            <div class="ac-grid">
              ${v.map(m=>q`
                <${Me} key=${m.name} project=${m} verb="Run"
                  onOpen=${()=>Ja(m.name,m.name,!1)}
                  actions=${[{label:"Edit in Code",icon:"fa-solid fa-pen-to-square",onSelect:()=>h(["code",m.name])},{label:"Export",icon:"fa-solid fa-file-export",onSelect:()=>Wa(m.name)},{label:"Delete",icon:"fa-solid fa-trash",danger:!0,onSelect:()=>b(m)}]} />`)}
            </div>`:q`<p class="text-body-secondary px-1">Nothing matches “${s}”.</p>`}`}return q`
    <${D} title="Apps">
      <${j} error=${i} onClose=${()=>o(null)} />
      ${k}
    <//>
    ${r}`}import{html as B,useState as Be,useEffect as Qa,useCallback as Va,Button as tt,Modal as Wt,Form as Ya,Input as Qt,notEmpty as Xa}from"acelery/ui.js";import{runApp as Za,exportProject as en,importProject as tn}from"acelery/export.js";function an({show:e,existing:t,onClose:a,onCreate:n}){let i=o=>{let s=(o??"").trim().toLowerCase();return t.some(l=>l.name.toLowerCase()===s)?"A project with that name already exists":!0};return B`
    <${se} show=${e} onHide=${a} title="New project">
      <${Ya} initial=${{name:"",description:""}} onSubmit=${n}>
        <${Wt.Body}>
          <${Qt} label="Name" name="name"
            placeholder="Letters and numbers, 16 max"
            autocapitalize="off" autocomplete="off" spellcheck=${!1}
            validate=${[Xa("A name is required"),o=>Et(o)??!0,i]} />
          <${Qt} label="Description" name="description" as="textarea"
            placeholder="What it does, in a sentence (optional)"
            validate=${[o=>Tt(o)??!0]} />
        <//>
        <${Wt.Footer}>
          <${tt} variant="outline-secondary" type="button" onClick=${a}>
            Cancel
          <//>
          <${tt} variant="primary" type="submit">Create project<//>
        <//>
      <//>
    <//>`}function Vt({settings:e,updateSettings:t}){let[a,n]=Be(null),[i,o]=Be(null),[s,l]=Be(""),[d,c]=Be(()=>Te("new-project")),r=O(),{confirm:f,dialog:b}=_(),k=Va(async()=>{try{n(await ce())}catch(y){o(y),n([])}},[]);Qa(()=>{k()},[k]);async function v(y){c(!1);try{let g=await Ot(y);r(`Created ${g}`),h(["code",g,"main.js"])}catch(g){o(g)}}async function m(y){if(await xe(f,y.name))try{await de(y.name),e["recent.project"]===y.name&&t({"recent.project":"","recent.file":""}),r(`Deleted ${y.name}`),await k()}catch(g){o(g)}}let $;if(a===null)$=B`<${A} rows=${4} grid />`;else if(!a.length)$=B`
      <${M} icon="fa-solid fa-folder" title="No projects yet"
        action=${B`
          <${tt} variant="primary" onClick=${()=>c(!0)}>
            New project
          <//>`}>
        A project is a folder holding an app's JavaScript, CSS and manifest.
      <//>`;else{let y=a.filter(g=>et(g,s));$=B`
      ${a.length>Xe?B`<div class="ac-toolbar">
            <${Ze} label="Search projects" value=${s} onChange=${l} />
          </div>`:null}
      ${y.length?B`
            <div class="ac-grid">
              ${y.map(g=>B`
                <${Me} key=${g.name} project=${g} verb="Open"
                  onOpen=${()=>h(["code",g.name])}
                  actions=${[{label:"Run",icon:"fa-solid fa-play",onSelect:()=>Za(g.name,g.name,!0)},{label:"Export",icon:"fa-solid fa-file-export",onSelect:()=>en(g.name)},{label:"Delete",icon:"fa-solid fa-trash",danger:!0,onSelect:()=>m(g)}]} />`)}
            </div>`:B`<p class="text-body-secondary px-1">Nothing matches “${s}”.</p>`}`}return B`
    <${D} title="Code"
      actions=${ue()?B`<${H} icon="fa-solid fa-file-import" label="Import project"
                 onClick=${tn} />`:null}
      fab=${{icon:"fa-solid fa-plus",label:"New project",onClick:()=>c(!0)}}>
      <${j} error=${i} onClose=${()=>o(null)} />
      ${$}
    <//>
    <${an} show=${d} existing=${a??[]}
      onClose=${()=>c(!1)} onCreate=${v} />
    ${b}`}import{html as S,useState as Q,useEffect as te,useRef as $e,useCallback as Yt,Button as me,Modal as Xt,Form as nn,Input as on,Select as rn,notEmpty as sn}from"acelery/ui.js";import{runApp as ln,exportProject as cn}from"acelery/export.js";var Re=e=>e.includes(".")?e.split(".").pop().toLowerCase():"",at={js:"JavaScript",mjs:"JavaScript",json:"JSON",css:"CSS",html:"HTML",htm:"HTML",xml:"XML",svg:"SVG",md:"Markdown",txt:"Text"},Zt=new Set(["png","jpg","jpeg","gif","webp","bmp","ico"]),dn=new Set(["zip","woff","woff2","ttf","otf","mp3","mp4","pdf","db"]);function un(e){let t=Re(e);return Zt.has(t)?"fa-solid fa-file-image":["md","txt"].includes(t)?"fa-solid fa-file-lines":at[t]?"fa-solid fa-file-code":"fa-solid fa-file"}function fn(e){let t=Re(e);return Zt.has(t)?"image":dn.has(t)?"binary":"text"}function $n({show:e,project:t,existing:a,onClose:n,onCreate:i}){return S`
    <${se} show=${e} onHide=${n} title=${`New file in ${t}`}>
      <${nn} initial=${{name:"",type:".js"}} onSubmit=${i}>
        <${Xt.Body}>
          <${on} label="Name" name="name" placeholder="File name without extension"
            autocapitalize="off" autocomplete="off" spellcheck=${!1}
            validate=${[sn("A name is required"),o=>/^[\w.-]+$/.test((o??"").trim())?!0:"Letters, numbers, dot, dash and underscore only"]} />
          <${rn} label="Type" name="type" options=${[{label:"JavaScript",value:".js"},{label:"CSS",value:".css"}]} />
        <//>
        <${Xt.Footer}>
          <${me} variant="outline-secondary" type="button" onClick=${n}>
            Cancel
          <//>
          <${me} variant="primary" type="submit"
            onClick=${o=>{let s=o.currentTarget.form,l=`${s.elements.name.value.trim()}${s.elements.type.value}`;a.some(d=>d.name===l)&&(o.preventDefault(),i({duplicate:l}))}}>
            Create file
          <//>
        <//>
      <//>
    <//>`}function ea({project:e,fileName:t,editorTheme:a,settings:n,updateSettings:i}){let o=Ge(Ct),s=O(),{confirm:l,dialog:d}=_(),[c,r]=Q("loading"),[f,b]=Q([]),[k,v]=Q(null),[m,$]=Q(null),[y,g]=Q(!1),[x,R]=Q(null),[oe,he]=Q(!1),[De,ve]=Q(!1),ie=$e(null),T=$e(null),L=$e(!1),V=$e(null);V.current=x;let rt=$e(a);rt.current=a;let re=u=>{L.current=u,he(u)},st=Yt(async()=>{b(await je(e))},[e]);te(()=>{let u=!0;return(async()=>{try{if(!await Bt(e)){u&&r("missing");return}let[E,I]=await Promise.all([je(e),Ve(e)]);if(!u)return;b(E),v(I),r("ready")}catch(E){if(!u)return;$(E),r("ready")}})(),()=>{u=!1}},[e]),te(()=>{c==="ready"&&!t&&n["recent.project"]!==e&&i({"recent.project":e,"recent.file":""})},[c,e,t]),te(()=>{if(R(null),c!=="ready"||!t)return;let u=!0;return(async()=>{try{let E=await je(e);if(!u)return;if(!E.some(wa=>wa.name===t)){R({name:t,kind:"missing"});return}let I=fn(t),qe=I==="text"?await Rt(e,t):null;if(!u)return;R({name:t,kind:I,text:qe}),i({"recent.project":e,"recent.file":t})}catch(E){u&&$(E)}})(),()=>{u=!1}},[e,t,c]);let ye=Yt(async()=>{let u=T.current,E=V.current;if(!u||E?.kind!=="text")return!0;let I=u.getValue();ve(!0);try{return await le(e,E.name,I),T.current===u&&u.getValue()===I&&re(!1),!0}catch(qe){return $(qe),!1}finally{ve(!1)}},[e]),Ee=$e(ye);Ee.current=ye,te(()=>{if(x?.kind!=="text"||!ie.current)return;let u=x.name,E=globalThis.aceleryEditor.createEditor(ie.current,{value:x.text,filename:u,theme:rt.current,onChange:()=>{L.current||re(!0)},onSave:()=>Ee.current()});return T.current=E,re(!1),()=>{L.current&&(le(e,u,E.getValue()).catch(I=>console.error(`aCelery: could not save ${u}`,I)),L.current=!1),E.destroy(),T.current===E&&(T.current=null)}},[x]),te(()=>{T.current?.setTheme(a)},[a]),te(()=>(globalThis.forceSaveFile=()=>{L.current&&Ee.current()},()=>{delete globalThis.forceSaveFile}),[]),te(()=>ht(async()=>{if(!L.current)return!0;let u=await l(`Save your changes to ${V.current?.name??"this file"} before leaving?`,{title:"Unsaved changes",confirmLabel:"Save",cancelLabel:"Discard",dismissValue:null});return u===null?!1:u?Ee.current():(re(!1),!0)}),[l]);async function ha(){L.current&&!await ye()||ln(e,e,!0)}async function va(){L.current&&!await ye()||cn(e)}async function ya(u){if(u.duplicate){$(new Error(`${u.duplicate} already exists in ${e}`)),g(!1);return}g(!1);let E=u.name.trim()+u.type;try{await le(e,E,""),await st(),h(["code",e,E],{replace:o&&!!t})}catch(I){$(I)}}async function lt(u){if(await l(`${u} will be deleted from ${e}. This cannot be undone.`,{title:`Delete ${u}?`,danger:!0,confirmLabel:"Delete"}))try{u===t&&re(!1),await Ht(e,u),await st(),s(`Deleted ${u}`),u===t&&h(["code",e],{replace:!0})}catch(I){$(I)}}async function ba(){if(await xe(l,e))try{re(!1),await de(e),n["recent.project"]===e&&i({"recent.project":"","recent.file":""}),s(`Deleted ${e}`),h(["code"],{replace:!0})}catch(u){$(u)}}let ct=u=>h(["code",e,u],{replace:o&&!!t});if(c==="missing")return S`
      <${D} title=${e} back=${["code"]}>
        <${z} what="Project" action=${S`
          <${me} variant="primary" onClick=${()=>h(["code"],{replace:!0})}>
            All projects
          <//>`} />
      <//>`;if(c==="loading")return S`
      <${D} title=${e} back=${["code"]}>
        <${A} rows=${4} />
      <//>`;let Y=!!t,dt=S`<${j} error=${m} onClose=${()=>$(null)} />`,ut=f.length?S`
        <div class="ac-list">
          ${f.map(u=>S`
            <${J} key=${u.name} icon=${un(u.name)} title=${u.name}
              meta=${`${at[Re(u.name)]??"File"} \xB7 ${fe(u.length)}`}
              badge=${u.name===k?.entry?"entry":null}
              selected=${u.name===t}
              onOpen=${()=>ct(u.name)}
              actions=${[{label:"Delete",icon:"fa-solid fa-trash",danger:!0,onSelect:()=>lt(u.name)}]} />`)}
        </div>`:S`
        <${M} icon="fa-solid fa-file-code" title="No files yet"
          action=${S`<${me} variant="primary" onClick=${()=>g(!0)}>
            New file
          <//>`}>
          Add a JavaScript file for the app to run.
        <//>`,X;if(Y)x?x.kind==="missing"?X=S`
      <${z} what="File" action=${S`
        <${me} variant="primary"
          onClick=${()=>h(["code",e],{replace:!0})}>
          Back to ${e}
        <//>`} />`:x.kind==="image"?X=S`
      <div class="ac-preview">
        <img alt=${x.name}
          src=${`/user/${encodeURIComponent(e)}/${encodeURIComponent(x.name)}`} />
      </div>`:x.kind==="binary"?X=S`
      <${M} icon="fa-solid fa-file" title="Not a text file">
        ${x.name} can't be edited here.
      <//>`:X=S`
      <div class="ac-editor-host"><div class="ac-editor-mount" ref=${ie}></div></div>
      <div class="ac-status">
        <span>${at[Re(x.name)]??"Text"}</span>
        <span role="status">${De?"Saving\u2026":oe?"Unsaved changes":"Saved"}</span>
      </div>`:X=S`<div class="ac-empty" aria-busy="true"><p>Opening ${t}…</p></div>`;else{let u=f.find(E=>E.name===k?.entry);X=S`
      <${M} icon="fa-solid fa-file-code" title="Pick a file"
        action=${u?S`<${me} variant="outline-primary" onClick=${()=>ct(u.name)}>
              Open ${u.name}
            <//>`:null}>
        Choose a file from the list to edit it.
      <//>`}let ft=Y?S`${t}${oe?S`<span class="ac-dirty" role="img" aria-label="unsaved changes"></span>`:null}`:e,$t=S`
    ${x?.kind==="text"?S`<${H} icon="fa-solid fa-floppy-disk" label="Save"
               disabled=${!oe||De} onClick=${ye} />`:null}
    <${H} icon="fa-solid fa-play" label=${`Run ${e}`} primary onClick=${ha} />
    <${ee} title=${Y?t:e} actions=${[{label:"New file",icon:"fa-solid fa-plus",onSelect:()=>g(!0)},{label:"Export project",icon:"fa-solid fa-file-export",onSelect:va},Y&&{label:`Delete ${t}`,icon:"fa-solid fa-trash",danger:!0,onSelect:()=>lt(t)},{label:"Delete project",icon:"fa-solid fa-trash",danger:!0,onSelect:ba}]} />`,mt=S`
    <${$n} show=${y} project=${e} existing=${f}
      onClose=${()=>g(!1)} onCreate=${ya} />
    ${d}`;return!o&&!Y?S`
      <${D} title=${ft} subtitle=${k?.description||null} back=${["code"]}
        actions=${$t}
        fab=${{icon:"fa-solid fa-plus",label:"New file",onClick:()=>g(!0)}}>
        ${dt}
        <h2 class="ac-section-title">Files</h2>
        ${ut}
      <//>
      ${mt}`:S`
    <${D} title=${ft} subtitle=${Y?e:k?.description||null}
      back=${Y?["code",e]:["code"]} actions=${$t} fill>
      <div class="ac-split">
        ${o?S`
              <aside class="ac-sidebar" aria-label="Files">
                <div class="ac-sidebar-head">
                  <h2 class="ac-section-title">Files</h2>
                  <${H} icon="fa-solid fa-plus" label="New file"
                    onClick=${()=>g(!0)} />
                </div>
                ${ut}
              </aside>`:null}
        <div class="ac-pane">
          ${dt}
          ${X}
        </div>
      </div>
    <//>
    ${mt}`}import{html as ae,useState as nt,useEffect as mn,useCallback as pn,Button as ot,Modal as ta,Form as hn,Input as vn,notEmpty as yn}from"acelery/ui.js";import{openDB as bn,deleteDB as wn}from"acelery/sql.js";function gn({show:e,existing:t,onClose:a,onCreate:n}){return ae`
    <${se} show=${e} onHide=${a} title="New database">
      <${hn} initial=${{name:""}} onSubmit=${n}>
        <${ta.Body}>
          <${vn} label="Name" name="name" placeholder="Database name without extension"
            autocapitalize="off" autocomplete="off" spellcheck=${!1}
            help="Saved as a SQLite file ending in .db."
            validate=${[yn("A name is required"),i=>/^[\w-]+$/.test((i??"").trim())?!0:"Letters, numbers, dash and underscore only",i=>t.some(o=>o.name===`${(i??"").trim()}.db`)?"A database with that name already exists":!0]} />
        <//>
        <${ta.Footer}>
          <${ot} variant="outline-secondary" type="button" onClick=${a}>
            Cancel
          <//>
          <${ot} variant="primary" type="submit">Create database<//>
        <//>
      <//>
    <//>`}function aa({settings:e,updateSettings:t}){let[a,n]=nt(null),[i,o]=nt(null),[s,l]=nt(()=>Te("new-db")),d=O(),{confirm:c,dialog:r}=_(),f=pn(async()=>{try{n(await ge())}catch(m){o(m),n([])}},[]);mn(()=>{f()},[f]);async function b({name:m}){l(!1);let $=`${m.trim()}.db`;try{await(await bn($)).close(),d(`Created ${$}`),h(["data",$])}catch(y){o(y)}}async function k(m){if(await c(`${m} and every table in it will be deleted. This cannot be undone.`,{title:`Delete ${m}?`,danger:!0,confirmLabel:"Delete"}))try{await wn(m),e["recent.db"]===m&&t({"recent.db":""}),d(`Deleted ${m}`),await f()}catch(y){o(y)}}let v;return a===null?v=ae`<${A} rows=${3} />`:a.length?v=ae`
      <div class="ac-list">
        ${a.map(m=>ae`
          <${J} key=${m.name} icon="fa-solid fa-database" title=${m.name}
            meta=${[fe(m.length),qt(m.modified)].filter(Boolean).join(" \xB7 ")}
            badge=${m.name==="acelery.db"?"settings":null}
            onOpen=${()=>h(["data",m.name])}
            actions=${[{label:"Delete",icon:"fa-solid fa-trash",danger:!0,onSelect:()=>k(m.name)}]} />`)}
      </div>`:v=ae`
      <${M} icon="fa-solid fa-database" title="No databases yet"
        action=${ae`
          <${ot} variant="primary" onClick=${()=>l(!0)}>
            New database
          <//>`}>
        A database is a SQLite file your apps read and write.
      <//>`,ae`
    <${D} title="Data"
      fab=${{icon:"fa-solid fa-plus",label:"New database",onClick:()=>l(!0)}}>
      <${j} error=${i} onClose=${()=>o(null)} />
      ${v}
    <//>
    <${gn} show=${s} existing=${a??[]}
      onClose=${()=>l(!1)} onCreate=${b} />
    ${r}`}import{html as p,useState as N,useEffect as He,useCallback as kn,useMemo as Cn,Button as pe,Dropdown as ne,Table as na,CheckBox as Sn,TableMaint as xn}from"acelery/ui.js";import{openDB as Dn,deleteDB as En}from"acelery/sql.js";var Oe=(e,t,a=`${t}s`)=>`${e} ${e===1?t:a}`,Tn=["INT","DOU","REA","FLO","NUM","DEC","BOO","DAT"],An=`create table new_table (
  id integer primary key,
  name text not null
)`,Ln=200;function oa({dbName:e,parts:t,settings:a,updateSettings:n}){let[i,o]=N(null),[s,l]=N("loading"),[d,c]=N(null),[r,f]=N(""),[b,k]=N(null),[v,m]=N([]),$=O(),{confirm:y,dialog:g}=_();He(()=>{let T=!0,L=null;return(async()=>{try{if(!await _t(e)){T&&l("missing");return}if(L=await Dn(e),!T)return;o(L),l("ready"),a["recent.db"]!==e&&n({"recent.db":e})}catch(V){if(!T)return;c(V),l("ready")}})(),()=>{T=!1,L?.close().catch(()=>{})}},[e]);async function x(){if(await y(`${e} and every table in it will be deleted. This cannot be undone.`,{title:`Delete ${e}?`,danger:!0,confirmLabel:"Delete"}))try{await i?.close(),await En(e),a["recent.db"]===e&&n({"recent.db":""}),$(`Deleted ${e}`),h(["data"],{replace:!0})}catch(L){c(L)}}async function R(T){if(!await y(`The table ${T} and all of its rows will be deleted. This cannot be undone.`,{title:`Drop ${T}?`,danger:!0,confirmLabel:"Drop table"}))return!1;try{return await i.exec(`drop table ${Fe(T)}`),$(`Dropped ${T}`),!0}catch(V){return c(V),!1}}let[oe,he,De]=t,ve=p`<${j} error=${d} onClose=${()=>c(null)} />`;if(s==="missing")return p`
      <${D} title=${e} back=${["data"]}>
        <${z} what="Database" action=${p`
          <${pe} variant="primary" onClick=${()=>h(["data"],{replace:!0})}>
            All databases
          <//>`} />
      <//>`;if(oe==="table"&&he)return p`
      <${In} db=${i} dbName=${e} table=${he} structure=${De==="structure"}
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
      ${i?ie==="sql"?p`<${Mn} db=${i} sql=${r} setSql=${f}
                   result=${b} setResult=${k}
                   history=${v} setHistory=${m} />`:p`<${Pn} db=${i} dbName=${e} onError=${c}
                   onDrop=${R}
                   onCreate=${()=>{f(An),k(null),h(["data",e,"sql"],{replace:!0})}} />`:s==="loading"?p`<${A} rows=${3} />`:null}
    <//>
    ${g}`}function Pn({db:e,dbName:t,onError:a,onDrop:n,onCreate:i}){let[o,s]=N(null),[l,d]=N({}),c=kn(async()=>{try{let r=await e.select("select name from sqlite_master where type = ? order by name",["table"]);s(r.map(f=>f.name))}catch(r){a(r),s([])}},[e]);return He(()=>{c()},[c]),He(()=>{if(!o)return;let r=!0;return(async()=>{for(let f of o){if(!r)return;try{Fe(f);let b=await e.select(`PRAGMA table_info(${f})`),k=await e.selectOne(`select count(*) as n from ${f}`);r&&d(v=>({...v,[f]:{columns:b.length,rows:k?.n??0}}))}catch{}}})(),()=>{r=!1}},[o]),o===null?p`<${A} rows=${3} />`:o.length?p`
    <div class="ac-list">
      ${o.map(r=>{let f=l[r];return p`
          <${J} key=${r} icon="fa-solid fa-table" title=${r}
            meta=${f?`${Oe(f.columns,"column")} \xB7 ${Oe(f.rows,"row")}`:"\xA0"}
            onOpen=${()=>h(["data",t,"table",r])}
            actions=${[{label:"Structure",icon:"fa-solid fa-table-columns",onSelect:()=>h(["data",t,"table",r,"structure"])},{label:"Drop table",icon:"fa-solid fa-trash",danger:!0,onSelect:async()=>{await n(r)&&c()}}]} />`})}
    </div>`:p`
      <${M} icon="fa-solid fa-table" title="No tables yet"
        action=${p`<${pe} variant="primary" onClick=${i}>Create a table<//>`}>
        Start from a template in the SQL tab.
      <//>`}function In({db:e,dbName:t,table:a,structure:n,error:i,onError:o,onDrop:s}){let[l,d]=N(null),[c,r]=N(()=>new Set);He(()=>{if(!e)return;let $=!0;return(async()=>{try{Fe(a);let y=await e.select(`PRAGMA table_info(${a})`);$&&d(y)}catch(y){if(!$)return;o(y),d([])}})(),()=>{$=!1}},[e,a]);let f=Cn(()=>(l??[]).map($=>({type:Tn.some(y=>String($.type).toUpperCase().includes(y))?"number":"string",title:$.name,name:$.name,inList:!c.has($.name),inSearch:!0})),[l,c]),b=($,y)=>r(g=>{let x=new Set(g);return y?x.delete($):x.add($),x}),k=p`<${ee} title=${a} actions=${[n?{label:"Browse rows",icon:"fa-solid fa-table",onSelect:()=>h(["data",t,"table",a],{replace:!0})}:{label:"Structure",icon:"fa-solid fa-table-columns",onSelect:()=>h(["data",t,"table",a,"structure"])},{label:"Drop table",icon:"fa-solid fa-trash",danger:!0,onSelect:s}]} />`,v=!n&&l?.length?p`
        <${ne} autoClose="outside" align="end" className="ac-over">
          <${ne.Toggle} as="button" type="button" bsPrefix="ac-chip"
                              aria-label="Choose columns">
            <${C} name="fa-solid fa-table-columns" />
            <span class="d-none d-md-inline">Columns</span>
          <//>
          <${ne.Menu} className="ac-columns-menu" popperConfig=${{strategy:"fixed"}}>
            ${l.map($=>p`
              <${Sn} key=${$.name} label=${$.name} className="mb-2"
                checked=${!c.has($.name)}
                onChange=${y=>b($.name,y)} />`)}
          <//>
        <//>`:null,m;return!e||l===null?m=p`<${A} rows=${4} />`:l.length?n?m=p`
      <div class="ac-results">
        <${na} hover size="sm">
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
      <${xn} key=${f.filter($=>$.inList).map($=>$.name).join("|")}
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
    <//>`}function Mn({db:e,sql:t,setSql:a,result:n,setResult:i,history:o,setHistory:s}){async function l(){let c=t.trim();if(!c)return;let r=performance.now(),f=()=>Math.max(0,Math.round(performance.now()-r));try{if(/^(select|pragma|with|explain)\b/i.test(c)){let b=await e.select(c);i({kind:"rows",rows:b,ms:f(),limit:Ln})}else if(/^insert\b/i.test(c)){let b=await e.insert(c);i({kind:"text",text:`Inserted row ${b}`,ms:f()})}else{let b=await e.exec(c);i({kind:"text",text:`${Oe(b,"row")} changed`,ms:f()})}s(b=>[c,...b.filter(k=>k!==c)].slice(0,10))}catch(b){i({kind:"error",text:b.message??String(b)})}}let d=null;return n?.kind==="error"?d=p`<${j} error=${n.text} onClose=${()=>i(null)} />`:n?.kind==="text"?d=p`<div class="ac-results-meta" role="status">${n.text} · ${n.ms} ms</div>`:n?.kind==="rows"&&(d=p`<${jn} result=${n}
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
    </div>`}function jn({result:e,onShowAll:t}){let{rows:a,ms:n,limit:i}=e;if(!a.length)return p`<div class="ac-results-meta" role="status">No rows · ${n} ms</div>`;let o=[...new Set(a.flatMap(l=>Object.keys(l)))],s=a.slice(0,i);return p`
    <div class="ac-results-meta" role="status">
      ${Oe(a.length,"row")} · ${n} ms
    </div>
    <div class="ac-results">
      <${na} hover size="sm">
        <thead>
          <tr>${o.map(l=>p`<th key=${l} scope="col">${l}</th>`)}</tr>
        </thead>
        <tbody>
          ${s.map((l,d)=>p`
            <tr key=${d}>
              ${o.map(c=>{let r=l[c];return p`
                  <td key=${c} class=${typeof r=="number"?"ac-num":""}
                      title=${r==null?void 0:String(r)}>
                    ${r==null?p`<span class="ac-null">NULL</span>`:String(r)}
                  </td>`})}
            </tr>`)}
        </tbody>
      <//>
    </div>
    ${a.length>s.length?p`<div>
          <${pe} variant="outline-secondary" onClick=${t}>
            Show all ${a.length}
          <//>
        </div>`:null}`}import{html as _e,useState as Fn,THEMES as Bn,applyTheme as ia,currentTheme as ra,currentMode as Rn,themeHasModes as Hn,isDark as sa}from"acelery/ui.js";import{EDITOR_THEMES as On,isDarkTheme as _n}from"acelery/editor.js";var qn=e=>e.charAt(0).toUpperCase()+e.slice(1),la=e=>e==="acelery"?"aCelery":qn(e),ca="acelery.keepAwake";function Nn(){try{return sessionStorage.getItem(ca)==="1"}catch{return!1}}function Un(e){try{sessionStorage.setItem(ca,e?"1":"0")}catch{}}function da({settings:e,updateSettings:t}){let[a,n]=Fn(Nn),i=ra(),o=Hn(i),s=e.editortheme??"";function l(r){t({theme:ia(r)})}function d(r){ia(ra(),{mode:r}),t({"theme.mode":r})}function c(r){n(r),Un(r),ke({action:"setKeepAwake",on:r})}return _e`
    <${D} title="Settings">
      <section class="ac-section" aria-labelledby="settings-appearance">
        <h2 class="ac-section-title" id="settings-appearance">Appearance</h2>
        <div class="ac-list">
          <div class="ac-setting">
            <div class="ac-setting-label">
              <span class="ac-setting-name" id="settings-mode">Mode</span>
              <div class="ac-setting-help">
                ${o?"Follow the device, or always light or dark.":`${la(i)} is always ${sa()?"dark":"light"}.`}
              </div>
            </div>
            <${Ie} role="radiogroup" label="Mode"
              value=${o?Rn():sa()?"dark":"light"}
              onChange=${d}
              options=${[{value:"system",label:"System",icon:"fa-solid fa-circle-half-stroke",disabled:!o},{value:"light",label:"Light",icon:"fa-solid fa-sun",disabled:!o},{value:"dark",label:"Dark",icon:"fa-solid fa-moon",disabled:!o}]} />
          </div>
          <div class="ac-setting">
            <div class="ac-setting-label">
              <label for="settings-theme">Theme</label>
              <div class="ac-setting-help">aCelery and Default follow Mode.</div>
            </div>
            <select id="settings-theme" class="form-select" value=${i}
                    onChange=${r=>l(r.currentTarget.value)}>
              ${Bn.map(r=>_e`<option key=${r} value=${r}>${la(r)}</option>`)}
            </select>
          </div>
          <div class="ac-setting">
            <div class="ac-setting-label">
              <label for="settings-editor">Editor colours</label>
              <div class="ac-setting-help">
                ${s?`A ${_n(s)?"dark":"light"} scheme, whatever the mode.`:"Light or dark, to match the app."}
              </div>
            </div>
            <select id="settings-editor" class="form-select" value=${s}
                    onChange=${r=>t({editortheme:r.currentTarget.value})}>
              ${On.map(r=>_e`<option key=${r.value} value=${r.value}>${r.label}</option>`)}
            </select>
          </div>
        </div>
      </section>

      ${ue()?_e`
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
                      onChange=${r=>c(r.currentTarget.checked)} />
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
    <//>`}var ma=Promise.resolve();function Wn(e){let t=ma.then(()=>jt(e));return ma=t.catch(a=>console.error("aCelery: could not save settings",a)),t}function Qn(e){let t=String(e).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);return t?"#"+t.slice(1,4).map(a=>Number(a).toString(16).padStart(2,"0")).join(""):null}function it(){ue()&&requestAnimationFrame(()=>{let e=document.querySelector(".ac-appbar")??document.body,t=Qn(getComputedStyle(e).backgroundColor);ke({action:"setChrome",dark:pa(),...t?{color:t}:{}})})}function Vn(){let e=yt(),[t,a]=ua(null),[,n]=ua(0);fa(()=>{Mt().then(f=>{$a(f.theme||"acelery",{mode:f["theme.mode"]||"system"}),a(f)},f=>{console.error("aCelery: could not read settings",f),$a("acelery",{mode:"system"}),a({})})},[]),fa(()=>{let f=()=>{n(k=>k+1),it()};document.addEventListener("acelery:themechange",f);let b=document.getElementById("xbtheme");return b?.addEventListener("load",it),()=>{document.removeEventListener("acelery:themechange",f),b?.removeEventListener("load",it)}},[]);let i=Gn(f=>{a(b=>({...b,...f})),Wn(f)},[]);if(!t)return F`
      <${Je} section=${e.section}>
        <${D} title="aCelery"><${A} rows=${3} /><//>
      <//>`;let o=t.editortheme,s=o&&Jn.some(f=>f.value===o)?o:pa()?"dark":"light",{section:l,parts:d}=e,c={settings:t,updateSettings:i},r;switch(l){case"home":r=F`<${Gt} ...${c} />`;break;case"apps":r=F`<${Jt} ...${c} />`;break;case"code":r=d[0]?F`<${ea} key=${d[0]} project=${d[0]} fileName=${d[1]}
                 editorTheme=${s} ...${c} />`:F`<${Vt} ...${c} />`;break;case"data":r=d[0]?F`<${oa} key=${d[0]} dbName=${d[0]}
                 parts=${d.slice(1)} ...${c} />`:F`<${aa} ...${c} />`;break;case"settings":r=F`<${da} ...${c} />`;break;default:r=F`
        <${D} title="Not found">
          <${z} what="Page" action=${F`
            <${zn} variant="primary" onClick=${()=>h([],{replace:!0})}>
              Go home
            <//>`} />
        <//>`}return F`
    <${xt}>
      <${Je} section=${l}>${r}<//>
    <//>`}function Yn(e=document.body){bt(),Kn(F`<${Vn} />`,e)}export{Yn as default};
