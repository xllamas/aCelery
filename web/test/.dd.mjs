import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
const dom = new JSDOM("<!doctype html><html><body></body></html>");
Object.assign(globalThis,{window:dom.window,document:dom.window.document,
 HTMLElement:dom.window.HTMLElement,Node:dom.window.Node,Element:dom.window.Element,
 Event:dom.window.Event,CustomEvent:dom.window.CustomEvent,MouseEvent:dom.window.MouseEvent,
 requestAnimationFrame:(f)=>setTimeout(f,0),cancelAnimationFrame:(i)=>clearTimeout(i),
 getComputedStyle:dom.window.getComputedStyle.bind(dom.window)});
const ui = await import("../../bundle/www/tools/js/acelery/ui.js");
const { html, render } = ui;
const src = readFileSync("src/ide/chrome.js","utf8").replace(
  /(["'])acelery\/([^"']+)\1/g,
  (_,q,r)=>`${q}${pathToFileURL(`../bundle/www/tools/js/acelery/${r}`).href}${q}`);
const { IdeNavbar } = await import(`data:text/javascript,${encodeURIComponent(src)}`);
const flush=async()=>{for(let i=0;i<4;i++) await new Promise(r=>setTimeout(r,0));};
const host=document.createElement("div"); document.body.appendChild(host);
render(html`<${IdeNavbar} title="aCelery IDE" items=${[
  {label:"Project", items:[{label:"New", onSelect:()=>{}},{label:"Open", onSelect:()=>{}}]},
  {label:"Main Menu", onSelect:()=>{}},
]} />`, host);
await flush();
const toggle=[...host.querySelectorAll("a,button")].find(e=>e.textContent.trim()==="Project");
console.log("toggle:", toggle && toggle.outerHTML.slice(0,150));
toggle.dispatchEvent(new dom.window.MouseEvent("click",{bubbles:true,cancelable:true}));
await flush();
console.log("menu present:", !!host.querySelector(".dropdown-menu"));
console.log("items:", [...host.querySelectorAll(".dropdown-item")].map(e=>e.textContent.trim()));
