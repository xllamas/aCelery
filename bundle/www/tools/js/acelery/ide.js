import{html as R,render as Nn,useState as ca,useEffect as da,useCallback as Un,Button as Kn,applyTheme as ua,isDark as $a}from"acelery/ui.js";import{EDITOR_THEMES as Gn}from"acelery/editor.js";import{html as U,useState as Ia}from"acelery/ui.js";import{useState as ba,useEffect as wa}from"acelery/ui.js";function ga(e){let t=String(e??"").replace(/^#\/?/,"").split("/").filter(Boolean).map(ka);return{section:t[0]??"home",parts:t.slice(1)}}function ka(e){try{return decodeURIComponent(e)}catch{return e}}function G(e){return"#/"+e.map(t=>encodeURIComponent(t)).join("/")}var ye=()=>window.location.hash||"#/",Ue=new Set;function Ke(){for(let e of Ue)e(ye())}var ht=!1;function Sa(){ht||(ht=!0,window.addEventListener("popstate",Ke),window.addEventListener("hashchange",Ke))}var X=null;function vt(e){return X=e,()=>{X===e&&(X=null)}}async function h(e,{replace:t=!1}={}){let a=G(e);a!==ye()&&(X&&!await X()||(t?window.history.replaceState({from:window.history.state?.from??null},"",a):window.history.pushState({from:ye()},"",a),Ke()))}async function yt(e){let t=G(e);if(window.history.state?.from===t){if(X&&!await X())return;window.history.back()}else await h(e,{replace:!0})}function bt(){Sa();let[e,t]=ba(ye());return wa(()=>(Ue.add(t),t(ye()),()=>Ue.delete(t)),[]),ga(e)}function wt(){new URLSearchParams(window.location.search).get("opt")==="apps"&&window.history.replaceState(null,"",window.location.pathname+G(["apps"]))}var Ge=null;function be(e){Ge=e}function Le(e){return Ge!==e?!1:(Ge=null,!0)}import{html as w,useState as Ie,useEffect as Ca,useCallback as xa,useContext as Da,useRef as St,createContext as Ea,Modal as Pe,Dropdown as Ae,Placeholder as gt,Alert as Ta,Toast as La,Button as Xn}from"acelery/ui.js";var g=({name:e})=>w`<i class=${e} aria-hidden="true"></i>`,Aa="(min-width: 768px)",Ct="(min-width: 992px)";function ze(e){let t=()=>!!globalThis.matchMedia?.(e).matches,[a,n]=Ie(t);return Ca(()=>{let o=globalThis.matchMedia?.(e);if(!o?.addEventListener)return;let i=()=>n(o.matches);return i(),o.addEventListener("change",i),()=>o.removeEventListener("change",i)},[e]),a}function H({icon:e,label:t,onClick:a,disabled:n,primary:o,className:i}){return w`
    <button type="button" aria-label=${t} title=${t}
      class=${`ac-iconbtn${o?" is-primary":""} ${i??""}`}
      disabled=${!!n} onClick=${a}>
      <${g} name=${e} />
    </button>`}function M({icon:e,title:t,children:a,action:n}){return w`
    <div class="ac-empty">
      <div class="ac-empty-icon"><${g} name=${e} /></div>
      <h2>${t}</h2>
      ${a?w`<p>${a}</p>`:null}
      ${n??null}
    </div>`}function A({rows:e=3,grid:t=!1}){let a=(o,i)=>w`
    <${gt} as="div" animation="glow">
      <${gt} xs=${o} size=${i} />
    <//>`,n=Array.from({length:e},(o,i)=>i);return t?w`
      <div class="ac-grid ac-skeleton" aria-busy="true" aria-label="Loading">
        ${n.map(o=>w`
          <div class="ac-card" key=${o}>
            <div class="ac-tile" style=${{background:"var(--ac-surface-2)"}}></div>
            ${a(8)}${a(10,"sm")}
          </div>`)}
      </div>`:w`
    <div class="ac-list ac-skeleton" aria-busy="true" aria-label="Loading">
      ${n.map(o=>w`
        <div class="ac-row" key=${o}>
          <div class="ac-row-icon"></div>
          <div class="ac-row-body">${a(6)}${a(4,"sm")}</div>
        </div>`)}
    </div>`}function j({error:e,onClose:t}){return e?w`
    <${Ta} variant="danger" className="ac-error" dismissible=${!!t}
              onClose=${t}>
      <${g} name="fa-solid fa-triangle-exclamation" />
      <span>${e?.message??String(e)}</span>
    <//>`:null}function z({what:e,action:t}){return w`
    <${M} icon="fa-solid fa-magnifying-glass" title=${`${e} not found`}
      action=${t}>
      It may have been deleted, or the link is out of date.
    <//>`}var xt=Ea(()=>{});function Dt({children:e}){let[t,a]=Ie([]),n=St(0),o=xa(r=>{let s=++n.current;a(c=>[...c.slice(-2),{id:s,text:r}])},[]),i=r=>a(s=>s.filter(c=>c.id!==r));return w`
    <${xt.Provider} value=${o}>
      ${e}
      <div class="ac-toasts">
        ${t.map(r=>w`
          <${La} key=${r.id} className="ac-toast" show autohide delay=${4e3}
                    onClose=${()=>i(r.id)}
                    role="status" aria-live="polite">
            <div class="d-flex align-items-center">
              <div class="toast-body">${r.text}</div>
              <${H} icon="fa-solid fa-xmark" label="Dismiss"
                onClick=${()=>i(r.id)} />
            </div>
          <//>`)}
      </div>
    <//>`}var O=()=>Da(xt);function se({show:e,onHide:t,title:a,children:n}){return w`
    <${Pe} show=${e} onHide=${t} centered dialogClassName="ac-sheet">
      ${a?w`<${Pe.Header} closeButton>
            <${Pe.Title} as="h2" className="fs-5">${a}<//>
          <//>`:null}
      ${n}
    <//>`}function ee({label:e="More actions",title:t,actions:a}){let n=ze(Aa),[o,i]=Ie(!1),r=St(null),s=a.filter(Boolean);return s.length?n?w`
      <${Ae} align="end" className="ac-over">
        <${Ae.Toggle} as="button" type="button" bsPrefix="ac-iconbtn"
                            aria-label=${e} title=${e}>
          <${g} name="fa-solid fa-ellipsis-vertical" />
        <//>
        <${Ae.Menu} popperConfig=${{strategy:"fixed"}}>
          ${s.map(c=>w`
            <${Ae.Item} as="button" key=${c.label} disabled=${!!c.disabled}
                              className=${c.danger?"is-danger":""}
                              onClick=${c.onSelect}>
              ${c.icon?w`<${g} name=${c.icon} />`:null}
              <span>${c.label}</span>
            <//>`)}
        <//>
      <//>`:w`
    <span class="ac-over">
      <${H} icon="fa-solid fa-ellipsis-vertical" label=${e}
        onClick=${()=>i(!0)} />
      <${Pe} show=${o} onHide=${()=>i(!1)} centered
                dialogClassName="ac-sheet"
                onExited=${()=>{let c=r.current;r.current=null,c?.()}}>
        ${t?w`<div class="ac-sheet-title">${t}</div>`:null}
        <div class="ac-actions" role="menu" aria-label=${e}>
          ${s.map(c=>w`
            <button key=${c.label} type="button" role="menuitem"
                    class=${`ac-action${c.danger?" is-danger":""}`}
                    disabled=${!!c.disabled}
                    onClick=${()=>{r.current=c.onSelect,i(!1)}}>
              ${c.icon?w`<${g} name=${c.icon} />`:null}
              <span>${c.label}</span>
            </button>`)}
        </div>
      <//>
    </span>`:null}function Fe({label:e,value:t,options:a,onChange:n,role:o="tablist"}){let i=o==="tablist"?"tab":"radio",r=o==="tablist"?"aria-selected":"aria-checked";return w`
    <div class="ac-segmented" role=${o} aria-label=${e}>
      ${a.map(s=>w`
        <button key=${s.value} type="button" role=${i} class="ac-segment"
                ...${{[r]:t===s.value?"true":"false"}}
                disabled=${!!s.disabled} onClick=${()=>n(s.value)}>
          ${s.icon?w`<${g} name=${s.icon} />`:null}
          <span>${s.label}</span>
        </button>`)}
    </div>`}var kt=["#3d6b63","#1f6f8b","#6b4fa0","#a14a2b","#2e7d32","#8a5a00","#9c2f5e","#45617d"];function Pa(e){let t=0;for(let a of e)t=t*31+a.codePointAt(0)>>>0;return kt[t%kt.length]}function Je({name:e,icon:t}){let[a,n]=Ie(!1);return t&&!a?w`
      <div class="ac-tile">
        <img src=${t} alt="" onError=${()=>n(!0)} />
      </div>`:w`
    <div class="ac-tile" style=${{background:Pa(e)}} aria-hidden="true">
      ${([...e][0]??"?").toUpperCase()}
    </div>`}function Me({project:e,verb:t,onOpen:a,actions:n}){return w`
    <div class="ac-card">
      <div class="ac-card-head">
        <${Je} name=${e.name} icon=${e.icon} />
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
    </div>`}function J({icon:e,title:t,meta:a,onOpen:n,selected:o,actions:i,badge:r}){return w`
    <div class=${`ac-row${n?" is-action":""}${o?" is-selected":""}`}>
      <div class="ac-row-icon" aria-hidden="true"><${g} name=${e} /></div>
      <div class="ac-row-body">
        ${n?w`<button type="button" class="ac-stretch ac-row-title"
                   aria-current=${o?"true":void 0}
                   onClick=${n}>${t}</button>`:w`<div class="ac-row-title">${t}</div>`}
        ${a?w`<div class="ac-row-meta">${a}</div>`:null}
      </div>
      ${r?w`<span class="ac-badge">${r}</span>`:null}
      ${i?w`<${ee} title=${t} label=${`Actions for ${t}`}
                 actions=${i} />`:null}
    </div>`}var Fa=[{key:"home",path:[],label:"Home",icon:"fa-solid fa-house"},{key:"apps",path:["apps"],label:"Apps",icon:"fa-solid fa-table-cells"},{key:"code",path:["code"],label:"Code",icon:"fa-solid fa-code"},{key:"data",path:["data"],label:"Data",icon:"fa-solid fa-database"},{key:"settings",path:["settings"],label:"Settings",icon:"fa-solid fa-gear"}];function Et({section:e}){return Fa.map(t=>U`
      <a key=${t.key} href=${G(t.path)}
         class=${`ac-navitem${t.key==="settings"?" is-settings":""}`}
         aria-current=${e===t.key?"page":void 0}
         onClick=${a=>{a.button!==0||a.metaKey||a.ctrlKey||a.shiftKey||a.altKey||(a.preventDefault(),h(t.path,{replace:!0}))}}>
        <span class="ac-navicon"><${g} name=${t.icon} /></span>
        <span class="ac-navlabel">${t.label}</span>
      </a>`)}function We({section:e,children:t}){return U`
    <div class="ac-frame">
      <nav class="ac-rail" aria-label="Main">
        <div class="ac-brand">
          <span class="ac-brand-mark" aria-hidden="true">
            <${g} name="fa-solid fa-seedling" />
          </span>
          <span class="ac-brand-name">aCelery</span>
        </div>
        <${Et} section=${e} />
      </nav>
      <main class="ac-main">${t}</main>
      <nav class="ac-bottomnav" aria-label="Main">
        <${Et} section=${e} />
      </nav>
    </div>`}function D({title:e,subtitle:t,back:a,actions:n,subbar:o,fab:i,fill:r,children:s}){let[c,d]=Ia(!1);return U`
    <section class="ac-screen" aria-labelledby="ac-screen-title">
      <header class=${`ac-appbar${a?"":" no-back"}${c?" is-scrolled":""}${o?" has-subbar":""}`}>
        ${a?U`<${H} icon="fa-solid fa-arrow-left" label="Back"
                   onClick=${()=>yt(a)} />`:null}
        <div class="ac-appbar-titles">
          <h1 class="ac-appbar-title" id="ac-screen-title">${e}</h1>
          ${t?U`<div class="ac-appbar-subtitle">${t}</div>`:null}
        </div>
        <div class="ac-appbar-actions">${n??null}</div>
      </header>
      ${o?U`<div class="ac-subbar">${o}</div>`:null}
      ${r?U`<div class="ac-content is-fill">${s}</div>`:U`
            <div class=${`ac-content${i?" has-fab":""}`}
                 onScroll=${l=>d(l.currentTarget.scrollTop>0)}>
              <div class="ac-content-inner">${s}</div>
            </div>`}
      ${i?U`
            <button type="button" class="ac-fab" aria-label=${i.label}
                    onClick=${i.onClick}>
              <${g} name=${i.icon} />
              <span class="ac-fab-label" aria-hidden="true">${i.label}</span>
            </button>`:null}
    </section>`}import*as I from"acelery/file.js";import{openDB as Lt}from"acelery/sql.js";var Tt="/system/scaffold/",Ma=/\{\{name\}\}/g;function ja(e,t){let a=new RegExp(e.namePattern),{messages:n}=e;return{entry:e.entry,nameProblem(o){let i=(o??"").trim();return i?a.test(i)?null:n.nameInvalid:n.nameRequired},descriptionProblem(o){return(o??"").length<=e.descriptionMax?null:n.descriptionTooLong},projectName(o){let i=o.trim();return i.charAt(0).toUpperCase()+i.slice(1)},files(o,i){let r={"acelery_app.json":JSON.stringify({name:o,description:i??"",entry:e.entry})};for(let s of Object.keys(e.templates))r[s]=t[s].replace(Ma,o);return r}}}var Qe=null;function je(){return Qe??=(async()=>{let e=async n=>{let o=await fetch(Tt+n);if(!o.ok)throw new Error(`${Tt}${n}: ${o.status}`);return o.text()},t=JSON.parse(await e("scaffold.json")),a={};for(let[n,o]of Object.entries(t.templates))a[n]=await e(o);return ja(t,a)})().catch(e=>{throw Qe=null,e}),Qe}async function At(){let e=await Lt("acelery.db");try{await e.exec("create table if not exists config (cfg_key text unique, cfg_value text)");let t=await e.select("select cfg_key, cfg_value from config");return Object.fromEntries(t.map(a=>[a.cfg_key,a.cfg_value]))}finally{await e.close()}}async function Pt(e){let t=await Lt("acelery.db");try{await t.exec("create table if not exists config (cfg_key text unique, cfg_value text)");for(let[a,n]of Object.entries(e))await t.exec("insert into config (cfg_key, cfg_value) values (?, ?) on conflict(cfg_key) do update set cfg_value = excluded.cfg_value",[a,n??""])}finally{await t.close()}}var Ve=null;function It(){return Ve??=I.externalStoragePath().catch(e=>{throw Ve=null,e}),Ve}async function K(){return await It()+"/aCelery/www/user/"}async function Ba(){return await It()+"/aCelery/"}function Ra(e,t){return typeof t!="string"||!/^[\w.-]+(\/[\w.-]+)*$/.test(t)||t.split("/").includes("..")?null:`/user/${encodeURIComponent(e)}/${t}`}async function Ye(e,t){t??=await K();try{let a=await I.open("acelery_app.json",t+e),n=await a.read();await a.close();let o=n?JSON.parse(n):{};return{description:typeof o.description=="string"?o.description:"",entry:typeof o.entry=="string"&&o.entry?o.entry:"main.js",icon:Ra(e,o.icon)}}catch{return{description:"",entry:"main.js",icon:null}}}async function le(){let e=await K(),t=await I.listFiles("user",e.replace(/user\/$/,"")),a=[];for(let n of t)n.directory&&a.push({name:n.fname,...await Ye(n.fname,e)});return a.sort((n,o)=>n.name.localeCompare(o.name))}async function Ft(e){let t=await K();return(await I.listFiles("user",t.replace(/user\/$/,""))).some(n=>n.directory&&n.fname===e)}async function Be(e){return(await I.listFiles(e,await K())).filter(a=>!a.directory).map(a=>({name:a.fname,length:a.length,modified:a.lastmodified})).sort((a,n)=>a.name.localeCompare(n.name))}async function Mt(e,t){let a=await I.open(t,await K()+e);try{return await a.read()}finally{await a.close()}}async function we(e,t,a){let n=await I.open(t,await K()+e);try{await n.write(a)}finally{await n.close()}}async function jt(e,t){await(await I.open(t,await K()+e)).delete()}async function ce(e){await(await I.open(e,await K())).delete()}async function Bt({name:e,description:t}){let a=await je(),n=a.projectName(e),o=await K();await I.mkdir(n,o);for(let[i,r]of Object.entries(a.files(n,t)))await we(n,i,r);return n}async function ge(){return(await I.listFiles("db",await Ba())).filter(t=>!t.directory&&!t.fname.includes("journal")).map(t=>({name:t.fname,length:t.length,modified:t.lastmodified})).sort((t,a)=>t.name.localeCompare(a.name))}async function Rt(e){return(await ge()).some(t=>t.name===e)}function Re(e){if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(e))throw new Error(`"${e}" is not a usable table name`);return e}function de(){return!!globalThis.ACeleryHost}function ke(e){globalThis.ACeleryHost?.postMessage(JSON.stringify(e))}function ue(e){return typeof e!="number"||!Number.isFinite(e)?"":e<1024?`${e} B`:e<1024*1024?`${(e/1024).toFixed(e<10240?1:0)} KB`:`${(e/1024/1024).toFixed(1)} MB`}function Ht(e){if(typeof e!="number"||!e)return"";let t=new Date(e);return t.toDateString()===new Date().toDateString()?t.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):t.toLocaleDateString([],{day:"numeric",month:"short",year:"numeric"})}import{html as W,useState as Ot,useEffect as Ha,Button as Se}from"acelery/ui.js";import{runApp as qt}from"acelery/export.js";function Oa(e=new Date){let t=e.getHours();return t<5?"Working late":t<12?"Good morning":t<18?"Good afternoon":"Good evening"}var _t=e=>t=>{t.button!==0||t.metaKey||t.ctrlKey||t.shiftKey||t.altKey||(t.preventDefault(),h(e))};function Nt({settings:e,updateSettings:t}){let[a,n]=Ot(null),[o,i]=Ot(null);Ha(()=>{let v=!0;return(async()=>{try{let[m,$]=await Promise.all([le(),ge()]);if(!v)return;n({projects:m,databases:$});let S={},T=e["recent.project"];T&&!m.some(C=>C.name===T)&&(S["recent.project"]="",S["recent.file"]="");let b=e["recent.db"];b&&!$.some(C=>C.name===b)&&(S["recent.db"]=""),Object.keys(S).length&&t(S)}catch(m){if(!v)return;i(m),n({projects:[],databases:[]})}})(),()=>{v=!1}},[]);let r=a?.projects.find(v=>v.name===e["recent.project"]),s=r?e["recent.file"]:"",c=a?.databases.find(v=>v.name===e["recent.db"]),d=a?.projects.find(v=>v.name==="Example"),l=()=>{be("new-project"),h(["code"])},u=()=>{be("new-db"),h(["data"])},y;a?r||c?y=W`
      <div class="ac-continue">
        ${r?W`
              <div class="ac-continue-card">
                <${Je} name=${r.name} icon=${r.icon} />
                <div class="ac-row-body">
                  <div class="ac-row-title">${r.name}</div>
                  <div class="ac-row-meta">${s||r.description||"Project"}</div>
                </div>
                <div class="ac-button-row">
                  <${Se} variant="outline-primary"
                    onClick=${()=>h(s?["code",r.name,s]:["code",r.name])}>
                    Open
                  <//>
                  <${Se} variant="primary"
                    onClick=${()=>qt(r.name,r.name,!0)}>
                    <${g} name="fa-solid fa-play" /> Run
                  <//>
                </div>
              </div>`:null}
        ${c?W`
              <div class="ac-continue-card">
                <div class="ac-row-icon" aria-hidden="true">
                  <${g} name="fa-solid fa-database" />
                </div>
                <div class="ac-row-body">
                  <div class="ac-row-title">${c.name}</div>
                  <div class="ac-row-meta">Database · ${ue(c.length)}</div>
                </div>
                <div class="ac-button-row">
                  <${Se} variant="outline-primary" onClick=${()=>h(["data",c.name])}>
                    Open
                  <//>
                </div>
              </div>`:null}
      </div>`:y=W`
      <div class="ac-welcome">
        <h2>Welcome to aCelery</h2>
        <p>
          An aCelery app is a few JavaScript files you write on this device and
          run straight away. Try the example, or start your own.
        </p>
        <div class="ac-button-row">
          ${d?W`<${Se} variant="primary"
                     onClick=${()=>qt(d.name,d.name,!1)}>
                <${g} name="fa-solid fa-play" /> Run the Example app
              <//>`:null}
          <${Se} variant=${d?"outline-primary":"primary"} onClick=${l}>
            Create your first app
          <//>
        </div>
      </div>`:y=W`<${A} rows=${2} />`;let k=v=>v?String(v.length):"\u2013";return W`
    <${D} title=${W`
      <span class="ac-brand-inline">
        <span class="ac-brand-mark" aria-hidden="true"><${g} name="fa-solid fa-seedling" /></span>
        aCelery
      </span>`}>
      <${j} error=${o} onClose=${()=>i(null)} />
      <div class="ac-home">
        <div>
          <div class="ac-hero">
            <h2>${Oa()}</h2>
            <p>Build and run your own JavaScript apps.</p>
          </div>
          <section class="ac-section" aria-label=${r||c?"Continue":"Get started"}>
            <h2 class="ac-section-title">${r||c?"Continue":"Get started"}</h2>
            ${y}
          </section>
        </div>
        <div>
          <section class="ac-section">
            <h2 class="ac-section-title">Create</h2>
            <div class="ac-quick">
              <button type="button" class="ac-quick-btn" onClick=${l}>
                <span class="ac-quick-icon"><${g} name="fa-solid fa-code" /></span>
                New app
              </button>
              <button type="button" class="ac-quick-btn" onClick=${u}>
                <span class="ac-quick-icon"><${g} name="fa-solid fa-database" /></span>
                New database
              </button>
            </div>
          </section>
          <section class="ac-section">
            <h2 class="ac-section-title">On this device</h2>
            <div class="ac-stats">
              <a class="ac-stat" href=${G(["apps"])} onClick=${_t(["apps"])}>
                <span class="ac-stat-value">${k(a?.projects)}</span>
                <span class="ac-stat-label">${a?.projects.length===1?"app":"apps"}</span>
              </a>
              <a class="ac-stat" href=${G(["data"])} onClick=${_t(["data"])}>
                <span class="ac-stat-value">${k(a?.databases)}</span>
                <span class="ac-stat-label">
                  ${a?.databases.length===1?"database":"databases"}
                </span>
              </a>
            </div>
          </section>
        </div>
      </div>
    <//>`}import{html as _,useState as Ze,useEffect as Ua,useCallback as Ka,Button as Ga}from"acelery/ui.js";import{runApp as za,exportProject as Ja}from"acelery/export.js";import{html as qa,useState as _a,useCallback as Na,Modal as Ce,Button as Ut}from"acelery/ui.js";function q(){let[e,t]=_a(null),a=Na((i,{title:r="aCelery",danger:s=!1,confirmLabel:c="OK",cancelLabel:d="Cancel",dismissValue:l=!1}={})=>new Promise(u=>t({message:i,title:r,danger:s,confirmLabel:c,cancelLabel:d,dismissValue:l,resolve:u})),[]),n=i=>{e?.resolve(i),t(null)},o=e?qa`
        <${Ce} show onHide=${()=>n(e.dismissValue)} centered>
          <${Ce.Header} closeButton>
            <${Ce.Title} as="h2" className="fs-5">${e.title}<//>
          <//>
          <${Ce.Body}>${e.message}<//>
          <${Ce.Footer}>
            <${Ut} variant="outline-secondary" onClick=${()=>n(!1)}>
              ${e.cancelLabel}
            <//>
            <${Ut} variant=${e.danger?"danger":"primary"}
                       onClick=${()=>n(!0)}>
              ${e.confirmLabel}
            <//>
          <//>
        <//>`:null;return{confirm:a,dialog:o}}var Xe=6;function et({value:e,onChange:t,label:a}){return _`
    <div class="ac-search" role="search">
      <${g} name="fa-solid fa-magnifying-glass" />
      <input type="search" class="form-control" aria-label=${a}
             placeholder=${a} value=${e}
             onInput=${n=>t(n.currentTarget.value)} />
    </div>`}function tt(e,t){let a=t.trim().toLowerCase();return!a||e.name.toLowerCase().includes(a)||e.description.toLowerCase().includes(a)}async function xe(e,t){return e(`${t} and all of its files will be deleted. This cannot be undone.`,{title:`Delete ${t}?`,danger:!0,confirmLabel:"Delete"})}function Kt({settings:e,updateSettings:t}){let[a,n]=Ze(null),[o,i]=Ze(null),[r,s]=Ze(""),c=O(),{confirm:d,dialog:l}=q(),u=Ka(async()=>{try{n(await le())}catch(v){i(v),n([])}},[]);Ua(()=>{u()},[u]);async function y(v){if(await xe(d,v.name))try{await ce(v.name),e["recent.project"]===v.name&&t({"recent.project":"","recent.file":""}),c(`Deleted ${v.name}`),await u()}catch(m){i(m)}}let k;if(a===null)k=_`<${A} rows=${4} grid />`;else if(!a.length)k=_`
      <${M} icon="fa-solid fa-table-cells" title="No apps yet"
        action=${_`
          <${Ga} variant="primary"
            onClick=${()=>{be("new-project"),h(["code"])}}>
            Create an app
          <//>`}>
        An app is a folder of JavaScript you write in Code.
      <//>`;else{let v=a.filter(m=>tt(m,r));k=_`
      ${a.length>Xe?_`<div class="ac-toolbar">
            <${et} label="Search apps" value=${r} onChange=${s} />
          </div>`:null}
      ${v.length?_`
            <div class="ac-grid">
              ${v.map(m=>_`
                <${Me} key=${m.name} project=${m} verb="Run"
                  onOpen=${()=>za(m.name,m.name,!1)}
                  actions=${[{label:"Edit in Code",icon:"fa-solid fa-pen-to-square",onSelect:()=>h(["code",m.name])},{label:"Export",icon:"fa-solid fa-file-export",onSelect:()=>Ja(m.name)},{label:"Delete",icon:"fa-solid fa-trash",danger:!0,onSelect:()=>y(m)}]} />`)}
            </div>`:_`<p class="text-body-secondary px-1">Nothing matches “${r}”.</p>`}`}return _`
    <${D} title="Apps">
      <${j} error=${o} onClose=${()=>i(null)} />
      ${k}
    <//>
    ${l}`}import{html as B,useState as De,useEffect as Gt,useCallback as Wa,Button as at,Modal as zt,Form as Qa,Input as Jt,notEmpty as Va}from"acelery/ui.js";import{runApp as Ya,exportProject as Za,importProject as Xa}from"acelery/export.js";function en({show:e,scaffold:t,existing:a,onClose:n,onCreate:o}){let i=r=>{let s=(r??"").trim().toLowerCase();return a.some(c=>c.name.toLowerCase()===s)?"A project with that name already exists":!0};return B`
    <${se} show=${e} onHide=${n} title="New project">
      <${Qa} initial=${{name:"",description:""}} onSubmit=${o}>
        <${zt.Body}>
          <${Jt} label="Name" name="name"
            placeholder="Letters and numbers, 16 max"
            autocapitalize="off" autocomplete="off" spellcheck=${!1}
            validate=${[Va("A name is required"),r=>t.nameProblem(r)??!0,i]} />
          <${Jt} label="Description" name="description" as="textarea"
            placeholder="What it does, in a sentence (optional)"
            validate=${[r=>t.descriptionProblem(r)??!0]} />
        <//>
        <${zt.Footer}>
          <${at} variant="outline-secondary" type="button" onClick=${n}>
            Cancel
          <//>
          <${at} variant="primary" type="submit">Create project<//>
        <//>
      <//>
    <//>`}function Wt({settings:e,updateSettings:t}){let[a,n]=De(null),[o,i]=De(null),[r,s]=De(null),[c,d]=De(""),[l,u]=De(()=>Le("new-project")),y=O(),{confirm:k,dialog:v}=q(),m=Wa(async()=>{try{n(await le())}catch(b){s(b),n([])}},[]);Gt(()=>{m()},[m]),Gt(()=>{je().then(i,s)},[]);async function $(b){u(!1);try{let C=await Bt(b);y(`Created ${C}`),h(["code",C,o.entry])}catch(C){s(C)}}async function S(b){if(await xe(k,b.name))try{await ce(b.name),e["recent.project"]===b.name&&t({"recent.project":"","recent.file":""}),y(`Deleted ${b.name}`),await m()}catch(C){s(C)}}let T;if(a===null)T=B`<${A} rows=${4} grid />`;else if(!a.length)T=B`
      <${M} icon="fa-solid fa-folder" title="No projects yet"
        action=${B`
          <${at} variant="primary" onClick=${()=>u(!0)}>
            New project
          <//>`}>
        A project is a folder holding an app's JavaScript, CSS and manifest.
      <//>`;else{let b=a.filter(C=>tt(C,c));T=B`
      ${a.length>Xe?B`<div class="ac-toolbar">
            <${et} label="Search projects" value=${c} onChange=${d} />
          </div>`:null}
      ${b.length?B`
            <div class="ac-grid">
              ${b.map(C=>B`
                <${Me} key=${C.name} project=${C} verb="Open"
                  onOpen=${()=>h(["code",C.name])}
                  actions=${[{label:"Run",icon:"fa-solid fa-play",onSelect:()=>Ya(C.name,C.name,!0)},{label:"Export",icon:"fa-solid fa-file-export",onSelect:()=>Za(C.name)},{label:"Delete",icon:"fa-solid fa-trash",danger:!0,onSelect:()=>S(C)}]} />`)}
            </div>`:B`<p class="text-body-secondary px-1">Nothing matches “${c}”.</p>`}`}return B`
    <${D} title="Code"
      actions=${de()?B`<${H} icon="fa-solid fa-file-import" label="Import project"
                 onClick=${Xa} />`:null}
      fab=${{icon:"fa-solid fa-plus",label:"New project",onClick:()=>u(!0)}}>
      <${j} error=${r} onClose=${()=>s(null)} />
      ${T}
    <//>
    ${o?B`<${en} show=${l} scaffold=${o}
          existing=${a??[]}
          onClose=${()=>u(!1)} onCreate=${$} />`:null}
    ${v}`}import{html as x,useState as Q,useEffect as te,useRef as fe,useCallback as Qt,Button as $e,Modal as Vt,Form as tn,Input as an,Select as nn,notEmpty as on}from"acelery/ui.js";import{runApp as rn,exportProject as sn}from"acelery/export.js";var He=e=>e.includes(".")?e.split(".").pop().toLowerCase():"",nt={js:"JavaScript",mjs:"JavaScript",json:"JSON",css:"CSS",html:"HTML",htm:"HTML",xml:"XML",svg:"SVG",md:"Markdown",txt:"Text"},Yt=new Set(["png","jpg","jpeg","gif","webp","bmp","ico"]),ln=new Set(["zip","woff","woff2","ttf","otf","mp3","mp4","pdf","db"]);function cn(e){let t=He(e);return Yt.has(t)?"fa-solid fa-file-image":["md","txt"].includes(t)?"fa-solid fa-file-lines":nt[t]?"fa-solid fa-file-code":"fa-solid fa-file"}function dn(e){let t=He(e);return Yt.has(t)?"image":ln.has(t)?"binary":"text"}function un({show:e,project:t,existing:a,onClose:n,onCreate:o}){return x`
    <${se} show=${e} onHide=${n} title=${`New file in ${t}`}>
      <${tn} initial=${{name:"",type:".js"}} onSubmit=${o}>
        <${Vt.Body}>
          <${an} label="Name" name="name" placeholder="File name without extension"
            autocapitalize="off" autocomplete="off" spellcheck=${!1}
            validate=${[on("A name is required"),i=>/^[\w.-]+$/.test((i??"").trim())?!0:"Letters, numbers, dot, dash and underscore only"]} />
          <${nn} label="Type" name="type" options=${[{label:"JavaScript",value:".js"},{label:"CSS",value:".css"}]} />
        <//>
        <${Vt.Footer}>
          <${$e} variant="outline-secondary" type="button" onClick=${n}>
            Cancel
          <//>
          <${$e} variant="primary" type="submit"
            onClick=${i=>{let r=i.currentTarget.form,s=`${r.elements.name.value.trim()}${r.elements.type.value}`;a.some(c=>c.name===s)&&(i.preventDefault(),o({duplicate:s}))}}>
            Create file
          <//>
        <//>
      <//>
    <//>`}function Zt({project:e,fileName:t,editorTheme:a,settings:n,updateSettings:o}){let i=ze(Ct),r=O(),{confirm:s,dialog:c}=q(),[d,l]=Q("loading"),[u,y]=Q([]),[k,v]=Q(null),[m,$]=Q(null),[S,T]=Q(!1),[b,C]=Q(null),[oe,pe]=Q(!1),[Ee,he]=Q(!1),ie=fe(null),L=fe(null),P=fe(!1),V=fe(null);V.current=b;let st=fe(a);st.current=a;let re=f=>{P.current=f,pe(f)},lt=Qt(async()=>{y(await Be(e))},[e]);te(()=>{let f=!0;return(async()=>{try{if(!await Ft(e)){f&&l("missing");return}let[E,F]=await Promise.all([Be(e),Ye(e)]);if(!f)return;y(E),v(F),l("ready")}catch(E){if(!f)return;$(E),l("ready")}})(),()=>{f=!1}},[e]),te(()=>{d==="ready"&&!t&&n["recent.project"]!==e&&o({"recent.project":e,"recent.file":""})},[d,e,t]),te(()=>{if(C(null),d!=="ready"||!t)return;let f=!0;return(async()=>{try{let E=await Be(e);if(!f)return;if(!E.some(ya=>ya.name===t)){C({name:t,kind:"missing"});return}let F=dn(t),Ne=F==="text"?await Mt(e,t):null;if(!f)return;C({name:t,kind:F,text:Ne}),o({"recent.project":e,"recent.file":t})}catch(E){f&&$(E)}})(),()=>{f=!1}},[e,t,d]);let ve=Qt(async()=>{let f=L.current,E=V.current;if(!f||E?.kind!=="text")return!0;let F=f.getValue();he(!0);try{return await we(e,E.name,F),L.current===f&&f.getValue()===F&&re(!1),!0}catch(Ne){return $(Ne),!1}finally{he(!1)}},[e]),Te=fe(ve);Te.current=ve,te(()=>{if(b?.kind!=="text"||!ie.current)return;let f=b.name,E=globalThis.aceleryEditor.createEditor(ie.current,{value:b.text,filename:f,theme:st.current,onChange:()=>{P.current||re(!0)},onSave:()=>Te.current()});return L.current=E,re(!1),()=>{P.current&&(we(e,f,E.getValue()).catch(F=>console.error(`aCelery: could not save ${f}`,F)),P.current=!1),E.destroy(),L.current===E&&(L.current=null)}},[b]),te(()=>{L.current?.setTheme(a)},[a]),te(()=>(globalThis.forceSaveFile=()=>{P.current&&Te.current()},()=>{delete globalThis.forceSaveFile}),[]),te(()=>vt(async()=>{if(!P.current)return!0;let f=await s(`Save your changes to ${V.current?.name??"this file"} before leaving?`,{title:"Unsaved changes",confirmLabel:"Save",cancelLabel:"Discard",dismissValue:null});return f===null?!1:f?Te.current():(re(!1),!0)}),[s]);async function ma(){P.current&&!await ve()||rn(e,e,!0)}async function pa(){P.current&&!await ve()||sn(e)}async function ha(f){if(f.duplicate){$(new Error(`${f.duplicate} already exists in ${e}`)),T(!1);return}T(!1);let E=f.name.trim()+f.type;try{await we(e,E,""),await lt(),h(["code",e,E],{replace:i&&!!t})}catch(F){$(F)}}async function ct(f){if(await s(`${f} will be deleted from ${e}. This cannot be undone.`,{title:`Delete ${f}?`,danger:!0,confirmLabel:"Delete"}))try{f===t&&re(!1),await jt(e,f),await lt(),r(`Deleted ${f}`),f===t&&h(["code",e],{replace:!0})}catch(F){$(F)}}async function va(){if(await xe(s,e))try{re(!1),await ce(e),n["recent.project"]===e&&o({"recent.project":"","recent.file":""}),r(`Deleted ${e}`),h(["code"],{replace:!0})}catch(f){$(f)}}let dt=f=>h(["code",e,f],{replace:i&&!!t});if(d==="missing")return x`
      <${D} title=${e} back=${["code"]}>
        <${z} what="Project" action=${x`
          <${$e} variant="primary" onClick=${()=>h(["code"],{replace:!0})}>
            All projects
          <//>`} />
      <//>`;if(d==="loading")return x`
      <${D} title=${e} back=${["code"]}>
        <${A} rows=${4} />
      <//>`;let Y=!!t,ut=x`<${j} error=${m} onClose=${()=>$(null)} />`,ft=u.length?x`
        <div class="ac-list">
          ${u.map(f=>x`
            <${J} key=${f.name} icon=${cn(f.name)} title=${f.name}
              meta=${`${nt[He(f.name)]??"File"} \xB7 ${ue(f.length)}`}
              badge=${f.name===k?.entry?"entry":null}
              selected=${f.name===t}
              onOpen=${()=>dt(f.name)}
              actions=${[{label:"Delete",icon:"fa-solid fa-trash",danger:!0,onSelect:()=>ct(f.name)}]} />`)}
        </div>`:x`
        <${M} icon="fa-solid fa-file-code" title="No files yet"
          action=${x`<${$e} variant="primary" onClick=${()=>T(!0)}>
            New file
          <//>`}>
          Add a JavaScript file for the app to run.
        <//>`,Z;if(Y)b?b.kind==="missing"?Z=x`
      <${z} what="File" action=${x`
        <${$e} variant="primary"
          onClick=${()=>h(["code",e],{replace:!0})}>
          Back to ${e}
        <//>`} />`:b.kind==="image"?Z=x`
      <div class="ac-preview">
        <img alt=${b.name}
          src=${`/user/${encodeURIComponent(e)}/${encodeURIComponent(b.name)}`} />
      </div>`:b.kind==="binary"?Z=x`
      <${M} icon="fa-solid fa-file" title="Not a text file">
        ${b.name} can't be edited here.
      <//>`:Z=x`
      <div class="ac-editor-host"><div class="ac-editor-mount" ref=${ie}></div></div>
      <div class="ac-status">
        <span>${nt[He(b.name)]??"Text"}</span>
        <span role="status">${Ee?"Saving\u2026":oe?"Unsaved changes":"Saved"}</span>
      </div>`:Z=x`<div class="ac-empty" aria-busy="true"><p>Opening ${t}…</p></div>`;else{let f=u.find(E=>E.name===k?.entry);Z=x`
      <${M} icon="fa-solid fa-file-code" title="Pick a file"
        action=${f?x`<${$e} variant="outline-primary" onClick=${()=>dt(f.name)}>
              Open ${f.name}
            <//>`:null}>
        Choose a file from the list to edit it.
      <//>`}let $t=Y?x`${t}${oe?x`<span class="ac-dirty" role="img" aria-label="unsaved changes"></span>`:null}`:e,mt=x`
    ${b?.kind==="text"?x`<${H} icon="fa-solid fa-floppy-disk" label="Save"
               disabled=${!oe||Ee} onClick=${ve} />`:null}
    <${H} icon="fa-solid fa-play" label=${`Run ${e}`} primary onClick=${ma} />
    <${ee} title=${Y?t:e} actions=${[{label:"New file",icon:"fa-solid fa-plus",onSelect:()=>T(!0)},{label:"Export project",icon:"fa-solid fa-file-export",onSelect:pa},Y&&{label:`Delete ${t}`,icon:"fa-solid fa-trash",danger:!0,onSelect:()=>ct(t)},{label:"Delete project",icon:"fa-solid fa-trash",danger:!0,onSelect:va}]} />`,pt=x`
    <${un} show=${S} project=${e} existing=${u}
      onClose=${()=>T(!1)} onCreate=${ha} />
    ${c}`;return!i&&!Y?x`
      <${D} title=${$t} subtitle=${k?.description||null} back=${["code"]}
        actions=${mt}
        fab=${{icon:"fa-solid fa-plus",label:"New file",onClick:()=>T(!0)}}>
        ${ut}
        <h2 class="ac-section-title">Files</h2>
        ${ft}
      <//>
      ${pt}`:x`
    <${D} title=${$t} subtitle=${Y?e:k?.description||null}
      back=${Y?["code",e]:["code"]} actions=${mt} fill>
      <div class="ac-split">
        ${i?x`
              <aside class="ac-sidebar" aria-label="Files">
                <div class="ac-sidebar-head">
                  <h2 class="ac-section-title">Files</h2>
                  <${H} icon="fa-solid fa-plus" label="New file"
                    onClick=${()=>T(!0)} />
                </div>
                ${ft}
              </aside>`:null}
        <div class="ac-pane">
          ${ut}
          ${Z}
        </div>
      </div>
    <//>
    ${pt}`}import{html as ae,useState as ot,useEffect as fn,useCallback as $n,Button as it,Modal as Xt,Form as mn,Input as pn,notEmpty as hn}from"acelery/ui.js";import{openDB as vn,deleteDB as yn}from"acelery/sql.js";function bn({show:e,existing:t,onClose:a,onCreate:n}){return ae`
    <${se} show=${e} onHide=${a} title="New database">
      <${mn} initial=${{name:""}} onSubmit=${n}>
        <${Xt.Body}>
          <${pn} label="Name" name="name" placeholder="Database name without extension"
            autocapitalize="off" autocomplete="off" spellcheck=${!1}
            help="Saved as a SQLite file ending in .db."
            validate=${[hn("A name is required"),o=>/^[\w-]+$/.test((o??"").trim())?!0:"Letters, numbers, dash and underscore only",o=>t.some(i=>i.name===`${(o??"").trim()}.db`)?"A database with that name already exists":!0]} />
        <//>
        <${Xt.Footer}>
          <${it} variant="outline-secondary" type="button" onClick=${a}>
            Cancel
          <//>
          <${it} variant="primary" type="submit">Create database<//>
        <//>
      <//>
    <//>`}function ea({settings:e,updateSettings:t}){let[a,n]=ot(null),[o,i]=ot(null),[r,s]=ot(()=>Le("new-db")),c=O(),{confirm:d,dialog:l}=q(),u=$n(async()=>{try{n(await ge())}catch(m){i(m),n([])}},[]);fn(()=>{u()},[u]);async function y({name:m}){s(!1);let $=`${m.trim()}.db`;try{await(await vn($)).close(),c(`Created ${$}`),h(["data",$])}catch(S){i(S)}}async function k(m){if(await d(`${m} and every table in it will be deleted. This cannot be undone.`,{title:`Delete ${m}?`,danger:!0,confirmLabel:"Delete"}))try{await yn(m),e["recent.db"]===m&&t({"recent.db":""}),c(`Deleted ${m}`),await u()}catch(S){i(S)}}let v;return a===null?v=ae`<${A} rows=${3} />`:a.length?v=ae`
      <div class="ac-list">
        ${a.map(m=>ae`
          <${J} key=${m.name} icon="fa-solid fa-database" title=${m.name}
            meta=${[ue(m.length),Ht(m.modified)].filter(Boolean).join(" \xB7 ")}
            badge=${m.name==="acelery.db"?"settings":null}
            onOpen=${()=>h(["data",m.name])}
            actions=${[{label:"Delete",icon:"fa-solid fa-trash",danger:!0,onSelect:()=>k(m.name)}]} />`)}
      </div>`:v=ae`
      <${M} icon="fa-solid fa-database" title="No databases yet"
        action=${ae`
          <${it} variant="primary" onClick=${()=>s(!0)}>
            New database
          <//>`}>
        A database is a SQLite file your apps read and write.
      <//>`,ae`
    <${D} title="Data"
      fab=${{icon:"fa-solid fa-plus",label:"New database",onClick:()=>s(!0)}}>
      <${j} error=${o} onClose=${()=>i(null)} />
      ${v}
    <//>
    <${bn} show=${r} existing=${a??[]}
      onClose=${()=>s(!1)} onCreate=${y} />
    ${l}`}import{html as p,useState as N,useEffect as Oe,useCallback as wn,useMemo as gn,Button as me,Dropdown as ne,Table as ta,CheckBox as kn,TableMaint as Sn}from"acelery/ui.js";import{openDB as Cn,deleteDB as xn}from"acelery/sql.js";var qe=(e,t,a=`${t}s`)=>`${e} ${e===1?t:a}`,Dn=["INT","DOU","REA","FLO","NUM","DEC","BOO","DAT"],En=`create table new_table (
  id integer primary key,
  name text not null
)`,Tn=200;function aa({dbName:e,parts:t,settings:a,updateSettings:n}){let[o,i]=N(null),[r,s]=N("loading"),[c,d]=N(null),[l,u]=N(""),[y,k]=N(null),[v,m]=N([]),$=O(),{confirm:S,dialog:T}=q();Oe(()=>{let L=!0,P=null;return(async()=>{try{if(!await Rt(e)){L&&s("missing");return}if(P=await Cn(e),!L)return;i(P),s("ready"),a["recent.db"]!==e&&n({"recent.db":e})}catch(V){if(!L)return;d(V),s("ready")}})(),()=>{L=!1,P?.close().catch(()=>{})}},[e]);async function b(){if(await S(`${e} and every table in it will be deleted. This cannot be undone.`,{title:`Delete ${e}?`,danger:!0,confirmLabel:"Delete"}))try{await o?.close(),await xn(e),a["recent.db"]===e&&n({"recent.db":""}),$(`Deleted ${e}`),h(["data"],{replace:!0})}catch(P){d(P)}}async function C(L){if(!await S(`The table ${L} and all of its rows will be deleted. This cannot be undone.`,{title:`Drop ${L}?`,danger:!0,confirmLabel:"Drop table"}))return!1;try{return await o.exec(`drop table ${Re(L)}`),$(`Dropped ${L}`),!0}catch(V){return d(V),!1}}let[oe,pe,Ee]=t,he=p`<${j} error=${c} onClose=${()=>d(null)} />`;if(r==="missing")return p`
      <${D} title=${e} back=${["data"]}>
        <${z} what="Database" action=${p`
          <${me} variant="primary" onClick=${()=>h(["data"],{replace:!0})}>
            All databases
          <//>`} />
      <//>`;if(oe==="table"&&pe)return p`
      <${An} db=${o} dbName=${e} table=${pe} structure=${Ee==="structure"}
        error=${he} onError=${d}
        onDrop=${async()=>{await C(pe)&&h(["data",e],{replace:!0})}} />
      ${T}`;let ie=oe==="sql"?"sql":"tables";return p`
    <${D} title=${e} back=${["data"]}
      actions=${p`<${ee} title=${e} actions=${[{label:"Delete database",icon:"fa-solid fa-trash",danger:!0,onSelect:b}]} />`}
      subbar=${p`
        <${Fe} label="Database view" value=${ie}
          options=${[{value:"tables",label:"Tables",icon:"fa-solid fa-table"},{value:"sql",label:"SQL",icon:"fa-solid fa-terminal"}]}
          onChange=${L=>h(L==="sql"?["data",e,"sql"]:["data",e],{replace:!0})} />`}>
      ${he}
      ${o?ie==="sql"?p`<${Pn} db=${o} sql=${l} setSql=${u}
                   result=${y} setResult=${k}
                   history=${v} setHistory=${m} />`:p`<${Ln} db=${o} dbName=${e} onError=${d}
                   onDrop=${C}
                   onCreate=${()=>{u(En),k(null),h(["data",e,"sql"],{replace:!0})}} />`:r==="loading"?p`<${A} rows=${3} />`:null}
    <//>
    ${T}`}function Ln({db:e,dbName:t,onError:a,onDrop:n,onCreate:o}){let[i,r]=N(null),[s,c]=N({}),d=wn(async()=>{try{let l=await e.select("select name from sqlite_master where type = ? order by name",["table"]);r(l.map(u=>u.name))}catch(l){a(l),r([])}},[e]);return Oe(()=>{d()},[d]),Oe(()=>{if(!i)return;let l=!0;return(async()=>{for(let u of i){if(!l)return;try{Re(u);let y=await e.select(`PRAGMA table_info(${u})`),k=await e.selectOne(`select count(*) as n from ${u}`);l&&c(v=>({...v,[u]:{columns:y.length,rows:k?.n??0}}))}catch{}}})(),()=>{l=!1}},[i]),i===null?p`<${A} rows=${3} />`:i.length?p`
    <div class="ac-list">
      ${i.map(l=>{let u=s[l];return p`
          <${J} key=${l} icon="fa-solid fa-table" title=${l}
            meta=${u?`${qe(u.columns,"column")} \xB7 ${qe(u.rows,"row")}`:"\xA0"}
            onOpen=${()=>h(["data",t,"table",l])}
            actions=${[{label:"Structure",icon:"fa-solid fa-table-columns",onSelect:()=>h(["data",t,"table",l,"structure"])},{label:"Drop table",icon:"fa-solid fa-trash",danger:!0,onSelect:async()=>{await n(l)&&d()}}]} />`})}
    </div>`:p`
      <${M} icon="fa-solid fa-table" title="No tables yet"
        action=${p`<${me} variant="primary" onClick=${o}>Create a table<//>`}>
        Start from a template in the SQL tab.
      <//>`}function An({db:e,dbName:t,table:a,structure:n,error:o,onError:i,onDrop:r}){let[s,c]=N(null),[d,l]=N(()=>new Set);Oe(()=>{if(!e)return;let $=!0;return(async()=>{try{Re(a);let S=await e.select(`PRAGMA table_info(${a})`);$&&c(S)}catch(S){if(!$)return;i(S),c([])}})(),()=>{$=!1}},[e,a]);let u=gn(()=>(s??[]).map($=>({type:Dn.some(S=>String($.type).toUpperCase().includes(S))?"number":"string",title:$.name,name:$.name,inList:!d.has($.name),inSearch:!0})),[s,d]),y=($,S)=>l(T=>{let b=new Set(T);return S?b.delete($):b.add($),b}),k=p`<${ee} title=${a} actions=${[n?{label:"Browse rows",icon:"fa-solid fa-table",onSelect:()=>h(["data",t,"table",a],{replace:!0})}:{label:"Structure",icon:"fa-solid fa-table-columns",onSelect:()=>h(["data",t,"table",a,"structure"])},{label:"Drop table",icon:"fa-solid fa-trash",danger:!0,onSelect:r}]} />`,v=!n&&s?.length?p`
        <${ne} autoClose="outside" align="end" className="ac-over">
          <${ne.Toggle} as="button" type="button" bsPrefix="ac-chip"
                              aria-label="Choose columns">
            <${g} name="fa-solid fa-table-columns" />
            <span class="d-none d-md-inline">Columns</span>
          <//>
          <${ne.Menu} className="ac-columns-menu" popperConfig=${{strategy:"fixed"}}>
            ${s.map($=>p`
              <${kn} key=${$.name} label=${$.name} className="mb-2"
                checked=${!d.has($.name)}
                onChange=${S=>y($.name,S)} />`)}
          <//>
        <//>`:null,m;return!e||s===null?m=p`<${A} rows=${4} />`:s.length?n?m=p`
      <div class="ac-results">
        <${ta} hover size="sm">
          <thead>
            <tr><th>Column</th><th>Type</th><th>Not null</th><th>Default</th><th>Key</th></tr>
          </thead>
          <tbody>
            ${s.map($=>p`
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
      <${Sn} key=${u.filter($=>$.inList).map($=>$.name).join("|")}
        db=${e} title=${a} table=${a} fields=${u} onError=${i} />`:m=p`
      <${z} what="Table" action=${p`
        <${me} variant="primary"
          onClick=${()=>h(["data",t],{replace:!0})}>
          All tables
        <//>`} />`,p`
    <${D} title=${a}
      subtitle=${n?`Structure \xB7 ${t}`:t}
      back=${n?["data",t,"table",a]:["data",t]}
      actions=${p`${v}${k}`}>
      ${o}
      ${m}
    <//>`}function Pn({db:e,sql:t,setSql:a,result:n,setResult:o,history:i,setHistory:r}){async function s(){let d=t.trim();if(!d)return;let l=performance.now(),u=()=>Math.max(0,Math.round(performance.now()-l));try{if(/^(select|pragma|with|explain)\b/i.test(d)){let y=await e.select(d);o({kind:"rows",rows:y,ms:u(),limit:Tn})}else if(/^insert\b/i.test(d)){let y=await e.insert(d);o({kind:"text",text:`Inserted row ${y}`,ms:u()})}else{let y=await e.exec(d);o({kind:"text",text:`${qe(y,"row")} changed`,ms:u()})}r(y=>[d,...y.filter(k=>k!==d)].slice(0,10))}catch(y){o({kind:"error",text:y.message??String(y)})}}let c=null;return n?.kind==="error"?c=p`<${j} error=${n.text} onClose=${()=>o(null)} />`:n?.kind==="text"?c=p`<div class="ac-results-meta" role="status">${n.text} · ${n.ms} ms</div>`:n?.kind==="rows"&&(c=p`<${In} result=${n}
      onShowAll=${()=>o({...n,limit:1/0})} />`),p`
    <div class="ac-sql">
      <label class="visually-hidden" for="ac-sql-input">SQL statement</label>
      <textarea id="ac-sql-input" class="form-control ac-sql-input"
        placeholder="select * from …" spellcheck="false" autocapitalize="off"
        autocomplete="off" autocorrect="off" value=${t}
        onInput=${d=>a(d.currentTarget.value)}
        onKeyDown=${d=>{(d.metaKey||d.ctrlKey)&&d.key==="Enter"&&(d.preventDefault(),s())}}></textarea>
      <div class="ac-button-row">
        <${me} variant="primary" onClick=${s} disabled=${!t.trim()}>
          <${g} name="fa-solid fa-play" /> Run
        <//>
        <${me} variant="outline-secondary"
          onClick=${()=>{a(""),o(null)}}>
          Clear
        <//>
        ${i.length?p`
              <${ne}>
                <${ne.Toggle} variant="outline-secondary">
                  <${g} name="fa-solid fa-clock-rotate-left" /> History
                <//>
                <${ne.Menu} popperConfig=${{strategy:"fixed"}}>
                  ${i.map(d=>p`
                    <${ne.Item} as="button" key=${d}
                      className="font-monospace text-truncate" style=${{maxWidth:"22rem"}}
                      onClick=${()=>a(d)}>${d}<//>`)}
                <//>
              <//>`:null}
      </div>
      ${c}
    </div>`}function In({result:e,onShowAll:t}){let{rows:a,ms:n,limit:o}=e;if(!a.length)return p`<div class="ac-results-meta" role="status">No rows · ${n} ms</div>`;let i=[...new Set(a.flatMap(s=>Object.keys(s)))],r=a.slice(0,o);return p`
    <div class="ac-results-meta" role="status">
      ${qe(a.length,"row")} · ${n} ms
    </div>
    <div class="ac-results">
      <${ta} hover size="sm">
        <thead>
          <tr>${i.map(s=>p`<th key=${s} scope="col">${s}</th>`)}</tr>
        </thead>
        <tbody>
          ${r.map((s,c)=>p`
            <tr key=${c}>
              ${i.map(d=>{let l=s[d];return p`
                  <td key=${d} class=${typeof l=="number"?"ac-num":""}
                      title=${l==null?void 0:String(l)}>
                    ${l==null?p`<span class="ac-null">NULL</span>`:String(l)}
                  </td>`})}
            </tr>`)}
        </tbody>
      <//>
    </div>
    ${a.length>r.length?p`<div>
          <${me} variant="outline-secondary" onClick=${t}>
            Show all ${a.length}
          <//>
        </div>`:null}`}import{html as _e,useState as Fn,THEMES as Mn,applyTheme as na,currentTheme as oa,currentMode as jn,themeHasModes as Bn,isDark as ia}from"acelery/ui.js";import{EDITOR_THEMES as Rn,isDarkTheme as Hn}from"acelery/editor.js";var On=e=>e.charAt(0).toUpperCase()+e.slice(1),ra=e=>e==="acelery"?"aCelery":On(e),sa="acelery.keepAwake";function qn(){try{return sessionStorage.getItem(sa)==="1"}catch{return!1}}function _n(e){try{sessionStorage.setItem(sa,e?"1":"0")}catch{}}function la({settings:e,updateSettings:t}){let[a,n]=Fn(qn),o=oa(),i=Bn(o),r=e.editortheme??"";function s(l){t({theme:na(l)})}function c(l){na(oa(),{mode:l}),t({"theme.mode":l})}function d(l){n(l),_n(l),ke({action:"setKeepAwake",on:l})}return _e`
    <${D} title="Settings">
      <section class="ac-section" aria-labelledby="settings-appearance">
        <h2 class="ac-section-title" id="settings-appearance">Appearance</h2>
        <div class="ac-list">
          <div class="ac-setting">
            <div class="ac-setting-label">
              <span class="ac-setting-name" id="settings-mode">Mode</span>
              <div class="ac-setting-help">
                ${i?"Follow the device, or always light or dark.":`${ra(o)} is always ${ia()?"dark":"light"}.`}
              </div>
            </div>
            <${Fe} role="radiogroup" label="Mode"
              value=${i?jn():ia()?"dark":"light"}
              onChange=${c}
              options=${[{value:"system",label:"System",icon:"fa-solid fa-circle-half-stroke",disabled:!i},{value:"light",label:"Light",icon:"fa-solid fa-sun",disabled:!i},{value:"dark",label:"Dark",icon:"fa-solid fa-moon",disabled:!i}]} />
          </div>
          <div class="ac-setting">
            <div class="ac-setting-label">
              <label for="settings-theme">Theme</label>
              <div class="ac-setting-help">aCelery and Default follow Mode.</div>
            </div>
            <select id="settings-theme" class="form-select" value=${o}
                    onChange=${l=>s(l.currentTarget.value)}>
              ${Mn.map(l=>_e`<option key=${l} value=${l}>${ra(l)}</option>`)}
            </select>
          </div>
          <div class="ac-setting">
            <div class="ac-setting-label">
              <label for="settings-editor">Editor colours</label>
              <div class="ac-setting-help">
                ${r?`A ${Hn(r)?"dark":"light"} scheme, whatever the mode.`:"Light or dark, to match the app."}
              </div>
            </div>
            <select id="settings-editor" class="form-select" value=${r}
                    onChange=${l=>t({editortheme:l.currentTarget.value})}>
              ${Rn.map(l=>_e`<option key=${l.value} value=${l.value}>${l.label}</option>`)}
            </select>
          </div>
        </div>
      </section>

      ${de()?_e`
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
                      onChange=${l=>d(l.currentTarget.checked)} />
                  </div>
                </div>
              </div>
            </section>`:null}

      <section class="ac-section" aria-labelledby="settings-about">
        <h2 class="ac-section-title" id="settings-about">About</h2>
        <div class="ac-list">
          <div class="ac-row">
            <div class="ac-row-icon" aria-hidden="true"><${g} name="fa-solid fa-seedling" /></div>
            <div class="ac-row-body">
              <div class="ac-row-title">aCelery</div>
              <div class="ac-row-meta">Build and run your own JavaScript apps · GPLv3</div>
            </div>
          </div>
          <div class="ac-row">
            <div class="ac-row-icon" aria-hidden="true"><${g} name="fa-solid fa-circle-info" /></div>
            <div class="ac-row-body">
              <div class="ac-row-title">Serving</div>
              <div class="ac-row-meta">${window.location.origin}</div>
            </div>
          </div>
          <div class="ac-row is-action">
            <div class="ac-row-icon" aria-hidden="true">
              <${g} name="fa-solid fa-arrow-up-right-from-square" />
            </div>
            <div class="ac-row-body">
              <a class="ac-stretch ac-row-title" href="http://www.acelery.com/"
                 target="_blank" rel="noopener">Website</a>
              <div class="ac-row-meta">www.acelery.com</div>
            </div>
          </div>
        </div>
      </section>
    <//>`}var fa=Promise.resolve();function zn(e){let t=fa.then(()=>Pt(e));return fa=t.catch(a=>console.error("aCelery: could not save settings",a)),t}function Jn(e){let t=String(e).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);return t?"#"+t.slice(1,4).map(a=>Number(a).toString(16).padStart(2,"0")).join(""):null}function rt(){de()&&requestAnimationFrame(()=>{let e=document.querySelector(".ac-appbar")??document.body,t=Jn(getComputedStyle(e).backgroundColor);ke({action:"setChrome",dark:$a(),...t?{color:t}:{}})})}function Wn(){let e=bt(),[t,a]=ca(null),[,n]=ca(0);da(()=>{At().then(u=>{ua(u.theme||"acelery",{mode:u["theme.mode"]||"system"}),a(u)},u=>{console.error("aCelery: could not read settings",u),ua("acelery",{mode:"system"}),a({})})},[]),da(()=>{let u=()=>{n(k=>k+1),rt()};document.addEventListener("acelery:themechange",u);let y=document.getElementById("xbtheme");return y?.addEventListener("load",rt),()=>{document.removeEventListener("acelery:themechange",u),y?.removeEventListener("load",rt)}},[]);let o=Un(u=>{a(y=>({...y,...u})),zn(u)},[]);if(!t)return R`
      <${We} section=${e.section}>
        <${D} title="aCelery"><${A} rows=${3} /><//>
      <//>`;let i=t.editortheme,r=i&&Gn.some(u=>u.value===i)?i:$a()?"dark":"light",{section:s,parts:c}=e,d={settings:t,updateSettings:o},l;switch(s){case"home":l=R`<${Nt} ...${d} />`;break;case"apps":l=R`<${Kt} ...${d} />`;break;case"code":l=c[0]?R`<${Zt} key=${c[0]} project=${c[0]} fileName=${c[1]}
                 editorTheme=${r} ...${d} />`:R`<${Wt} ...${d} />`;break;case"data":l=c[0]?R`<${aa} key=${c[0]} dbName=${c[0]}
                 parts=${c.slice(1)} ...${d} />`:R`<${ea} ...${d} />`;break;case"settings":l=R`<${la} ...${d} />`;break;default:l=R`
        <${D} title="Not found">
          <${z} what="Page" action=${R`
            <${Kn} variant="primary" onClick=${()=>h([],{replace:!0})}>
              Go home
            <//>`} />
        <//>`}return R`
    <${Dt}>
      <${We} section=${s}>${l}<//>
    <//>`}function Qn(e=document.body){wt(),Nn(R`<${Wn} />`,e)}export{Qn as default};
