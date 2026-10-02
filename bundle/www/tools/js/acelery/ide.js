import{html as N,render as vo,useState as Ea,useEffect as Aa,useCallback as yo,Button as bo,applyTheme as Ta,isDark as Pa}from"acelery/ui.js";import{EDITOR_THEMES as wo}from"acelery/editor.js";import{html as ne,useState as Ya}from"acelery/ui.js";import{useState as Ha,useEffect as _a}from"acelery/ui.js";function qa(e){let t=String(e??"").replace(/^#\/?/,"").split("/").filter(Boolean).map(Na);return{section:t[0]??"home",parts:t.slice(1)}}function Na(e){try{return decodeURIComponent(e)}catch{return e}}function se(e){return"#/"+e.map(t=>encodeURIComponent(t)).join("/")}var Te=()=>window.location.hash||"#/",at=new Set;function nt(){for(let e of at)e(Te())}var At=!1;function Ua(){At||(At=!0,window.addEventListener("popstate",nt),window.addEventListener("hashchange",nt))}var pe=null;function Tt(e){return pe=e,()=>{pe===e&&(pe=null)}}async function y(e,{replace:t=!1}={}){let a=se(e);a!==Te()&&(pe&&!await pe()||(t?window.history.replaceState({from:window.history.state?.from??null},"",a):window.history.pushState({from:Te()},"",a),nt()))}async function Lt(e){let t=se(e);if(window.history.state?.from===t){if(pe&&!await pe())return;window.history.back()}else await y(e,{replace:!0})}function Pt(){Ua();let[e,t]=Ha(Te());return _a(()=>(at.add(t),t(Te()),()=>at.delete(t)),[]),qa(e)}function It(){new URLSearchParams(window.location.search).get("opt")==="apps"&&window.history.replaceState(null,"",window.location.pathname+se(["apps"]))}var ot=null;function Le(e){ot=e}function _e(e){return ot!==e?!1:(ot=null,!0)}import{html as b,useState as Ue,useEffect as za,useCallback as Ka,useContext as Ga,useRef as Bt,createContext as Ja,Modal as Ne,Dropdown as qe,Placeholder as Ft,Alert as Wa,Toast as Qa,Button as Ao}from"acelery/ui.js";var C=({name:e})=>b`<i class=${e} aria-hidden="true"></i>`,Va="(min-width: 768px)",Rt="(min-width: 992px)";function it(e){let t=()=>!!globalThis.matchMedia?.(e).matches,[a,n]=Ue(t);return za(()=>{let o=globalThis.matchMedia?.(e);if(!o?.addEventListener)return;let i=()=>n(o.matches);return i(),o.addEventListener("change",i),()=>o.removeEventListener("change",i)},[e]),a}function z({icon:e,label:t,onClick:a,disabled:n,primary:o,className:i}){return b`
    <button type="button" aria-label=${t} title=${t}
      class=${`ac-iconbtn${o?" is-primary":""} ${i??""}`}
      disabled=${!!n} onClick=${a}>
      <${C} name=${e} />
    </button>`}function R({icon:e,title:t,children:a,action:n}){return b`
    <div class="ac-empty">
      <div class="ac-empty-icon"><${C} name=${e} /></div>
      <h2>${t}</h2>
      ${a?b`<p>${a}</p>`:null}
      ${n??null}
    </div>`}function j({rows:e=3,grid:t=!1}){let a=(o,i)=>b`
    <${Ft} as="div" animation="glow">
      <${Ft} xs=${o} size=${i} />
    <//>`,n=Array.from({length:e},(o,i)=>i);return t?b`
      <div class="ac-grid ac-skeleton" aria-busy="true" aria-label="Loading">
        ${n.map(o=>b`
          <div class="ac-card" key=${o}>
            <div class="ac-tile" style=${{background:"var(--ac-surface-2)"}}></div>
            ${a(8)}${a(10,"sm")}
          </div>`)}
      </div>`:b`
    <div class="ac-list ac-skeleton" aria-busy="true" aria-label="Loading">
      ${n.map(o=>b`
        <div class="ac-row" key=${o}>
          <div class="ac-row-icon"></div>
          <div class="ac-row-body">${a(6)}${a(4,"sm")}</div>
        </div>`)}
    </div>`}function M({error:e,onClose:t}){return e?b`
    <${Wa} variant="danger" className="ac-error" dismissible=${!!t}
              onClose=${t}>
      <${C} name="fa-solid fa-triangle-exclamation" />
      <span>${e?.message??String(e)}</span>
    <//>`:null}function re({what:e,action:t}){return b`
    <${R} icon="fa-solid fa-magnifying-glass" title=${`${e} not found`}
      action=${t}>
      It may have been deleted, or the link is out of date.
    <//>`}var Mt=Ja(()=>{});function Ot({children:e}){let[t,a]=Ue([]),n=Bt(0),o=Ka(s=>{let r=++n.current;a(c=>[...c.slice(-2),{id:r,text:s}])},[]),i=s=>a(r=>r.filter(c=>c.id!==s));return b`
    <${Mt.Provider} value=${o}>
      ${e}
      <div class="ac-toasts">
        ${t.map(s=>b`
          <${Qa} key=${s.id} className="ac-toast" show autohide delay=${4e3}
                    onClose=${()=>i(s.id)}
                    role="status" aria-live="polite">
            <div class="d-flex align-items-center">
              <div class="toast-body">${s.text}</div>
              <${z} icon="fa-solid fa-xmark" label="Dismiss"
                onClick=${()=>i(s.id)} />
            </div>
          <//>`)}
      </div>
    <//>`}var K=()=>Ga(Mt);function ae({show:e,onHide:t,title:a,children:n}){return b`
    <${Ne} show=${e} onHide=${t} centered dialogClassName="ac-sheet">
      ${a?b`<${Ne.Header} closeButton>
            <${Ne.Title} as="h2" className="fs-5">${a}<//>
          <//>`:null}
      ${n}
    <//>`}function he({label:e="More actions",title:t,actions:a}){let n=it(Va),[o,i]=Ue(!1),s=Bt(null),r=a.filter(Boolean);return r.length?n?b`
      <${qe} align="end" className="ac-over">
        <${qe.Toggle} as="button" type="button" bsPrefix="ac-iconbtn"
                            aria-label=${e} title=${e}>
          <${C} name="fa-solid fa-ellipsis-vertical" />
        <//>
        <${qe.Menu} popperConfig=${{strategy:"fixed"}}>
          ${r.map(c=>b`
            <${qe.Item} as="button" key=${c.label} disabled=${!!c.disabled}
                              className=${c.danger?"is-danger":""}
                              onClick=${c.onSelect}>
              ${c.icon?b`<${C} name=${c.icon} />`:null}
              <span>${c.label}</span>
            <//>`)}
        <//>
      <//>`:b`
    <span class="ac-over">
      <${z} icon="fa-solid fa-ellipsis-vertical" label=${e}
        onClick=${()=>i(!0)} />
      <${Ne} show=${o} onHide=${()=>i(!1)} centered
                dialogClassName="ac-sheet"
                onExited=${()=>{let c=s.current;s.current=null,c?.()}}>
        ${t?b`<div class="ac-sheet-title">${t}</div>`:null}
        <div class="ac-actions" role="menu" aria-label=${e}>
          ${r.map(c=>b`
            <button key=${c.label} type="button" role="menuitem"
                    class=${`ac-action${c.danger?" is-danger":""}`}
                    disabled=${!!c.disabled}
                    onClick=${()=>{s.current=c.onSelect,i(!1)}}>
              ${c.icon?b`<${C} name=${c.icon} />`:null}
              <span>${c.label}</span>
            </button>`)}
        </div>
      <//>
    </span>`:null}function ze({label:e,value:t,options:a,onChange:n,role:o="tablist"}){let i=o==="tablist"?"tab":"radio",s=o==="tablist"?"aria-selected":"aria-checked";return b`
    <div class="ac-segmented" role=${o} aria-label=${e}>
      ${a.map(r=>b`
        <button key=${r.value} type="button" role=${i} class="ac-segment"
                ...${{[s]:t===r.value?"true":"false"}}
                disabled=${!!r.disabled} onClick=${()=>n(r.value)}>
          ${r.icon?b`<${C} name=${r.icon} />`:null}
          <span>${r.label}</span>
        </button>`)}
    </div>`}var jt=["#3d6b63","#1f6f8b","#6b4fa0","#a14a2b","#2e7d32","#8a5a00","#9c2f5e","#45617d"];function Za(e){let t=0;for(let a of e)t=t*31+a.codePointAt(0)>>>0;return jt[t%jt.length]}function Pe({name:e,icon:t}){let[a,n]=Ue(!1);return t&&!a?b`
      <div class="ac-tile">
        <img src=${t} alt="" onError=${()=>n(!0)} />
      </div>`:b`
    <div class="ac-tile" style=${{background:Za(e)}} aria-hidden="true">
      ${([...e][0]??"?").toUpperCase()}
    </div>`}function Ke({project:e,verb:t,onOpen:a,actions:n}){return b`
    <div class="ac-card">
      <div class="ac-card-head">
        <${Pe} name=${e.name} icon=${e.icon} />
        <${he} title=${e.name} label=${`Actions for ${e.name}`}
          actions=${n} />
      </div>
      <h3 class="ac-card-title">
        <button type="button" class="ac-stretch"
                aria-label=${`${t} ${e.name}`} onClick=${a}>
          ${e.name}
        </button>
      </h3>
      ${e.description?b`<p class="ac-card-text">${e.description}</p>`:null}
    </div>`}function G({icon:e,title:t,meta:a,onOpen:n,selected:o,actions:i,badge:s}){return b`
    <div class=${`ac-row${n?" is-action":""}${o?" is-selected":""}`}>
      <div class="ac-row-icon" aria-hidden="true"><${C} name=${e} /></div>
      <div class="ac-row-body">
        ${n?b`<button type="button" class="ac-stretch ac-row-title"
                   aria-current=${o?"true":void 0}
                   onClick=${n}>${t}</button>`:b`<div class="ac-row-title">${t}</div>`}
        ${a?b`<div class="ac-row-meta">${a}</div>`:null}
      </div>
      ${s?b`<span class="ac-badge">${s}</span>`:null}
      ${i?b`<${he} title=${t} label=${`Actions for ${t}`}
                 actions=${i} />`:null}
    </div>`}var Xa=[{key:"home",path:[],label:"Home",icon:"fa-solid fa-house"},{key:"apps",path:["apps"],label:"Apps",icon:"fa-solid fa-table-cells"},{key:"code",path:["code"],label:"Code",icon:"fa-solid fa-code"},{key:"data",path:["data"],label:"Data",icon:"fa-solid fa-database"},{key:"settings",path:["settings"],label:"Settings",icon:"fa-solid fa-gear"}];function Ht({section:e}){return Xa.map(t=>ne`
      <a key=${t.key} href=${se(t.path)}
         class=${`ac-navitem${t.key==="settings"?" is-settings":""}`}
         aria-current=${e===t.key?"page":void 0}
         onClick=${a=>{a.button!==0||a.metaKey||a.ctrlKey||a.shiftKey||a.altKey||(a.preventDefault(),y(t.path,{replace:!0}))}}>
        <span class="ac-navicon"><${C} name=${t.icon} /></span>
        <span class="ac-navlabel">${t.label}</span>
      </a>`)}function st({section:e,children:t}){return ne`
    <div class="ac-frame">
      <nav class="ac-rail" aria-label="Main">
        <div class="ac-brand">
          <span class="ac-brand-mark" aria-hidden="true">
            <${C} name="fa-solid fa-seedling" />
          </span>
          <span class="ac-brand-name">aCelery</span>
        </div>
        <${Ht} section=${e} />
      </nav>
      <main class="ac-main">${t}</main>
      <nav class="ac-bottomnav" aria-label="Main">
        <${Ht} section=${e} />
      </nav>
    </div>`}function T({title:e,subtitle:t,back:a,actions:n,subbar:o,fab:i,fill:s,children:r}){let[c,d]=Ya(!1);return ne`
    <section class="ac-screen" aria-labelledby="ac-screen-title">
      <header class=${`ac-appbar${a?"":" no-back"}${c?" is-scrolled":""}${o?" has-subbar":""}`}>
        ${a?ne`<${z} icon="fa-solid fa-arrow-left" label="Back"
                   onClick=${()=>Lt(a)} />`:null}
        <div class="ac-appbar-titles">
          <h1 class="ac-appbar-title" id="ac-screen-title">${e}</h1>
          ${t?ne`<div class="ac-appbar-subtitle">${t}</div>`:null}
        </div>
        <div class="ac-appbar-actions">${n??null}</div>
      </header>
      ${o?ne`<div class="ac-subbar">${o}</div>`:null}
      ${s?ne`<div class="ac-content is-fill">${r}</div>`:ne`
            <div class=${`ac-content${i?" has-fab":""}`}
                 onScroll=${l=>d(l.currentTarget.scrollTop>0)}>
              <div class="ac-content-inner">${r}</div>
            </div>`}
      ${i?ne`
            <button type="button" class="ac-fab" aria-label=${i.label}
                    onClick=${i.onClick}>
              <${C} name=${i.icon} />
              <span class="ac-fab-label" aria-hidden="true">${i.label}</span>
            </button>`:null}
    </section>`}import*as I from"acelery/file.js";import{openDB as qt}from"acelery/sql.js";var _t="/system/scaffold/",en=/\{\{name\}\}/g;function tn(e,t){let a=new RegExp(e.namePattern),{messages:n}=e;return{entry:e.entry,nameProblem(o){let i=(o??"").trim();return i?a.test(i)?null:n.nameInvalid:n.nameRequired},descriptionProblem(o){return(o??"").length<=e.descriptionMax?null:n.descriptionTooLong},projectName(o){let i=o.trim();return i.charAt(0).toUpperCase()+i.slice(1)},files(o,i){let s={"acelery_app.json":JSON.stringify({name:o,description:i??"",entry:e.entry})};for(let r of Object.keys(e.templates))s[r]=t[r].replace(en,o);return s}}}var rt=null;function ke(){return rt??=(async()=>{let e=async n=>{let o=await fetch(_t+n);if(!o.ok)throw new Error(`${_t}${n}: ${o.status}`);return o.text()},t=JSON.parse(await e("scaffold.json")),a={};for(let[n,o]of Object.entries(t.templates))a[n]=await e(o);return tn(t,a)})().catch(e=>{throw rt=null,e}),rt}async function Nt(){let e=await qt("acelery.db");try{await e.exec("create table if not exists config (cfg_key text unique, cfg_value text)");let t=await e.select("select cfg_key, cfg_value from config");return Object.fromEntries(t.map(a=>[a.cfg_key,a.cfg_value]))}finally{await e.close()}}async function Ut(e){let t=await qt("acelery.db");try{await t.exec("create table if not exists config (cfg_key text unique, cfg_value text)");for(let[a,n]of Object.entries(e))await t.exec("insert into config (cfg_key, cfg_value) values (?, ?) on conflict(cfg_key) do update set cfg_value = excluded.cfg_value",[a,n??""])}finally{await t.close()}}var lt=null;function zt(){return lt??=I.externalStoragePath().catch(e=>{throw lt=null,e}),lt}async function _(){return await zt()+"/aCelery/www/user/"}async function an(){return await zt()+"/aCelery/"}function Kt(e){return typeof e!="string"||!/^[\w.-]+(\/[\w.-]+)*$/.test(e)||e.split("/").includes("..")?null:e}function nn(e,t){let a=Kt(t);return a&&`/user/${encodeURIComponent(e)}/${a}`}async function Ge(e,t){t??=await _();try{let a=await I.open("acelery_app.json",t+e),n=await a.read();await a.close();let o=n?JSON.parse(n):{};return{description:typeof o.description=="string"?o.description:"",entry:typeof o.entry=="string"&&o.entry?o.entry:"main.js",icon:nn(e,o.icon),iconFile:Kt(o.icon)}}catch{return{description:"",entry:"main.js",icon:null,iconFile:null}}}async function ct(e,t){let a=await _(),n={};try{let o=await I.open("acelery_app.json",a+e),i=await o.read();await o.close();let s=i?JSON.parse(i):{};s&&typeof s=="object"&&!Array.isArray(s)&&(n=s)}catch{}for(let[o,i]of Object.entries(t))i===null?delete n[o]:n[o]=i;await Se(e,"acelery_app.json",JSON.stringify(n,null,2))}async function le(){let e=await _(),t=await I.listFiles("user",e.replace(/user\/$/,"")),a=[];for(let n of t)n.directory&&a.push({name:n.fname,...await Ge(n.fname,e)});return a.sort((n,o)=>n.name.localeCompare(o.name))}async function Gt(e){let t=await _();return(await I.listFiles("user",t.replace(/user\/$/,""))).some(n=>n.directory&&n.fname===e)}async function Je(e){return(await I.listFiles(e,await _())).filter(a=>!a.directory).map(a=>({name:a.fname,length:a.length,modified:a.lastmodified})).sort((a,n)=>a.name.localeCompare(n.name))}async function Jt(e,t){let a=await I.open(t,await _()+e);try{return await a.read()}finally{await a.close()}}async function Se(e,t,a){let n=await I.open(t,await _()+e);try{await n.write(a)}finally{await n.close()}}async function We(e,t,a){return I.writeBytes(`${e}/${t}`,a,await _())}async function Wt(e,t){await(await I.open(t,await _()+e)).delete()}async function Ce(e){await(await I.open(e,await _())).delete()}async function Qt(e,t){await I.rename(e,t,await _())}async function Vt({name:e,description:t}){let a=await ke(),n=a.projectName(e),o=await _();await I.mkdir(n,o);for(let[i,s]of Object.entries(a.files(n,t)))await Se(n,i,s);return n}async function Ie(){return(await I.listFiles("db",await an())).filter(t=>!t.directory&&!t.fname.includes("journal")).map(t=>({name:t.fname,length:t.length,modified:t.lastmodified})).sort((t,a)=>t.name.localeCompare(a.name))}async function Zt(e){return(await Ie()).some(t=>t.name===e)}function Qe(e){if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(e))throw new Error(`"${e}" is not a usable table name`);return e}function ce(){return!!globalThis.ACeleryHost}function Yt(){return ce()&&/\bAndroid\b/.test(globalThis.navigator?.userAgent??"")}function oe(e){globalThis.ACeleryHost?.postMessage(JSON.stringify(e))}function xe(e){return typeof e!="number"||!Number.isFinite(e)?"":e<1024?`${e} B`:e<1024*1024?`${(e/1024).toFixed(e<10240?1:0)} KB`:`${(e/1024/1024).toFixed(1)} MB`}function Xt(e){if(typeof e!="number"||!e)return"";let t=new Date(e);return t.toDateString()===new Date().toDateString()?t.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):t.toLocaleDateString([],{day:"numeric",month:"short",year:"numeric"})}import{html as de,useState as ea,useEffect as on,Button as Fe}from"acelery/ui.js";import{runApp as ta}from"acelery/export.js";function sn(e=new Date){let t=e.getHours();return t<5?"Working late":t<12?"Good morning":t<18?"Good afternoon":"Good evening"}var aa=e=>t=>{t.button!==0||t.metaKey||t.ctrlKey||t.shiftKey||t.altKey||(t.preventDefault(),y(e))};function na({settings:e,updateSettings:t}){let[a,n]=ea(null),[o,i]=ea(null);on(()=>{let p=!0;return(async()=>{try{let[m,$]=await Promise.all([le(),Ie()]);if(!p)return;n({projects:m,databases:$});let S={},A=e["recent.project"];A&&!m.some(x=>x.name===A)&&(S["recent.project"]="",S["recent.file"]="");let D=e["recent.db"];D&&!$.some(x=>x.name===D)&&(S["recent.db"]=""),Object.keys(S).length&&t(S)}catch(m){if(!p)return;i(m),n({projects:[],databases:[]})}})(),()=>{p=!1}},[]);let s=a?.projects.find(p=>p.name===e["recent.project"]),r=s?e["recent.file"]:"",c=a?.databases.find(p=>p.name===e["recent.db"]),d=a?.projects.find(p=>p.name==="Example"),l=()=>{Le("new-project"),y(["code"])},u=()=>{Le("new-db"),y(["data"])},v;a?s||c?v=de`
      <div class="ac-continue">
        ${s?de`
              <div class="ac-continue-card">
                <${Pe} name=${s.name} icon=${s.icon} />
                <div class="ac-row-body">
                  <div class="ac-row-title">${s.name}</div>
                  <div class="ac-row-meta">${r||s.description||"Project"}</div>
                </div>
                <div class="ac-button-row">
                  <${Fe} variant="outline-primary"
                    onClick=${()=>y(r?["code",s.name,r]:["code",s.name])}>
                    Open
                  <//>
                  <${Fe} variant="primary"
                    onClick=${()=>ta(s.name,s.name,!0)}>
                    <${C} name="fa-solid fa-play" /> Run
                  <//>
                </div>
              </div>`:null}
        ${c?de`
              <div class="ac-continue-card">
                <div class="ac-row-icon" aria-hidden="true">
                  <${C} name="fa-solid fa-database" />
                </div>
                <div class="ac-row-body">
                  <div class="ac-row-title">${c.name}</div>
                  <div class="ac-row-meta">Database · ${xe(c.length)}</div>
                </div>
                <div class="ac-button-row">
                  <${Fe} variant="outline-primary" onClick=${()=>y(["data",c.name])}>
                    Open
                  <//>
                </div>
              </div>`:null}
      </div>`:v=de`
      <div class="ac-welcome">
        <h2>Welcome to aCelery</h2>
        <p>
          An aCelery app is a few JavaScript files you write on this device and
          run straight away. Try the example, or start your own.
        </p>
        <div class="ac-button-row">
          ${d?de`<${Fe} variant="primary"
                     onClick=${()=>ta(d.name,d.name,!1)}>
                <${C} name="fa-solid fa-play" /> Run the Example app
              <//>`:null}
          <${Fe} variant=${d?"outline-primary":"primary"} onClick=${l}>
            Create your first app
          <//>
        </div>
      </div>`:v=de`<${j} rows=${2} />`;let k=p=>p?String(p.length):"\u2013";return de`
    <${T} title=${de`
      <span class="ac-brand-inline">
        <span class="ac-brand-mark" aria-hidden="true"><${C} name="fa-solid fa-seedling" /></span>
        aCelery
      </span>`}>
      <${M} error=${o} onClose=${()=>i(null)} />
      <div class="ac-home">
        <div>
          <div class="ac-hero">
            <h2>${sn()}</h2>
            <p>Build and run your own JavaScript apps.</p>
          </div>
          <section class="ac-section" aria-label=${s||c?"Continue":"Get started"}>
            <h2 class="ac-section-title">${s||c?"Continue":"Get started"}</h2>
            ${v}
          </section>
        </div>
        <div>
          <section class="ac-section">
            <h2 class="ac-section-title">Create</h2>
            <div class="ac-quick">
              <button type="button" class="ac-quick-btn" onClick=${l}>
                <span class="ac-quick-icon"><${C} name="fa-solid fa-code" /></span>
                New app
              </button>
              <button type="button" class="ac-quick-btn" onClick=${u}>
                <span class="ac-quick-icon"><${C} name="fa-solid fa-database" /></span>
                New database
              </button>
            </div>
          </section>
          <section class="ac-section">
            <h2 class="ac-section-title">On this device</h2>
            <div class="ac-stats">
              <a class="ac-stat" href=${se(["apps"])} onClick=${aa(["apps"])}>
                <span class="ac-stat-value">${k(a?.projects)}</span>
                <span class="ac-stat-label">${a?.projects.length===1?"app":"apps"}</span>
              </a>
              <a class="ac-stat" href=${se(["data"])} onClick=${aa(["data"])}>
                <span class="ac-stat-value">${k(a?.databases)}</span>
                <span class="ac-stat-label">
                  ${a?.databases.length===1?"database":"databases"}
                </span>
              </a>
            </div>
          </section>
        </div>
      </div>
    <//>`}import{html as W,useState as dt,useEffect as dn,useCallback as un,Button as fn}from"acelery/ui.js";import{runApp as $n,exportProject as mn}from"acelery/export.js";import{html as rn,useState as ln,useCallback as cn,Modal as je,Button as oa}from"acelery/ui.js";function J(){let[e,t]=ln(null),a=cn((i,{title:s="aCelery",danger:r=!1,confirmLabel:c="OK",cancelLabel:d="Cancel",dismissValue:l=!1}={})=>new Promise(u=>t({message:i,title:s,danger:r,confirmLabel:c,cancelLabel:d,dismissValue:l,resolve:u})),[]),n=i=>{e?.resolve(i),t(null)},o=e?rn`
        <${je} show onHide=${()=>n(e.dismissValue)} centered>
          <${je.Header} closeButton>
            <${je.Title} as="h2" className="fs-5">${e.title}<//>
          <//>
          <${je.Body}>${e.message}<//>
          <${je.Footer}>
            <${oa} variant="outline-secondary" onClick=${()=>n(!1)}>
              ${e.cancelLabel}
            <//>
            <${oa} variant=${e.danger?"danger":"primary"}
                       onClick=${()=>n(!0)}>
              ${e.confirmLabel}
            <//>
          <//>
        <//>`:null;return{confirm:a,dialog:o}}var ut=6;function ft({value:e,onChange:t,label:a}){return W`
    <div class="ac-search" role="search">
      <${C} name="fa-solid fa-magnifying-glass" />
      <input type="search" class="form-control" aria-label=${a}
             placeholder=${a} value=${e}
             onInput=${n=>t(n.currentTarget.value)} />
    </div>`}function $t(e,t){let a=t.trim().toLowerCase();return!a||e.name.toLowerCase().includes(a)||e.description.toLowerCase().includes(a)}async function Be(e,t){return e(`${t} and all of its files will be deleted. This cannot be undone.`,{title:`Delete ${t}?`,danger:!0,confirmLabel:"Delete"})}function ia({settings:e,updateSettings:t}){let[a,n]=dt(null),[o,i]=dt(null),[s,r]=dt(""),c=K(),{confirm:d,dialog:l}=J(),u=un(async()=>{try{n(await le())}catch(p){i(p),n([])}},[]);dn(()=>{u()},[u]);async function v(p){if(await Be(d,p.name))try{await Ce(p.name),e["recent.project"]===p.name&&t({"recent.project":"","recent.file":""}),c(`Deleted ${p.name}`),await u()}catch(m){i(m)}}let k;if(a===null)k=W`<${j} rows=${4} grid />`;else if(!a.length)k=W`
      <${R} icon="fa-solid fa-table-cells" title="No apps yet"
        action=${W`
          <${fn} variant="primary"
            onClick=${()=>{Le("new-project"),y(["code"])}}>
            Create an app
          <//>`}>
        An app is a folder of JavaScript you write in Code.
      <//>`;else{let p=a.filter(m=>$t(m,s));k=W`
      ${a.length>ut?W`<div class="ac-toolbar">
            <${ft} label="Search apps" value=${s} onChange=${r} />
          </div>`:null}
      ${p.length?W`
            <div class="ac-grid">
              ${p.map(m=>W`
                <${Ke} key=${m.name} project=${m} verb="Run"
                  onOpen=${()=>$n(m.name,m.name,!1)}
                  actions=${[{label:"Edit in Code",icon:"fa-solid fa-pen-to-square",onSelect:()=>y(["code",m.name])},Yt()&&{label:"Add to home screen",icon:"fa-solid fa-mobile-screen",onSelect:()=>oe({action:"addShortcut",app:m.name})},{label:"Export",icon:"fa-solid fa-file-export",onSelect:()=>mn(m.name)},{label:"Delete",icon:"fa-solid fa-trash",danger:!0,onSelect:()=>v(m)}]} />`)}
            </div>`:W`<p class="text-body-secondary px-1">Nothing matches “${s}”.</p>`}`}return W`
    <${T} title="Apps">
      <${M} error=${o} onClose=${()=>i(null)} />
      ${k}
    <//>
    ${l}`}import{html as q,useState as Re,useEffect as sa,useCallback as pn,Button as mt,Modal as ra,Form as hn,Input as la,notEmpty as vn}from"acelery/ui.js";import{runApp as yn,exportProject as bn,importProject as wn}from"acelery/export.js";function gn({show:e,scaffold:t,existing:a,onClose:n,onCreate:o}){let i=s=>{let r=(s??"").trim().toLowerCase();return a.some(c=>c.name.toLowerCase()===r)?"A project with that name already exists":!0};return q`
    <${ae} show=${e} onHide=${n} title="New project">
      <${hn} initial=${{name:"",description:""}} onSubmit=${o}>
        <${ra.Body}>
          <${la} label="Name" name="name"
            placeholder="Letters and numbers, 16 max"
            autocapitalize="off" autocomplete="off" spellcheck=${!1}
            validate=${[vn("A name is required"),s=>t.nameProblem(s)??!0,i]} />
          <${la} label="Description" name="description" as="textarea"
            placeholder="What it does, in a sentence (optional)"
            validate=${[s=>t.descriptionProblem(s)??!0]} />
        <//>
        <${ra.Footer}>
          <${mt} variant="outline-secondary" type="button" onClick=${n}>
            Cancel
          <//>
          <${mt} variant="primary" type="submit">Create project<//>
        <//>
      <//>
    <//>`}function ca({settings:e,updateSettings:t}){let[a,n]=Re(null),[o,i]=Re(null),[s,r]=Re(null),[c,d]=Re(""),[l,u]=Re(()=>_e("new-project")),v=K(),{confirm:k,dialog:p}=J(),m=pn(async()=>{try{n(await le())}catch(D){r(D),n([])}},[]);sa(()=>{m()},[m]),sa(()=>{ke().then(i,r)},[]);async function $(D){u(!1);try{let x=await Vt(D);v(`Created ${x}`),y(["code",x,o.entry])}catch(x){r(x)}}async function S(D){if(await Be(k,D.name))try{await Ce(D.name),e["recent.project"]===D.name&&t({"recent.project":"","recent.file":""}),v(`Deleted ${D.name}`),await m()}catch(x){r(x)}}let A;if(a===null)A=q`<${j} rows=${4} grid />`;else if(!a.length)A=q`
      <${R} icon="fa-solid fa-folder" title="No projects yet"
        action=${q`
          <${mt} variant="primary" onClick=${()=>u(!0)}>
            New project
          <//>`}>
        A project is a folder holding an app's JavaScript, CSS and manifest.
      <//>`;else{let D=a.filter(x=>$t(x,c));A=q`
      ${a.length>ut?q`<div class="ac-toolbar">
            <${ft} label="Search projects" value=${c} onChange=${d} />
          </div>`:null}
      ${D.length?q`
            <div class="ac-grid">
              ${D.map(x=>q`
                <${Ke} key=${x.name} project=${x} verb="Open"
                  onOpen=${()=>y(["code",x.name])}
                  actions=${[{label:"Run",icon:"fa-solid fa-play",onSelect:()=>yn(x.name,x.name,!0)},{label:"Export",icon:"fa-solid fa-file-export",onSelect:()=>bn(x.name)},{label:"Delete",icon:"fa-solid fa-trash",danger:!0,onSelect:()=>S(x)}]} />`)}
            </div>`:q`<p class="text-body-secondary px-1">Nothing matches “${c}”.</p>`}`}return q`
    <${T} title="Code"
      actions=${ce()?q`<${z} icon="fa-solid fa-file-import" label="Import project"
                 onClick=${wn} />`:null}
      fab=${{icon:"fa-solid fa-plus",label:"New project",onClick:()=>u(!0)}}>
      <${M} error=${s} onClose=${()=>r(null)} />
      ${A}
    <//>
    ${o?q`<${gn} show=${l} scaffold=${o}
          existing=${a??[]}
          onClose=${()=>u(!1)} onCreate=${$} />`:null}
    ${p}`}import{html as E,useState as V,useEffect as ve,useRef as De,useCallback as ma,Button as ye,Modal as Ze,Form as Dn,Input as En,Select as An,FileButton as Tn,notEmpty as Ln}from"acelery/ui.js";import{runApp as Pn,exportProject as In}from"acelery/export.js";import{html as Ve,useState as Q,useEffect as pt,Button as ht,Modal as da,Input as ua,ImageCropper as kn,FileButton as Sn}from"acelery/ui.js";var fa="icon.png",Cn=512,xn=(e,t)=>e.trim().toLowerCase()===t.trim().toLowerCase();function $a({show:e,project:t,manifest:a,onClose:n,onSaved:o,onError:i}){let[s,r]=Q(null),[c,d]=Q([]),[l,u]=Q(t),[v,k]=Q(""),[p,m]=Q(null),[$,S]=Q(null),[A,D]=Q(!1),[x,Y]=Q(null),[O,L]=Q(!1),[H,X]=Q(!1);pt(()=>{ke().then(r,i)},[]),pt(()=>{e&&(u(t),k(a?.description??""),m(null),D(!1),Y(null),L(!1),le().then(w=>d(w.map(U=>U.name).filter(U=>U!==t)),i))},[e]),pt(()=>{if(!p){S(null);return}let w=URL.createObjectURL(p);return S(w),()=>URL.revokeObjectURL(w)},[p]);let P=s?s.nameProblem(l)??(c.some(w=>xn(w,l))?"A project with that name already exists":null):null,B=s?s.descriptionProblem(v):null;async function ie(){if(L(!0),!(!s||P||B||H)){X(!0);try{let w=s.projectName(l),U={description:v.trim()};p?(await We(t,fa,p),U.icon=fa):A&&(U.icon=null),await ct(t,U);let Ae=w!==t;Ae&&(await Qt(t,w),await ct(w,{name:w})),o({name:w,renamed:Ae})}catch(w){i(w)}finally{X(!1)}}}let ue=A?null:$??a?.icon??null,ee=!!ue;return Ve`
    <${ae} show=${e&&!x} onHide=${()=>!H&&n()}
      title="App details">
      <${da.Body}>
        <div class="d-flex align-items-center gap-3 mb-3">
          <div class="ac-icon-preview">
            <${Pe} key=${ue??"none"} name=${l.trim()||t}
              icon=${ue} />
          </div>
          <div class="d-flex flex-wrap gap-2">
            <${Sn} variant="outline-primary" size="sm" accept="image/*"
              onFiles=${([w])=>Y(w)}>
              ${ee?"Change icon":"Choose icon"}
            <//>
            ${ee?Ve`<${ht} variant="outline-secondary" size="sm" type="button"
                  onClick=${()=>{m(null),D(!0)}}>
                  Remove icon
                <//>`:null}
          </div>
        </div>
        <${ua} label="Name" value=${l}
          onChange=${w=>{u(w),L(!0)}}
          autocapitalize="off" autocomplete="off" spellcheck=${!1}
          isInvalid=${O&&!!P}
          help=${O&&P?Ve`<span class="text-danger">${P}</span>`:"Renaming the app also renames its folder. A home screen shortcut to it stops working."} />
        <${ua} label="Description" as="textarea" rows=${3} value=${v}
          onChange=${w=>{k(w),L(!0)}}
          placeholder="What it does, in a sentence (optional)"
          isInvalid=${O&&!!B}
          help=${O&&B?Ve`<span class="text-danger">${B}</span>`:null} />
      <//>
      <${da.Footer}>
        <${ht} variant="outline-secondary" type="button" disabled=${H}
          onClick=${n}>
          Cancel
        <//>
        <${ht} variant="primary" type="button" disabled=${H||!s}
          onClick=${ie}>
          ${H?"Saving\u2026":"Save"}
        <//>
      <//>
    <//>
    <${kn} image=${x} title="Crop the icon" confirmLabel="Use as icon"
      maxSide=${Cn} type="image/png"
      onDone=${w=>{m(w),D(!1),Y(null)}}
      onCancel=${()=>Y(null)} />`}var Ye=e=>e.includes(".")?e.split(".").pop().toLowerCase():"",vt={js:"JavaScript",mjs:"JavaScript",json:"JSON",css:"CSS",html:"HTML",htm:"HTML",xml:"XML",svg:"SVG",md:"Markdown",txt:"Text"},pa=new Set(["png","jpg","jpeg","gif","webp","bmp","ico"]),Fn=new Set(["zip","woff","woff2","ttf","otf","mp3","mp4","pdf","db"]);function jn(e){let t=Ye(e);return pa.has(t)?"fa-solid fa-file-image":["md","txt"].includes(t)?"fa-solid fa-file-lines":vt[t]?"fa-solid fa-file-code":"fa-solid fa-file"}function Bn(e){let t=Ye(e);return pa.has(t)?"image":Fn.has(t)?"binary":"text"}function Rn({show:e,project:t,existing:a,onClose:n,onCreate:o}){return E`
    <${ae} show=${e} onHide=${n} title=${`New file in ${t}`}>
      <${Dn} initial=${{name:"",type:".js"}} onSubmit=${o}>
        <${Ze.Body}>
          <${En} label="Name" name="name" placeholder="File name without extension"
            autocapitalize="off" autocomplete="off" spellcheck=${!1}
            validate=${[Ln("A name is required"),i=>/^[\w.-]+$/.test((i??"").trim())?!0:"Letters, numbers, dot, dash and underscore only"]} />
          <${An} label="Type" name="type" options=${[{label:"JavaScript",value:".js"},{label:"CSS",value:".css"}]} />
        <//>
        <${Ze.Footer}>
          <${ye} variant="outline-secondary" type="button" onClick=${n}>
            Cancel
          <//>
          <${ye} variant="primary" type="submit"
            onClick=${i=>{let s=i.currentTarget.form,r=`${s.elements.name.value.trim()}${s.elements.type.value}`;a.some(c=>c.name===r)&&(i.preventDefault(),o({duplicate:r}))}}>
            Create file
          <//>
        <//>
      <//>
    <//>`}function Mn({show:e,project:t,onClose:a,onPicked:n}){return E`
    <${ae} show=${e} onHide=${a} title=${`Add files to ${t}`}>
      <${Ze.Body}>
        <p>
          Copy pictures, data files or scripts from this device into the app.
          Spaces in a name become underscores. A file with the same name is
          replaced.
        </p>
        <${Tn} variant="primary" multiple
          onFiles=${o=>{a(),n(o)}}>
          Choose files
        <//>
      <//>
      <${Ze.Footer}>
        <${ye} variant="outline-secondary" type="button" onClick=${a}>
          Cancel
        <//>
      <//>
    <//>`}var On=e=>e.replace(/[^\w.-]+/g,"_").replace(/^\.+/,"")||"file";function ha({project:e,fileName:t,editorTheme:a,settings:n,updateSettings:o}){let i=it(Rt),s=K(),{confirm:r,dialog:c}=J(),[d,l]=V("loading"),[u,v]=V([]),[k,p]=V(null),[m,$]=V(null),[S,A]=V(!1),[D,x]=V(!1),[Y,O]=V(!1),[L,H]=V(null),[X,P]=V(!1),[B,ie]=V(!1),ue=De(null),ee=De(null),w=De(!1),U=De(null);U.current=L;let Ae=De(a);Ae.current=a;let fe=f=>{w.current=f,P(f)},Me=ma(async()=>{v(await Je(e))},[e]);ve(()=>{let f=!0;return(async()=>{try{if(!await Gt(e)){f&&l("missing");return}let[g,F]=await Promise.all([Je(e),Ge(e)]);if(!f)return;v(g),p(F),l("ready")}catch(g){if(!f)return;$(g),l("ready")}})(),()=>{f=!1}},[e]),ve(()=>{d==="ready"&&!t&&n["recent.project"]!==e&&o({"recent.project":e,"recent.file":""})},[d,e,t]),ve(()=>{if(H(null),d!=="ready"||!t)return;let f=!0;return(async()=>{try{let g=await Je(e);if(!f)return;if(!g.some(He=>He.name===t)){H({name:t,kind:"missing"});return}let F=Bn(t),te=F==="text"?await Jt(e,t):null;if(!f)return;H({name:t,kind:F,text:te}),o({"recent.project":e,"recent.file":t})}catch(g){f&&$(g)}})(),()=>{f=!1}},[e,t,d]);let ge=ma(async()=>{let f=ee.current,g=U.current;if(!f||g?.kind!=="text")return!0;let F=f.getValue();ie(!0);try{return await Se(e,g.name,F),ee.current===f&&f.getValue()===F&&fe(!1),!0}catch(te){return $(te),!1}finally{ie(!1)}},[e]),Oe=De(ge);Oe.current=ge,ve(()=>{if(L?.kind!=="text"||!ue.current)return;let f=L.name,g=globalThis.aceleryEditor.createEditor(ue.current,{value:L.text,filename:f,theme:Ae.current,onChange:()=>{w.current||fe(!0)},onSave:()=>Oe.current()});return ee.current=g,fe(!1),()=>{w.current&&(Se(e,f,g.getValue()).catch(F=>console.error(`aCelery: could not save ${f}`,F)),w.current=!1),g.destroy(),ee.current===g&&(ee.current=null)}},[L]),ve(()=>{ee.current?.setTheme(a)},[a]),ve(()=>(globalThis.forceSaveFile=()=>{w.current&&Oe.current()},()=>{delete globalThis.forceSaveFile}),[]),ve(()=>Tt(async()=>{if(!w.current)return!0;let f=await r(`Save your changes to ${U.current?.name??"this file"} before leaving?`,{title:"Unsaved changes",confirmLabel:"Save",cancelLabel:"Discard",dismissValue:null});return f===null?!1:f?Oe.current():(fe(!1),!0)}),[r]);async function Ia(){w.current&&!await ge()||Pn(e,e,!0)}async function Fa(){w.current&&!await ge()||In(e)}async function ja(f){if(f.duplicate){$(new Error(`${f.duplicate} already exists in ${e}`)),A(!1);return}A(!1);let g=f.name.trim()+f.type;try{await Se(e,g,""),await Me(),y(["code",e,g],{replace:i&&!!t})}catch(F){$(F)}}async function Ba(f){try{let g=0;for(let F of f){let te=On(F.name);if(te==="acelery_app.json")throw new Error("acelery_app.json is the manifest; use App details to change it");if(u.some(He=>He.name===te)){if(!await r(`${te} already exists in ${e}. Replace it?`,{title:"Replace file?",confirmLabel:"Replace"}))continue;te===t&&fe(!1)}await We(e,te,F),g++}await Me(),g&&s(g===1?"Added 1 file":`Added ${g} files`),t&&g&&y(["code",e,t],{replace:!0})}catch(g){$(g),await Me().catch(()=>{})}}async function Ra(){w.current&&!await ge()||O(!0)}async function Ma({name:f,renamed:g}){if(O(!1),s("App details saved"),n["recent.project"]===e&&g&&o({"recent.project":f}),g){y(t?["code",f,t]:["code",f],{replace:!0});return}try{p(await Ge(e))}catch(F){$(F)}}async function gt(f){if(await r(`${f} will be deleted from ${e}. This cannot be undone.`,{title:`Delete ${f}?`,danger:!0,confirmLabel:"Delete"}))try{f===t&&fe(!1),await Wt(e,f),await Me(),s(`Deleted ${f}`),f===t&&y(["code",e],{replace:!0})}catch(F){$(F)}}async function Oa(){if(await Be(r,e))try{fe(!1),await Ce(e),n["recent.project"]===e&&o({"recent.project":"","recent.file":""}),s(`Deleted ${e}`),y(["code"],{replace:!0})}catch(f){$(f)}}let kt=f=>y(["code",e,f],{replace:i&&!!t});if(d==="missing")return E`
      <${T} title=${e} back=${["code"]}>
        <${re} what="Project" action=${E`
          <${ye} variant="primary" onClick=${()=>y(["code"],{replace:!0})}>
            All projects
          <//>`} />
      <//>`;if(d==="loading")return E`
      <${T} title=${e} back=${["code"]}>
        <${j} rows=${4} />
      <//>`;let $e=!!t,St=E`<${M} error=${m} onClose=${()=>$(null)} />`,Ct=u.length?E`
        <div class="ac-list">
          ${u.map(f=>E`
            <${G} key=${f.name} icon=${jn(f.name)} title=${f.name}
              meta=${`${vt[Ye(f.name)]??"File"} \xB7 ${xe(f.length)}`}
              badge=${f.name===k?.entry?"entry":null}
              selected=${f.name===t}
              onOpen=${()=>kt(f.name)}
              actions=${[{label:"Delete",icon:"fa-solid fa-trash",danger:!0,onSelect:()=>gt(f.name)}]} />`)}
        </div>`:E`
        <${R} icon="fa-solid fa-file-code" title="No files yet"
          action=${E`<${ye} variant="primary" onClick=${()=>A(!0)}>
            New file
          <//>`}>
          Add a JavaScript file for the app to run.
        <//>`,me;if($e)L?L.kind==="missing"?me=E`
      <${re} what="File" action=${E`
        <${ye} variant="primary"
          onClick=${()=>y(["code",e],{replace:!0})}>
          Back to ${e}
        <//>`} />`:L.kind==="image"?me=E`
      <div class="ac-preview">
        <img alt=${L.name}
          src=${`/user/${encodeURIComponent(e)}/${encodeURIComponent(L.name)}`} />
      </div>`:L.kind==="binary"?me=E`
      <${R} icon="fa-solid fa-file" title="Not a text file">
        ${L.name} can't be edited here.
      <//>`:me=E`
      <div class="ac-editor-host"><div class="ac-editor-mount" ref=${ue}></div></div>
      <div class="ac-status">
        <span>${vt[Ye(L.name)]??"Text"}</span>
        <span role="status">${B?"Saving\u2026":X?"Unsaved changes":"Saved"}</span>
      </div>`:me=E`<div class="ac-empty" aria-busy="true"><p>Opening ${t}…</p></div>`;else{let f=u.find(g=>g.name===k?.entry);me=E`
      <${R} icon="fa-solid fa-file-code" title="Pick a file"
        action=${f?E`<${ye} variant="outline-primary" onClick=${()=>kt(f.name)}>
              Open ${f.name}
            <//>`:null}>
        Choose a file from the list to edit it.
      <//>`}let xt=$e?E`${t}${X?E`<span class="ac-dirty" role="img" aria-label="unsaved changes"></span>`:null}`:e,Dt=E`
    ${L?.kind==="text"?E`<${z} icon="fa-solid fa-floppy-disk" label="Save"
               disabled=${!X||B} onClick=${ge} />`:null}
    <${z} icon="fa-solid fa-play" label=${`Run ${e}`} primary onClick=${Ia} />
    <${he} title=${$e?t:e} actions=${[{label:"New file",icon:"fa-solid fa-plus",onSelect:()=>A(!0)},{label:"Add files\u2026",icon:"fa-solid fa-file-import",onSelect:()=>x(!0)},{label:"App details",icon:"fa-solid fa-pen",onSelect:Ra},{label:"Export project",icon:"fa-solid fa-file-export",onSelect:Fa},$e&&{label:`Delete ${t}`,icon:"fa-solid fa-trash",danger:!0,onSelect:()=>gt(t)},{label:"Delete project",icon:"fa-solid fa-trash",danger:!0,onSelect:Oa}]} />`,Et=E`
    <${Rn} show=${S} project=${e} existing=${u}
      onClose=${()=>A(!1)} onCreate=${ja} />
    <${Mn} show=${D} project=${e}
      onClose=${()=>x(!1)} onPicked=${Ba} />
    <${$a} show=${Y} project=${e} manifest=${k}
      onClose=${()=>O(!1)} onSaved=${Ma} onError=${$} />
    ${c}`;return!i&&!$e?E`
      <${T} title=${xt} subtitle=${k?.description||null} back=${["code"]}
        actions=${Dt}
        fab=${{icon:"fa-solid fa-plus",label:"New file",onClick:()=>A(!0)}}>
        ${St}
        <h2 class="ac-section-title">Files</h2>
        ${Ct}
      <//>
      ${Et}`:E`
    <${T} title=${xt} subtitle=${$e?e:k?.description||null}
      back=${$e?["code",e]:["code"]} actions=${Dt} fill>
      <div class="ac-split">
        ${i?E`
              <aside class="ac-sidebar" aria-label="Files">
                <div class="ac-sidebar-head">
                  <h2 class="ac-section-title">Files</h2>
                  <${z} icon="fa-solid fa-plus" label="New file"
                    onClick=${()=>A(!0)} />
                </div>
                ${Ct}
              </aside>`:null}
        <div class="ac-pane">
          ${St}
          ${me}
        </div>
      </div>
    <//>
    ${Et}`}import{html as be,useState as yt,useEffect as Hn,useCallback as _n,Button as bt,Modal as va,Form as qn,Input as Nn,notEmpty as Un}from"acelery/ui.js";import{openDB as zn,deleteDB as Kn}from"acelery/sql.js";function Gn({show:e,existing:t,onClose:a,onCreate:n}){return be`
    <${ae} show=${e} onHide=${a} title="New database">
      <${qn} initial=${{name:""}} onSubmit=${n}>
        <${va.Body}>
          <${Nn} label="Name" name="name" placeholder="Database name without extension"
            autocapitalize="off" autocomplete="off" spellcheck=${!1}
            help="Saved as a SQLite file ending in .db."
            validate=${[Un("A name is required"),o=>/^[\w-]+$/.test((o??"").trim())?!0:"Letters, numbers, dash and underscore only",o=>t.some(i=>i.name===`${(o??"").trim()}.db`)?"A database with that name already exists":!0]} />
        <//>
        <${va.Footer}>
          <${bt} variant="outline-secondary" type="button" onClick=${a}>
            Cancel
          <//>
          <${bt} variant="primary" type="submit">Create database<//>
        <//>
      <//>
    <//>`}function ya({settings:e,updateSettings:t}){let[a,n]=yt(null),[o,i]=yt(null),[s,r]=yt(()=>_e("new-db")),c=K(),{confirm:d,dialog:l}=J(),u=_n(async()=>{try{n(await Ie())}catch(m){i(m),n([])}},[]);Hn(()=>{u()},[u]);async function v({name:m}){r(!1);let $=`${m.trim()}.db`;try{await(await zn($)).close(),c(`Created ${$}`),y(["data",$])}catch(S){i(S)}}async function k(m){if(await d(`${m} and every table in it will be deleted. This cannot be undone.`,{title:`Delete ${m}?`,danger:!0,confirmLabel:"Delete"}))try{await Kn(m),e["recent.db"]===m&&t({"recent.db":""}),c(`Deleted ${m}`),await u()}catch(S){i(S)}}let p;return a===null?p=be`<${j} rows=${3} />`:a.length?p=be`
      <div class="ac-list">
        ${a.map(m=>be`
          <${G} key=${m.name} icon="fa-solid fa-database" title=${m.name}
            meta=${[xe(m.length),Xt(m.modified)].filter(Boolean).join(" \xB7 ")}
            badge=${m.name==="acelery.db"?"settings":null}
            onOpen=${()=>y(["data",m.name])}
            actions=${[{label:"Delete",icon:"fa-solid fa-trash",danger:!0,onSelect:()=>k(m.name)}]} />`)}
      </div>`:p=be`
      <${R} icon="fa-solid fa-database" title="No databases yet"
        action=${be`
          <${bt} variant="primary" onClick=${()=>r(!0)}>
            New database
          <//>`}>
        A database is a SQLite file your apps read and write.
      <//>`,be`
    <${T} title="Data"
      fab=${{icon:"fa-solid fa-plus",label:"New database",onClick:()=>r(!0)}}>
      <${M} error=${o} onClose=${()=>i(null)} />
      ${p}
    <//>
    <${Gn} show=${s} existing=${a??[]}
      onClose=${()=>r(!1)} onCreate=${v} />
    ${l}`}import{html as h,useState as Z,useEffect as Xe,useCallback as Jn,useMemo as Wn,Button as Ee,Dropdown as we,Table as ba,CheckBox as Qn,TableMaint as Vn}from"acelery/ui.js";import{openDB as Zn,deleteDB as Yn}from"acelery/sql.js";var et=(e,t,a=`${t}s`)=>`${e} ${e===1?t:a}`,Xn=["INT","DOU","REA","FLO","NUM","DEC","BOO","DAT"],eo=`create table new_table (
  id integer primary key,
  name text not null
)`,to=200;function wa({dbName:e,parts:t,settings:a,updateSettings:n}){let[o,i]=Z(null),[s,r]=Z("loading"),[c,d]=Z(null),[l,u]=Z(""),[v,k]=Z(null),[p,m]=Z([]),$=K(),{confirm:S,dialog:A}=J();Xe(()=>{let P=!0,B=null;return(async()=>{try{if(!await Zt(e)){P&&r("missing");return}if(B=await Zn(e),!P)return;i(B),r("ready"),a["recent.db"]!==e&&n({"recent.db":e})}catch(ie){if(!P)return;d(ie),r("ready")}})(),()=>{P=!1,B?.close().catch(()=>{})}},[e]);async function D(){if(await S(`${e} and every table in it will be deleted. This cannot be undone.`,{title:`Delete ${e}?`,danger:!0,confirmLabel:"Delete"}))try{await o?.close(),await Yn(e),a["recent.db"]===e&&n({"recent.db":""}),$(`Deleted ${e}`),y(["data"],{replace:!0})}catch(B){d(B)}}async function x(P){if(!await S(`The table ${P} and all of its rows will be deleted. This cannot be undone.`,{title:`Drop ${P}?`,danger:!0,confirmLabel:"Drop table"}))return!1;try{return await o.exec(`drop table ${Qe(P)}`),$(`Dropped ${P}`),!0}catch(ie){return d(ie),!1}}let[Y,O,L]=t,H=h`<${M} error=${c} onClose=${()=>d(null)} />`;if(s==="missing")return h`
      <${T} title=${e} back=${["data"]}>
        <${re} what="Database" action=${h`
          <${Ee} variant="primary" onClick=${()=>y(["data"],{replace:!0})}>
            All databases
          <//>`} />
      <//>`;if(Y==="table"&&O)return h`
      <${no} db=${o} dbName=${e} table=${O} structure=${L==="structure"}
        error=${H} onError=${d}
        onDrop=${async()=>{await x(O)&&y(["data",e],{replace:!0})}} />
      ${A}`;let X=Y==="sql"?"sql":"tables";return h`
    <${T} title=${e} back=${["data"]}
      actions=${h`<${he} title=${e} actions=${[{label:"Delete database",icon:"fa-solid fa-trash",danger:!0,onSelect:D}]} />`}
      subbar=${h`
        <${ze} label="Database view" value=${X}
          options=${[{value:"tables",label:"Tables",icon:"fa-solid fa-table"},{value:"sql",label:"SQL",icon:"fa-solid fa-terminal"}]}
          onChange=${P=>y(P==="sql"?["data",e,"sql"]:["data",e],{replace:!0})} />`}>
      ${H}
      ${o?X==="sql"?h`<${oo} db=${o} sql=${l} setSql=${u}
                   result=${v} setResult=${k}
                   history=${p} setHistory=${m} />`:h`<${ao} db=${o} dbName=${e} onError=${d}
                   onDrop=${x}
                   onCreate=${()=>{u(eo),k(null),y(["data",e,"sql"],{replace:!0})}} />`:s==="loading"?h`<${j} rows=${3} />`:null}
    <//>
    ${A}`}function ao({db:e,dbName:t,onError:a,onDrop:n,onCreate:o}){let[i,s]=Z(null),[r,c]=Z({}),d=Jn(async()=>{try{let l=await e.select("select name from sqlite_master where type = ? order by name",["table"]);s(l.map(u=>u.name))}catch(l){a(l),s([])}},[e]);return Xe(()=>{d()},[d]),Xe(()=>{if(!i)return;let l=!0;return(async()=>{for(let u of i){if(!l)return;try{Qe(u);let v=await e.select(`PRAGMA table_info(${u})`),k=await e.selectOne(`select count(*) as n from ${u}`);l&&c(p=>({...p,[u]:{columns:v.length,rows:k?.n??0}}))}catch{}}})(),()=>{l=!1}},[i]),i===null?h`<${j} rows=${3} />`:i.length?h`
    <div class="ac-list">
      ${i.map(l=>{let u=r[l];return h`
          <${G} key=${l} icon="fa-solid fa-table" title=${l}
            meta=${u?`${et(u.columns,"column")} \xB7 ${et(u.rows,"row")}`:"\xA0"}
            onOpen=${()=>y(["data",t,"table",l])}
            actions=${[{label:"Structure",icon:"fa-solid fa-table-columns",onSelect:()=>y(["data",t,"table",l,"structure"])},{label:"Drop table",icon:"fa-solid fa-trash",danger:!0,onSelect:async()=>{await n(l)&&d()}}]} />`})}
    </div>`:h`
      <${R} icon="fa-solid fa-table" title="No tables yet"
        action=${h`<${Ee} variant="primary" onClick=${o}>Create a table<//>`}>
        Start from a template in the SQL tab.
      <//>`}function no({db:e,dbName:t,table:a,structure:n,error:o,onError:i,onDrop:s}){let[r,c]=Z(null),[d,l]=Z(()=>new Set);Xe(()=>{if(!e)return;let $=!0;return(async()=>{try{Qe(a);let S=await e.select(`PRAGMA table_info(${a})`);$&&c(S)}catch(S){if(!$)return;i(S),c([])}})(),()=>{$=!1}},[e,a]);let u=Wn(()=>(r??[]).map($=>({type:Xn.some(S=>String($.type).toUpperCase().includes(S))?"number":"string",title:$.name,name:$.name,inList:!d.has($.name),inSearch:!0})),[r,d]),v=($,S)=>l(A=>{let D=new Set(A);return S?D.delete($):D.add($),D}),k=h`<${he} title=${a} actions=${[n?{label:"Browse rows",icon:"fa-solid fa-table",onSelect:()=>y(["data",t,"table",a],{replace:!0})}:{label:"Structure",icon:"fa-solid fa-table-columns",onSelect:()=>y(["data",t,"table",a,"structure"])},{label:"Drop table",icon:"fa-solid fa-trash",danger:!0,onSelect:s}]} />`,p=!n&&r?.length?h`
        <${we} autoClose="outside" align="end" className="ac-over">
          <${we.Toggle} as="button" type="button" bsPrefix="ac-chip"
                              aria-label="Choose columns">
            <${C} name="fa-solid fa-table-columns" />
            <span class="d-none d-md-inline">Columns</span>
          <//>
          <${we.Menu} className="ac-columns-menu" popperConfig=${{strategy:"fixed"}}>
            ${r.map($=>h`
              <${Qn} key=${$.name} label=${$.name} className="mb-2"
                checked=${!d.has($.name)}
                onChange=${S=>v($.name,S)} />`)}
          <//>
        <//>`:null,m;return!e||r===null?m=h`<${j} rows=${4} />`:r.length?n?m=h`
      <div class="ac-results">
        <${ba} hover size="sm">
          <thead>
            <tr><th>Column</th><th>Type</th><th>Not null</th><th>Default</th><th>Key</th></tr>
          </thead>
          <tbody>
            ${r.map($=>h`
              <tr key=${$.name}>
                <td>${$.name}</td>
                <td>${$.type||h`<span class="ac-null">none</span>`}</td>
                <td>${$.notnull?"yes":""}</td>
                <td>${$.dflt_value??h`<span class="ac-null">NULL</span>`}</td>
                <td>${$.pk?"primary":""}</td>
              </tr>`)}
          </tbody>
        <//>
      </div>`:m=h`
      <${Vn} key=${u.filter($=>$.inList).map($=>$.name).join("|")}
        db=${e} title=${a} table=${a} fields=${u} onError=${i} />`:m=h`
      <${re} what="Table" action=${h`
        <${Ee} variant="primary"
          onClick=${()=>y(["data",t],{replace:!0})}>
          All tables
        <//>`} />`,h`
    <${T} title=${a}
      subtitle=${n?`Structure \xB7 ${t}`:t}
      back=${n?["data",t,"table",a]:["data",t]}
      actions=${h`${p}${k}`}>
      ${o}
      ${m}
    <//>`}function oo({db:e,sql:t,setSql:a,result:n,setResult:o,history:i,setHistory:s}){async function r(){let d=t.trim();if(!d)return;let l=performance.now(),u=()=>Math.max(0,Math.round(performance.now()-l));try{if(/^(select|pragma|with|explain)\b/i.test(d)){let v=await e.select(d);o({kind:"rows",rows:v,ms:u(),limit:to})}else if(/^insert\b/i.test(d)){let v=await e.insert(d);o({kind:"text",text:`Inserted row ${v}`,ms:u()})}else{let v=await e.exec(d);o({kind:"text",text:`${et(v,"row")} changed`,ms:u()})}s(v=>[d,...v.filter(k=>k!==d)].slice(0,10))}catch(v){o({kind:"error",text:v.message??String(v)})}}let c=null;return n?.kind==="error"?c=h`<${M} error=${n.text} onClose=${()=>o(null)} />`:n?.kind==="text"?c=h`<div class="ac-results-meta" role="status">${n.text} · ${n.ms} ms</div>`:n?.kind==="rows"&&(c=h`<${io} result=${n}
      onShowAll=${()=>o({...n,limit:1/0})} />`),h`
    <div class="ac-sql">
      <label class="visually-hidden" for="ac-sql-input">SQL statement</label>
      <textarea id="ac-sql-input" class="form-control ac-sql-input"
        placeholder="select * from …" spellcheck="false" autocapitalize="off"
        autocomplete="off" autocorrect="off" value=${t}
        onInput=${d=>a(d.currentTarget.value)}
        onKeyDown=${d=>{(d.metaKey||d.ctrlKey)&&d.key==="Enter"&&(d.preventDefault(),r())}}></textarea>
      <div class="ac-button-row">
        <${Ee} variant="primary" onClick=${r} disabled=${!t.trim()}>
          <${C} name="fa-solid fa-play" /> Run
        <//>
        <${Ee} variant="outline-secondary"
          onClick=${()=>{a(""),o(null)}}>
          Clear
        <//>
        ${i.length?h`
              <${we}>
                <${we.Toggle} variant="outline-secondary">
                  <${C} name="fa-solid fa-clock-rotate-left" /> History
                <//>
                <${we.Menu} popperConfig=${{strategy:"fixed"}}>
                  ${i.map(d=>h`
                    <${we.Item} as="button" key=${d}
                      className="font-monospace text-truncate" style=${{maxWidth:"22rem"}}
                      onClick=${()=>a(d)}>${d}<//>`)}
                <//>
              <//>`:null}
      </div>
      ${c}
    </div>`}function io({result:e,onShowAll:t}){let{rows:a,ms:n,limit:o}=e;if(!a.length)return h`<div class="ac-results-meta" role="status">No rows · ${n} ms</div>`;let i=[...new Set(a.flatMap(r=>Object.keys(r)))],s=a.slice(0,o);return h`
    <div class="ac-results-meta" role="status">
      ${et(a.length,"row")} · ${n} ms
    </div>
    <div class="ac-results">
      <${ba} hover size="sm">
        <thead>
          <tr>${i.map(r=>h`<th key=${r} scope="col">${r}</th>`)}</tr>
        </thead>
        <tbody>
          ${s.map((r,c)=>h`
            <tr key=${c}>
              ${i.map(d=>{let l=r[d];return h`
                  <td key=${d} class=${typeof l=="number"?"ac-num":""}
                      title=${l==null?void 0:String(l)}>
                    ${l==null?h`<span class="ac-null">NULL</span>`:String(l)}
                  </td>`})}
            </tr>`)}
        </tbody>
      <//>
    </div>
    ${a.length>s.length?h`<div>
          <${Ee} variant="outline-secondary" onClick=${t}>
            Show all ${a.length}
          <//>
        </div>`:null}`}import{html as tt,useState as so,THEMES as ro,applyTheme as ga,currentTheme as ka,currentMode as lo,themeHasModes as co,isDark as Sa}from"acelery/ui.js";import{EDITOR_THEMES as uo,isDarkTheme as fo}from"acelery/editor.js";var $o="/system/doc/aCelery-guide.pdf",mo=e=>e.charAt(0).toUpperCase()+e.slice(1),Ca=e=>e==="acelery"?"aCelery":mo(e),xa="acelery.keepAwake";function po(){try{return sessionStorage.getItem(xa)==="1"}catch{return!1}}function ho(e){try{sessionStorage.setItem(xa,e?"1":"0")}catch{}}function Da({settings:e,updateSettings:t}){let[a,n]=so(po),o=ka(),i=co(o),s=e.editortheme??"";function r(l){t({theme:ga(l)})}function c(l){ga(ka(),{mode:l}),t({"theme.mode":l})}function d(l){n(l),ho(l),oe({action:"setKeepAwake",on:l})}return tt`
    <${T} title="Settings">
      <section class="ac-section" aria-labelledby="settings-appearance">
        <h2 class="ac-section-title" id="settings-appearance">Appearance</h2>
        <div class="ac-list">
          <div class="ac-setting">
            <div class="ac-setting-label">
              <span class="ac-setting-name" id="settings-mode">Mode</span>
              <div class="ac-setting-help">
                ${i?"Follow the device, or always light or dark.":`${Ca(o)} is always ${Sa()?"dark":"light"}.`}
              </div>
            </div>
            <${ze} role="radiogroup" label="Mode"
              value=${i?lo():Sa()?"dark":"light"}
              onChange=${c}
              options=${[{value:"system",label:"System",icon:"fa-solid fa-circle-half-stroke",disabled:!i},{value:"light",label:"Light",icon:"fa-solid fa-sun",disabled:!i},{value:"dark",label:"Dark",icon:"fa-solid fa-moon",disabled:!i}]} />
          </div>
          <div class="ac-setting">
            <div class="ac-setting-label">
              <label for="settings-theme">Theme</label>
              <div class="ac-setting-help">aCelery and Default follow Mode.</div>
            </div>
            <select id="settings-theme" class="form-select" value=${o}
                    onChange=${l=>r(l.currentTarget.value)}>
              ${ro.map(l=>tt`<option key=${l} value=${l}>${Ca(l)}</option>`)}
            </select>
          </div>
          <div class="ac-setting">
            <div class="ac-setting-label">
              <label for="settings-editor">Editor colours</label>
              <div class="ac-setting-help">
                ${s?`A ${fo(s)?"dark":"light"} scheme, whatever the mode.`:"Light or dark, to match the app."}
              </div>
            </div>
            <select id="settings-editor" class="form-select" value=${s}
                    onChange=${l=>t({editortheme:l.currentTarget.value})}>
              ${uo.map(l=>tt`<option key=${l.value} value=${l.value}>${l.label}</option>`)}
            </select>
          </div>
        </div>
      </section>

      ${ce()?tt`
            <section class="ac-section" aria-labelledby="settings-device">
              <h2 class="ac-section-title" id="settings-device">This device</h2>
              <div class="ac-list">
                <${G} icon="fa-solid fa-wifi" title="Network access"
                  meta="Let other devices on your network open aCelery"
                  onOpen=${()=>oe({action:"showNetworkAccess"})} />
                <${G} icon="fa-solid fa-box-archive" title="Back up data"
                  meta="Save your databases, files and apps as one zip"
                  onOpen=${()=>oe({action:"backupData"})} />
                <${G} icon="fa-solid fa-clock-rotate-left" title="Restore data"
                  meta="Put a backup zip back on this device"
                  onOpen=${()=>oe({action:"restoreData"})} />
                <div class="ac-setting">
                  <div class="ac-setting-label">
                    <label for="settings-awake">Keep screen on</label>
                    <div class="ac-setting-help">While aCelery is open</div>
                  </div>
                  <div class="form-check form-switch m-0">
                    <input id="settings-awake" class="form-check-input" type="checkbox"
                      role="switch" checked=${a}
                      onChange=${l=>d(l.currentTarget.checked)} />
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
              <${C} name="fa-solid fa-file-lines" />
            </div>
            <div class="ac-row-body">
              <a class="ac-stretch ac-row-title" href=${$o}
                 target="_blank" rel="noopener">User's guide</a>
              <div class="ac-row-meta">
                ${ce()?"The PDF, opened with your reader":"The PDF, in a new tab"}
              </div>
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
    <//>`}var La=Promise.resolve();function go(e){let t=La.then(()=>Ut(e));return La=t.catch(a=>console.error("aCelery: could not save settings",a)),t}function ko(e){let t=String(e).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);return t?"#"+t.slice(1,4).map(a=>Number(a).toString(16).padStart(2,"0")).join(""):null}function wt(){ce()&&requestAnimationFrame(()=>{let e=document.querySelector(".ac-appbar")??document.body,t=ko(getComputedStyle(e).backgroundColor);oe({action:"setChrome",dark:Pa(),...t?{color:t}:{}})})}function So(){let e=Pt(),[t,a]=Ea(null),[,n]=Ea(0);Aa(()=>{Nt().then(u=>{Ta(u.theme||"acelery",{mode:u["theme.mode"]||"system"}),a(u)},u=>{console.error("aCelery: could not read settings",u),Ta("acelery",{mode:"system"}),a({})})},[]),Aa(()=>{let u=()=>{n(k=>k+1),wt()};document.addEventListener("acelery:themechange",u);let v=document.getElementById("xbtheme");return v?.addEventListener("load",wt),()=>{document.removeEventListener("acelery:themechange",u),v?.removeEventListener("load",wt)}},[]);let o=yo(u=>{a(v=>({...v,...u})),go(u)},[]);if(!t)return N`
      <${st} section=${e.section}>
        <${T} title="aCelery"><${j} rows=${3} /><//>
      <//>`;let i=t.editortheme,s=i&&wo.some(u=>u.value===i)?i:Pa()?"dark":"light",{section:r,parts:c}=e,d={settings:t,updateSettings:o},l;switch(r){case"home":l=N`<${na} ...${d} />`;break;case"apps":l=N`<${ia} ...${d} />`;break;case"code":l=c[0]?N`<${ha} key=${c[0]} project=${c[0]} fileName=${c[1]}
                 editorTheme=${s} ...${d} />`:N`<${ca} ...${d} />`;break;case"data":l=c[0]?N`<${wa} key=${c[0]} dbName=${c[0]}
                 parts=${c.slice(1)} ...${d} />`:N`<${ya} ...${d} />`;break;case"settings":l=N`<${Da} ...${d} />`;break;default:l=N`
        <${T} title="Not found">
          <${re} what="Page" action=${N`
            <${bo} variant="primary" onClick=${()=>y([],{replace:!0})}>
              Go home
            <//>`} />
        <//>`}return N`
    <${Ot}>
      <${st} section=${r}>${l}<//>
    <//>`}function Co(e=document.body){It(),vo(N`<${So} />`,e)}export{Co as default};
