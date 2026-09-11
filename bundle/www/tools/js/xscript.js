/*  Copyright 2014: Xavier Llamas Rolland                      */
/*                                                             */
/*  This software distributed under the GPLv3 License          */
/*                                                             */
////////////////////////////////////////////////////////////////


/* xScript Classes */


/* xElement - abstract */

function xElement(clss){
   if (typeof clss == "undefined")
      clss = "x_element";
   this.id = this.genUID();
   this.clss = clss;
   this.parent = null;
   this.node = null;
}

xElement.prototype.genUID = function(){
   return '_' + Math.random().toString(36).substr(2, 9);
}

xElement.prototype.setParent = function(parent){
   this.parent = parent;
   return this;
}

xElement.prototype.setClass = function(clss){
   this.clss = clss;
   if (this.node)
      this.node.className = clss;
   return this;
}

xElement.prototype.getId = function(){
   return this.id;
}

xElement.prototype.setId = function(id){
   this.id = id;
   this.node.id = id;
   return this;
}

xElement.prototype.getHashId = function(){
   return "#" + this.id;
}

xElement.prototype.getNode = function(){
   return this.node;
}

xElement.prototype.remove = function()
{
   this.removeNode();
   if (this.parent)
      this.parent.removeElement(this);
   return this;
}

xElement.prototype.removeNode = function()
{
   this.node.parentNode.removeChild(this.node);
   return this;
}

xElement.prototype.removeElement = function(element)
{
   return this;
}

xElement.prototype.setToTop = function(){
   document.body.appendChild(this.node);
   return this;
}

xElement.prototype.append = function(parentNode){
   parentNode.appendChild(this.node);
   return this;
}

xElement.prototype.hide = function(){
   this.node.style.display = "none";
   return this;
}

xElement.prototype.show = function(){
   this.node.style.display = "block";
   return this;
}

xElement.prototype.isVisible = function(){
   if (this.node.style.display == "none")
      return false;
   else
      return true;
}

xElement.prototype.bindToEvent = function(type, handler){
   if (this.node.addEventListener)
      this.node.addEventListener(type,handler,false);
   else
      this.node.attachEvent("on" + type, handler);
   return this;
}

xElement.prototype.createFromDom = function(id){
   this.id = id;
   this.node = document.getElementById(id);
}

/* xMulti */

function xMulti(clss){
   if (typeof clss == "undefined")
      clss = "x_multielement";
   xElement.call(this,clss);
   this.elements = [];
}

xMulti.prototype = new xElement();

xMulti.prototype.getNode = function(){
   return null;
}

xMulti.prototype.addElement =  function(e){
   this.elements.push(e);
   if (this.parent)
      e.setParent(this.parent).append(this.parent.node);
   return this;
}

xMulti.prototype.remove = function()
{
   this.removeNode();
   if (this.parent)
      for (var i = 0; i < this.elements.length; i++)
         this.parent.removeElement(this.elements[i]);
   return this;
}

xMulti.prototype.removeNode = function()
{
   var parentNode = this.elements[0].node.parentNode;
   if (parentNode)
      for (var i = 0; i < this.elements.length; i++)
         parentNode.removeChild(this.elements[i].node);
   return this;
}

xMulti.prototype.removeElement = function(element)
{
   var inx;

   for (var i = 0; i < this.elements.length; i++){
      if (this.elements[i].id == element.id)
         inx = i;
   }
   this.elements.splice(inx,1);
   return this;
}

xMulti.prototype.removeAllElements = function(){
   this.elements = [];
}

xMulti.prototype.getElement = function(index)
{
   return this.elements[index];
}

xMulti.prototype.setToTop = function(){
   for (var i = 0; i < this.elements.length; i++){
      document.body.appendChild(this.elements[i].node);
   }
   return this;
}

xMulti.prototype.append = function(parentNode){
   for (var i = 0; i < this.elements.length; i++){
      parentNode.appendChild(this.elements[i].node);
   }
   return this;
}

xMulti.prototype.hide = function(){
   for (var i = 0; i < this.elements.length; i++){
      this.elements[i].node.style.display = "none";
   }
   return this;
}

xMulti.prototype.show = function(){
   for (var i = 0; i < this.elements.length; i++){
      this.elements[i].node.style.display = "block";
   }
   return this;
}

xMulti.prototype.bindToEvent = function(type, handler){
   return this;
}


/* xMultiElement  - Abstract*/

function xMultiElement(clss){
   if (typeof clss == "undefined")
      clss = "x_multielement";
   xElement.call(this,clss);
   this.elements = [];
}

xMultiElement.prototype = new xElement();

xMultiElement.prototype.addElement =  function(e){
   this.elements.push(e);
   e.setParent(this).append(this.node);
   return this;
}

xMultiElement.prototype.removeElement = function(element)
{
   var inx;

   for (var i = 0; i < this.elements.length; i++){
      if (this.elements[i].id == element.id)
         inx = i;
   }
   this.elements.splice(inx,1);
   return this;
}

xMultiElement.prototype.removeAllElements = function(){
   this.elements = [];
}

xMultiElement.prototype.getElement = function(index)
{
   return this.elements[index];
}

xMultiElement.prototype.getElementIndex = function(element){
   var inx;

   for (var i = 0; i < this.elements.length; i++){
      if (this.elements[i].id == element.id)
         inx = i;
   }
   return inx;
}

xMultiElement.prototype.getNumElements = function(){
   return this.elements.length;
}

xMultiElement.prototype.clear = function(){
   for (var i = 0; i < this.elements.length; i++)
      this.elements[i].removeNode();
   this.elements = [];
   return this;
}

/* xSection */

function xSection(clss){
   if (typeof clss == "undefined")
      clss = "x_section";
   xMultiElement.call(this,clss);
   this.node = document.createElement("div");
   this.node.id = this.id;
   this.node.className = this.clss;
}

xSection.prototype = new xMultiElement();

xSection.prototype.clear = function(){
   this.node.innerHTML = "";
   this.removeAllElements();
   return this;
}

/* xText */

function xText(text){
   xElement.call(this,"");
   this.node = document.createTextNode(text);
   this.node.id = this.id;
}

xText.prototype = new xElement();

/* xVerticalSpacer */

function xVerticalSpacer(sp){
   xElement.call(this,"");
   this.node = document.createElement("div");
   this.node.style.height = sp + "px";
   this.node.id = this.id;
}

xVerticalSpacer.prototype = new xElement();

/* xHtml */

function xHtml(type,innerHtml,clss){
   xElement.call(this,clss);
   this.node = document.createElement(type);
   this.node.id = this.id;
   this.node.className = this.clss;
   this.node.innerHTML = innerHtml || "";
}

xHtml.prototype = new xElement();

xHtml.prototype.addHtml = function(html){
   this.node.innerHTML = this.node.innerHTML + html;
   return this;
}

/* xMultiHtml */

function xMultiHtml(type,clss){
   xMultiElement.call(this,clss);
   this.node = document.createElement(type);
   this.node.id = this.id;
   this.node.className = this.clss;
}

xMultiHtml.prototype = new xMultiElement();

/* xCanvas */

function xCanvas(w,h,clss){
   if (typeof clss == "undefined")
      clss = "x_canvas";
   xElement.call(this,clss);
   this.node = document.createElement("canvas");
   this.node.id = this.id;
   this.node.style.width = w + "px";
   this.node.style.height = h + "px";
   this.node.className = this.clss;
}

xCanvas.prototype = new xElement();

xCanvas.prototype.getCanvas = function(){
   return this.node;
}

xCanvas.prototype.getContext2d = function(){
   return this.node.getContext("2d");
}


/* xLink */

function xLink(label,href,clss){
   if (typeof clss == "undefined")
      clss = "x_link";
   xMultiElement.call(this,clss);
   this.node = document.createElement("a");
   this.node.id = this.id;
   this.node.href = href;
   this.node.className = this.clss;
   this.node.innerHTML = label || "";
}

xLink.prototype = new xMultiElement();

xLink.prototype.bindFunction = function(f){
   this.node.onclick = f;
   return this;
}

xLink.prototype.setTarget = function(t){
  this.node.target = t;
  return this;
}

xLink.prototype.disabled = function(d){
   if (d)
      this.node.setAttribute("disabled","disabled");
   else
      this.node.removeAttribute("disabled");
   return this;
}

/* xValidator - abstract */

function xValidator(){
   this.input = null;
}

xValidator.prototype.setInput = function(input){
   this.input = input;
   return this;
}

xValidator.prototype.validate = function(){
   return true;
}

/* xNotEmptyValidator */

function xNotEmptyValidator(){
   xValidator.call(this);
}

xNotEmptyValidator.prototype = new xValidator();

xNotEmptyValidator.prototype.validate = function(){
   if (this.input.getValue() == "")
      return false;
   else
      return true;
}

/* xTelValidator */

function xTelValidator(mind,maxd){
   this.minDigits = mind;
   this.maxDigits = maxd;
   xValidator.call(this);
}

xTelValidator.prototype = new xValidator();

xTelValidator.prototype.validate = function(){
   t = this.input.getValue();
   if (t.length == 0)
      return true;
   if ((t.length < this.minDigits) || (t.length > this.maxDigits) || (t.match(/^[\+0-9]+$/) == null))
      return false;
   else
      return true;
}

/* xNotZeroValidator */

function xNotZeroValidator(){
   xValidator.call(this);
}

xNotZeroValidator.prototype = new xValidator();

xNotZeroValidator.prototype.validate = function(){
   if (this.input.getValue() == 0)
      return false;
   else
      return true;
}

/* xInput - abstract */

function xInput(clss,wclss){
   this.iname = "";
   this.validators = [];
   if (typeof clss == "undefined")
      clss = "x_input";
   if (typeof wclss == "undefined")
      wclss = "x_inputwrapper";
   xElement.call(this,clss);
   this.wclss = wclss;
}

xInput.prototype = new xElement();

xInput.prototype.setFocus = function(){
   this.node.getElementsByTagName("input")[0].focus();
   return this;
}

xInput.prototype.setSelected = function(){
   this.node.getElementsByTagName("input")[0].select();
   return this;
}

xInput.prototype.getValue = function(){
   return this.node.getElementsByTagName("input")[0].value;
}

xInput.prototype.setType = function(t){
   this.node.getElementsByTagName("input")[0].type = t;
   return this;
}

xInput.prototype.setValue = function(v){
   this.node.getElementsByTagName("input")[0].value = v;
   return this;
}

xInput.prototype.setPlaceholder = function(p){
   this.node.getElementsByTagName("input")[0].placeholder = p;
   return this;
}

xInput.prototype.setReadOnly = function(r){
   this.node.getElementsByTagName("input")[0].readOnly = r;
   return this;
}

xInput.prototype.setDisabled = function(d){
   this.node.getElementsByTagName("input")[0].disabled = d;
   return this;
}

xInput.prototype.addWrapperClass = function(clss){
   this.node.className = this.wclss + " " + clss;
   return this;
}

xInput.prototype.setName = function(name){
   this.iname = name;
   this.node.getElementsByTagName("input")[0].setAttribute("name",name);
   this.node.getElementsByTagName("label")[0].setAttribute("for",name);
   return this;
}

xInput.prototype.getName = function(){
   return this.iname;
}

xInput.prototype.addValidator = function(validator){
   this.validators.push(validator.setInput(this));
   return this;
}

xInput.prototype.validate = function(){
   ret = true;
   for (var i = 0; i < this.validators.length; i++)
      if (!this.validators[i].validate())
         ret = false;
   return ret;
}

xInput.prototype.setError = function(e){
}

/* xStringInput */

function xStringInput(label,name,clss,wclss){
   if (typeof clss == "undefined")
      clss = "x_stringinput";
   xInput.call(this,clss,wclss);
   this.iname = name;
   this.node = document.createElement("div");
   this.node.id = this.id + "_w";
   this.node.className = this.wclss;
   var l = "<label for='" + name + "'>" + label + "</label>";
   var i = "<input type='text'" +
           "' id='" + this.id +
           "' name='" + name +
           "' class='" + this.clss +
           "'>";
   this.node.innerHTML = l + i;
}

xStringInput.prototype = new xInput();

/* xHiddenInput */

function xHiddenInput(name,value){
   xInput.call(this,"x_hiddeninput","");
   this.iname = name;
   this.node = document.createElement("div");
   this.node.id = this.id + "_w";
   this.node.className = this.wclss;
   var i = "<input type='hidden'" +
           " id='" + this.id +
           "' name='" + name +
           "' value='" + value +
           "'>";
   this.node.innerHTML = i;
}

xHiddenInput.prototype = new xInput();




/* xNumberInput */

function xNumberInput(label,name,clss,wclss){
   if (typeof clss == "undefined")
      clss = "x_numberinput";
   xStringInput.call(this,label,name,clss,wclss);
   this.setType("number");
}

xNumberInput.prototype = new xStringInput();

/* xEmailInput */

function xEmailInput(label,name,clss,wclss){
   if (typeof clss == "undefined")
      clss = "x_emailinput";
   xStringInput.call(this,label,name,clss,wclss);
   this.setType("email");
}

xEmailInput.prototype = new xStringInput();

/* xDateInput */

function xDateInput(label,name,clss,wclss){
   if (typeof clss == "undefined")
      clss = "x_dateinput";
   xStringInput.call(this,label,name,clss,wclss);
   this.setType("date");
}

xDateInput.prototype = new xStringInput();

/* xRangeInput */

function xRangeInput(label,name,clss,wclss){
   if (typeof clss == "undefined")
      clss = "x_dateinput";
   xStringInput.call(this,label,name,clss,wclss);
   this.setType("range");
}

xRangeInput.prototype = new xStringInput();

/* xTextAreaInput */

function xTextAreaInput(label,name,rows,cols,clss,wclss){
   if (typeof clss == "undefined")
      clss = "x_texareainput";
   xInput.call(this,clss,wclss);
   this.iname = name;
   this.node = document.createElement("div");
   this.node.id = this.id + "_w";
   this.node.className = this.wclss;
   this.iname = name;
   var l = "<label for='" + this.iname + "'>" + this.label + "</label>";
   var i = "<textarea" +
           "' name='" + name +
           "' class='" + this.clss +
           "' rows='" + rows +
           "' cols='" + cols +
           "'></textarea>";
   this.node.innerHTML = l + i;
}

xTextAreaInput.prototype = new xInput();

xTextAreaInput.prototype.setFocus = function(){
   this.node.getElementsByTagName("textarea")[0].focus();
   return this;
}

xTextAreaInput.prototype.setSelected = function(){
   this.node.getElementsByTagName("textarea")[0].select();
   return this;
}

xTextAreaInput.prototype.setValue = function(v){
   this.node.getElementsByTagName("textarea")[0].value = v;
   return this;
}

xTextAreaInput.prototype.getValue = function(){
   return this.node.getElementsByTagName("input")[0].value;
}

xTextAreaInput.prototype.setPlaceholder = function(p){
   this.node.getElementsByTagName("textarea")[0].placeholder = v;
   return this;
}

xTextAreaInput.prototype.setReadOnly = function(r){
   this.node.getElementsByTagName("textarea")[0].readOnly = r;
   return this;
}

xTextAreaInput.prototype.setDisabled = function(d){
   this.node.getElementsByTagName("textarea")[0].disabled = d;
   return this;
}

xTextAreaInput.prototype.setName = function(name){
   this.iname = name;
   this.node.getElementsByTagName("textarea")[0].setAttribute("name",name);
   this.node.getElementsByTagName("label")[0].setAttribute("for",name);
}

/* xCheckBox */

function xCheckBox(label,name,clss,wclss){
   if (typeof clss == "undefined")
      clss = "x_checkbox";
   xInput.call(this,clss,wclss);
   this.iname = name;
   this.node = document.createElement("div");
   this.node.id = this.id + "_w";
   this.node.className = this.wclss;
   var i = "<label><input type='checkbox"
           "' id='" + this.id +
           "' name='" + name +
           "' class='" + this.clss +
           "'>" + label + "</label>";
   this.node.innerHTML = i;
}

xCheckBox.prototype = new xInput();

xCheckBox.prototype.setChecked = function(c){
   this.node.getElementsByTagName("input")[0].checked = c;
   return this;
}

xCheckBox.prototype.getValue = function(){
   return this.node.getElementsByTagName("input")[0].checked;
}

/* xRadioBtnGrp */

function xRadioBtnGrp(clss){
  xSection.call(this,clss);
}

xRadioBtnGrp.prototype = new xSection();

xRadioBtnGrp.prototype.getChecked = function(){
  var r = this.node.getElementsByTagName("input");
  for (var i = 0; i < r.length; i++)
     if (r[i].checked)
        return i + 1;
  return 0;
}


/* xRadioBtn */

function xRadioBtn(label,name,clss,wclss){
   if (typeof clss == "undefined")
      clss = "x_radio";
   xInput.call(this,clss,wclss);
   this.node = document.createElement("div");
   this.node.id = this.id + "_w";
   this.node.className = this.wclss;
   this.name = name;
   var i = "<label><input type='radio" +
           "' id='" + this.id +
           "' name='" + this.name +
           "' class='" + this.clss +
           "'>" + label + "</label>";
   this.node.innerHTML = i;
}

xRadioBtn.prototype = new xInput();

xRadioBtn.prototype.setChecked = function(c){
   this.node.getElementsByTagName("input")[0].checked = c;
   return this;
}

xRadioBtn.prototype.getValue = function(){
   return this.node.getElementsByTagName("input")[0].checked;
}


/* xSelect */

function xSelect(label,sname,clss,wclss){
   if (typeof clss == "undefined")
      clss = "x_select";
   xInput.call(this,clss,wclss);
   this.iname = sname;
   this.node = document.createElement("div");
   this.node.id = this.id + "_w";
   this.node.className = this.wclss;
   var l = "<label for='" + sname + "'>" + label + "</label>";
   var s = "<select id='" + this.id + "' name='" + sname + "' class='" + this.clss + "'>";
   s += "</select>";
   this.node.innerHTML = l + s;
}

xSelect.prototype = new xInput();

xSelect.prototype.setFocus = function(){
   this.node.getElementsByTagName("select")[0].focus();
   return this;
}

xSelect.prototype.setSelected = function(){
   this.node.getElementsByTagName("select")[0].select();
   return this;
}

xSelect.prototype.addOption = function(label,value){
   var n = this.node.getElementsByTagName("select")[0];
   opt = document.createElement("option");
   opt.text = label;
   opt.value = value;
   n.appendChild(opt);
   return this;
}

xSelect.prototype.addOptions = function(options){
   var n = this.node.getElementsByTagName("select")[0];
   var opt;
   for(var i = 0; i < options.length; i++){
      opt = document.createElement("option");
      opt.text = options[i].label;
      opt.value = options[i].value;
      this.node.appendChild(opt);
   }
   return this;
}

xSelect.prototype.setSelected = function(s){
   var n = this.node.getElementsByTagName("select")[0];
   for (var i = 0; i < n.options.length; i++){
     if (s == n.options[i].value){
        n.selectedIndex = i;
        break;
     }
   }
   return this;
}

xSelect.prototype.getValue = function(){
   return this.node.getElementsByTagName("select")[0].value;
}

xSelect.prototype.setReadOnly = function(r){
   return this;
}

xSelect.prototype.setDisabled = function(d){
   this.node.getElementsByTagName("select")[0].disabled = d;
   return this;
}

xSelect.prototype.setName = function(name){
   this.iname = name;
   this.node.getElementsByTagName("select")[0].setAttribute("name",name);
   this.node.getElementsByTagName("label")[0].setAttribute("for",name);
}

xSelect.prototype.clearOptions = function(){
   var n = this.node.getElementsByTagName("select")[0];
   while(n.firstChild)
      n.removeChild(n.firstChild);
   return this;
}



/* xButton */

function xButton(label,clss){
   if (typeof clss == "undefined")
      clss = "x_button";
   xMultiElement.call(this,clss);
   this.node = document.createElement("button");
   this.node.id = this.id;
   this.node.type = "button";
   this.node.className = this.clss;
   this.node.innerHTML = label || "";
}

xButton.prototype = new xMultiElement()

xButton.prototype.bindFunction = function(f){
   this.node.onclick = f;
   return this;
}

xButton.prototype.setLabel = function(label){
   this.node.innerHTML = label || "";
}

xButton.prototype.setTooltip = function(tooltip){
   this.node.setAttribute("title",tooltip);
}

xButton.prototype.disabled = function(d){
   if (d)
      this.node.setAttribute("disabled","disabled");
   else
      this.node.removeAttribute("disabled");
   return this;
}

/* xImage */

function xImage(src,alt,clss){
   if (typeof clss == "undefined")
      clss = "x_image";
   if (typeof alt == "undefined")
      alt = "";
   xElement.call(this,clss);
   this.node = document.createElement("img");
   this.node.id = this.id;
   this.node.className = this.clss;
   this.node.src = src;
   this.node.alt = alt;
}

xImage.prototype = new xElement();

/* xTextBox */

function xTextBox(text, clss){
   if (typeof clss == "undefined")
      clss = "x_textbox";
   xElement.call(this,clss);
   this.node = document.createElement("div");
   this.node.className = this.clss;
   this.node.id = this.id;
   this.node.innerHTML = text || "";
}

xTextBox.prototype = new xElement();

xTextBox.prototype.setText = function(text){
   this.node.innerHTML = text;
   return this;
}

xTextBox.prototype.addText = function(text){
   this.node.innerHTML = this.node.innerHTML + text;
   return this;
}

xTextBox.prototype.clear = function(){
   this.node.innerHTML = "";
   return this;
}

/* xPara */

function xPara(text,clss){
   if (typeof clss == "undefined")
      clss = "x_para";
   xMultiElement.call(this,clss);
   this.node = document.createElement("p");
   this.node.id = this.id;
   this.node.className = this.clss;
   this.node.innerHTML = text || "";
}

xPara.prototype = new xMultiElement();

xPara.prototype.setText = function(text){
   this.node.innerHTML = text;
   return this;
}

xPara.prototype.addText = function(text){
   this.node.innerHTML = this.node.innerHTML + text;
   return this;
}

xPara.prototype.clear = function(){
   this.node.innerHTML = "";
   return this;
}


/* xSpan */

function xSpan(text,clss){
   if (typeof clss == "undefined")
      clss = "x_span";
   xMultiElement.call(this,clss);
   this.node = document.createElement("span");
   this.node.id = this.id;
   this.node.className = this.clss;
   this.node.innerHTML = text || "";
}

xSpan.prototype = new xMultiElement();

xSpan.prototype.setText = function(text){
   this.node.innerHTML = text;
   return this;
}

xSpan.prototype.addText = function(text){
   this.node.innerHTML = this.node.innerHTML + text;
   return this;
}

xSpan.prototype.clear = function(){
   this.node.innerHTML = "";
   return this;
}


/* xTwoElementSection  */

function xTwoElementSection(clss){
  if (typeof clss == "undefined")
      clss = "x_twoelementsection";
  xSection.call(this,clss);
  this.auxnode = null;
}

xTwoElementSection.prototype = new xSection();

xTwoElementSection.prototype.append = function(parentNode){
   parentNode.appendChild(this.auxnode);
   parentNode.appendChild(this.node);
   return this;
}

xTwoElementSection.prototype.removeNode = function()
{
   this.node.parentNode.removeChild(this.node);
   this.auxnode.parentNode.removeChild(this.auxnode);
   return this;
}

xTwoElementSection.prototype.removeAuxElement = function(element){
   return this;
}

xTwoElementSection.prototype.removeElement = function(element)
{
   var inx, li;

   for (var i = 0; i < this.elements.length; i++){
      if (this.elements[i].id == element.id)
         inx = i;
   }
   this.elements.splice(inx,1);
   this.removeAuxElement(element);
   return this;
}

/* xList */

function xList(clss){
   if (typeof clss == "undefined")
      clss = "x_list";
   xMultiElement.call(this,clss);
   this.node = document.createElement("ul");
   this.node.id = this.id;
   this.node.className = this.clss;
}

xList.prototype = new xMultiElement();

xList.prototype.addElement =  function(e){
   this.elements.push(e);
   var index = this.elements.indexOf(e);
   var li = document.createElement("li");
   li.id = this.id + "_" + index;
   this.node.appendChild(li);
   e.setParent(this).append(li);
   return this;
}

xList.prototype.removeElement = function(element)
{
   var inx;

   for (var i = 0; i < this.elements.length; i++){
      if (this.elements[i].id == element.id)
         inx = i;
   }
   this.elements.splice(inx,1);
   return this;
}

xList.prototype.clear = function(){
   for (var i = 0; i < this.elements.length; i++)
      this.elements[i].node.parentNode.parentNode.removeChild(this.elements[i].node.parentNode);
   this.elements = [];
}



/* xLayout */

function xLayout(rows,cols,widths,clss){
   if (typeof clss == "undefined")
      clss = "x_layout";
   xElement.call(this,clss);
   var row, col;

   this.rows = rows;
   this.cols = cols;
   this.elements = [];
   this.node = document.createElement("table");
   this.node.id = this.id;
   this.node.style.width = "100%";
   this.node.className = this.clss;
   if (widths && (widths.length > 0)){
      for (var i = 0; i < rows; i++){
         row = document.createElement("tr");
         for (var j = 0; j < cols; j++){
            col = document.createElement("td");
            col.id = this.id + "_" + i + "_" + j;
            col.className = this.clss;
            col.style.width = widths[j];
            row.appendChild(col);
         }
         this.node.appendChild(row);
      }
   }
   else{
      var cw = Math.floor(100/cols) + "%";
      for (var i = 0; i < rows; i++){
         row = document.createElement("tr");
         for (var j = 0; j < cols; j++){
            col = document.createElement("td");
            col.id = this.id + "_" + i + "_" + j;
            col.className = this.clss;
            col.style.width = cw;
            row.appendChild(col);
         }
         this.node.appendChild(row);
      }
   }
}

xLayout.prototype = new xElement();

xLayout.prototype.addElement =  function(element,r,c){
   this.elements.push({element: element,row: r, col: c});
   var cell = this.node.rows[r].cells[c];
   var mid = this.id + "_" + r + "_" + c;
   element.setParent(this).append(cell);
   return this;
}

xLayout.prototype.getElement = function(r,c){
   var e;
   for (var i = 0; i < this.elements.length; i++){
      e = this.elements[i];
      if ((e.row == r) && (e.col == c))
         return e.element;
   }
   return false;
}

xLayout.prototype.setWidths = function(w){
   var row;
   for (var i = 0; i < this.rows; i++){
      row = this.node.rows[i];
      for (var j = 0; j < this.cols; j++){
         row.cells[j].style.width = w[j];
      }
   }
   return this;
}

xLayout.prototype.removeElement = function(element)
{
   var inx;

   for (var i = 0; i < this.elements.length; i++){
      if (this.elements[i].element.id == element.id)
         inx = i;
   }
   this.elements.splice(inx,1);
   return this;
}

xLayout.prototype.replaceElement = function(element,r,c){
   var e = this.getElement(r,c);

   if (e)
      e.remove();
   this.addElement(element,r,c);
}


/* xPanel */

function xPanel(clss){
   if (typeof clss == "undefined")
      clss = "x_panel";
   xSection.call(this,clss);
}

xPanel.prototype = new xSection();

/* xTitlePanel */

function xTitlePanel(title, bodyclss, titleclss, clss){
   if (typeof clss == "undefined")
      clss = "x_titlepanel";
   xPanel.call(this,clss);
   var p = "<div class='" + titleclss + "'>" + title + "</div>";
   p += "<div class='" + bodyclss + "'></div>";
   this.node.innerHTML = p;
}

xTitlePanel.prototype = new xPanel();

xTitlePanel.prototype.setTitle = function(title){
   var t = this.node.getElementsByTagName("div")[0];
      t.innerHTML = title;
   return this;
}

xTitlePanel.prototype.addElement =  function(e){
   var d = this.node.getElementsByTagName("div")[1];
   this.elements.push(e);
   d.appendChild(e.node);
   e.setParent(this);
   return this;
}

xTitlePanel.prototype.clear = function(){
   var d = this.node.getElementsByTagName("div")[1];
   d.innerHTML = "";
   this.removeAllElements();
}

/* xTable */

function xTable(clss){
   if (typeof clss == "undefined")
      clss = "x_table";
   xElement.call(this,clss);
   this.node = document.createElement("table");
   this.node.id = this.id;
   this.node.className = this.clss;
   this.node.appendChild(document.createElement("tbody"));
}

xTable.prototype = new xElement();

xTable.prototype.addHeadings = function(headings){
   var t = document.createElement("thead");
   var r = document.createElement("tr");
   var cell;

   for (var i = 0; i < headings.length; i++){
      cell = document.createElement("th");
      cell.innerHTML = headings[i];
      r.appendChild(cell);
   }
   t.appendChild(r);
   this.node.appendChild(t);
   return this;
}

xTable.prototype.addFooter = function(footers){
   var t = document.createElement("tfoot");
   var r = document.createElement("tr");
   var cell;

   for (var i = 0; i < footers.length; i++){
      cell = document.createElement("th");
      cell.innerHTML = footers[i];
      r.appendChild(cell);
   }
   t.appendChild(r);
   this.node.appendChild(t);
   return this;
}

xTable.prototype.addRow = function(row,clss){
   var r = document.createElement("tr");
   var cell, tbody;

   r.className = clss || "";
   for (var i = 0; i < row.length; i++){
      cell = document.createElement("td");
      cell.innerHTML = row[i];
      r.appendChild(cell);
   }
   tbody = this.node.getElementsByTagName("tbody")[0];
   tbody.appendChild(r);
   return this;
}

/* xElementsTable */

function xElementsTable(clss){
   if (typeof clss == "undefined")
      clss = "x_elementstable";
   xElement.call(this,clss);
   this.rowinx = 0;
   this.elements = [];
   this.headings = [];

   this.node = document.createElement("table");
   this.node.id = this.id;
   this.node.className = this.clss;
   this.node.appendChild(document.createElement("tbody"));
}

xElementsTable.prototype = new xElement();

xElementsTable.prototype.addHeadings = function(headings){
   var t = document.createElement("thead");
   var r = document.createElement("tr");
   var cell, cid;

   for (var i = 0; i < headings.length; i++){
      cid = this.id + "_h_" + i;
      this.headings.push(headings[i]);
      headings[i].setParent(this);
      cell = document.createElement("th");
      cell.id = cid;
      cell.appendChild(headings[i].node);
      r.appendChild(cell);
   }
   t.appendChild(r);
   this.node.appendChild(t);
   return this;
}

xElementsTable.prototype.addRow = function(row,clss){
   var r = document.createElement("tr");
   var cell, tbody;

   r.className = clss || "";
   for (var i = 0; i < row.length; i++){
      cid = this.id + "_" + this.rowinx + "_" + i;
      this.elements.push({row: this.rowinx,col: i, element: row[i]});
      row[i].setParent(this);
      cell = document.createElement("td");
      cell.id = cid;
      cell.appendChild(row[i].node);
      r.appendChild(cell);
   }
   this.rowinx++;
   tbody = this.node.getElementsByTagName("tbody")[0];
   tbody.appendChild(r);
   return this;
}

xElementsTable.prototype.getElement = function(r,c){
   var e;
   for (var i = 0; i < this.elements.length; i++){
      e = this.elements[i];
      if ((e.row == r) && (e.col == c))
         return e.element;
   }
   return false;
}

xElementsTable.prototype.getRowCount = function(){
   return this.rowinx;
}


/* xPopUp */

function xPopUp(clss){
   if (typeof clss == "undefined")
      clss = "x_popup";
   xSection.call(this,clss);
   this.setToTop();
   this.node.style.display = "none";
   this.is_visible = false;
   this.centered = true;
}

xPopUp.prototype = new xSection();

xPopUp.prototype.setSize = function(w,h){
   this.node.style.width = w + "px";
   this.node.style.height = h + "px";
   return this;
}

xPopUp.prototype.setPos = function(x,y){
   this.node.style.position = "fixed";
   this.node.style.top = y + "px";
   this.node.style.left = x + "px";
   return this;
}

xPopUp.prototype.setCentered = function(c){
   this.centered = c;
}

xPopUp.prototype.center = function(){
   var ww = window.innerWidth;
   var wh = window.innerHeight;
   var x, y;
   x = Math.floor((ww - this.node.offsetWidth) / 2);
   y = Math.floor((wh - this.node.offsetHeight) / 2);
   this.setPos(x,y);
   return this;
}

xPopUp.prototype.show = function(){
   this.node.style.display = "block";
   this.is_visible = true;
   if (this.centered)
      this.center();
   return this;
}

xPopUp.prototype.hide = function(){
   this.node.style.display = "none";
   this.is_visible = false;
   return this;
}

/*        Interface - Abstract    */

function xInterface(){
   var baseURL;

   this.baseURL = "/android.itf?";
}

xInterface.prototype.getRemoteInterface = function(query){
   query = this.baseURL + query;

   var myAjax = new XMLHttpRequest();
   myAjax.open("GET",query,false);
   myAjax.send();
   return JSON.parse(myAjax.responseText);
}

xInterface.prototype.rawRemoteInterface = function(query){
   query = this.baseURL + query;

   var myAjax = new XMLHttpRequest();
   myAjax.open("GET",query,false);
   myAjax.send();
   return myAjax.responseText;
}

xInterface.prototype.rawPostRemoteInterface = function(query,data){
   query = this.baseURL + query;

   var myAjax = new XMLHttpRequest();
   myAjax.open("POST",query,false);
   myAjax.send(data);
   return myAjax.responseText;
}

xInterface.prototype.postRemoteInterface = function(query,data){
   query = this.baseURL + query;

   var myAjax = new XMLHttpRequest();
   myAjax.open("POST",query,false);
   myAjax.send(data);
   return JSON.parse(myAjax.responseText);
}


/*        SQL Interface          */



function xSQL(){
   var dbHandle;
   var cursor;
   xInterface.call(this);
}

xSQL.prototype = new xInterface();

xSQL.prototype.openDB = function(path, basePath){
   var resObj;

   if (typeof Android != "undefined"){
      this.dbHandle = Android.xSqlOpen(path,basePath || "");
   }
   else{
      var q = "opt=sql&action=opendb" +
              "&path=" + encodeURIComponent(path) +
              "&bpath=" + encodeURIComponent(basePath || "");
      resObj = this.getRemoteInterface(q);
      this.dbHandle = resObj.handle
   }
   return this.dbhandle;
}

xSQL.prototype.sqlExec = function(q){
   if (typeof Android != "undefined"){
      Android.xSqlExec(this.dbHandle,q);
   }
   else{
      var q = "opt=sql&action=exec" +
              "&handle=" + this.dbHandle +
              "&query=" + btoa(q);
      this.getRemoteInterface(q);
   }
}

xSQL.prototype.sqlInsert = function(q){
   var resObj;

   if (typeof Android != "undefined"){
      return Android.xSqlInsert(this.dbHandle,q);
   }
   else{
      var q = "opt=sql&action=insert" +
              "&handle=" + this.dbHandle +
              "&query=" + btoa(q);
      resObj = this.getRemoteInterface(q);
      return resObj.rowid;
   }
}

xSQL.prototype.sqlSelect = function(q){
   var resObj;

   if (typeof Android != "undefined"){
      this.cursor = Android.xSqlSelect(this.dbHandle,q);
   }
   else{
      var q = "opt=sql&action=select" +
              "&handle=" + this.dbHandle +
              "&query=" + btoa(q);
      resObj = this.getRemoteInterface(q);
      this.cursor = resObj.cursor;
   }
   return this.cursor;
}

xSQL.prototype.getRowCount = function(){
   var resObj;

   if (typeof Android != "undefined"){
      var rowcnt = Android.xSqlGetRowCount(this.cursor);
      return rowcnt;
   }
   else{
      var q = "opt=sql&action=getrowcount" +
              "&cursor=" + this.cursor;
      resObj = this.getRemoteInterface(q);
      return resObj.rowcount;
   }
}

xSQL.prototype.gotoLastRow = function(){
   var resObj;

   if (typeof Android != "undefined"){
      var rowcnt = Android.xSqlGotoLastRow(this.cursor);
      return rowcnt;
   }
   else{
      var q = "opt=sql&action=gotolastrow" +
              "&cursor=" + this.cursor;
      resObj = this.getRemoteInterface(q);
      return resObj.rowcount;
   }
}

xSQL.prototype.getNextRow = function(){
   var resObj;

   if (typeof Android != "undefined"){
      var row = Android.xSqlGetNextRow(this.cursor);
      if (!row)
         return false;
      resObj = JSON.parse(row);
      return resObj
   }
   else{
      var q = "opt=sql&action=getnextrow" +
              "&cursor=" + this.cursor;
      resObj = this.getRemoteInterface(q);
      if (Object.keys(resObj).length == 0)
         return false;
      else
         return resObj;
   }
}

xSQL.prototype.getPrevRow = function(){
   var resObj;

   if (typeof Android != "undefined"){
      var row = Android.xSqlGetPrevRow(this.cursor);
      if (!row)
         return false;
      resObj = JSON.parse(row);
      return resObj
   }
   else{
      var q = "opt=sql&action=getprevrow" +
              "&cursor=" + this.cursor;
      resObj = this.getRemoteInterface(q);
      if (Object.keys(resObj).length == 0)
         return false;
      else
         return resObj;
   }
}

xSQL.prototype.closeCursor = function(){
   if (typeof Android != "undefined"){
      Android.xSqlCloseCursor(this.cursor);
   }
   else{
      var q = "opt=sql&action=closecursor" +
              "&cursor=" + this.cursor;
      this.getRemoteInterface(q);
   }
}

xSQL.prototype.closeDB = function(){
   if (typeof Android != "undefined"){
      Android.xSqlClose(this.dbHandle);
   }
   else{
      var q = "opt=sql&action=closedb" +
              "&handle=" + this.dbHandle;
      this.getRemoteInterface(q);
   }
}

xSQL.prototype.deleteDB = function (path, basePath){
   if (typeof Android != "undefined"){
      Android.xSqlDeleteDatabase(path,basePath || "");
   }
   else{
      var q = "opt=sql&action=deletedb" +
              "&path=" + encodeURIComponent(path) +
              "&bpath=" + encodeURIComponent(basePath || "");
      this.getRemoteInterface(q);
   }
}


/*          File IO Interface       */

function xFile(){
   var fileHandle;

   xInterface.call(this);
}

xFile.prototype = new xInterface();

xFile.prototype.open = function(path, basePath){
   var resObj;

   if (typeof Android != "undefined"){
      this.fileHandle = Android.xFileOpen(path,basePath || "");
   }
   else{
      var q = "opt=file&action=openfile" +
              "&path=" + encodeURIComponent(path) +
              "&bpath=" + encodeURIComponent(basePath || "");
      resObj = this.getRemoteInterface(q);
      this.fileHandle = resObj.handle;
   }
   return this.fileHandle;
}

xFile.prototype.listFiles = function(path, basePath){
   var resObj;

   if (typeof Android != "undefined"){
      var filelist = Android.xListFiles(path,basePath);
      if (!filelist)
         return false;
      resObj = JSON.parse(filelist);
      return resObj;
   }
   else{
      var q = "opt=file&action=listfiles" +
              "&path=" + encodeURIComponent(path) +
              "&bpath=" + encodeURIComponent(basePath || "");
      resObj = this.getRemoteInterface(q);
      if (Object.keys(resObj).length == 0)
         return false;
      else
         return resObj;
   }
}

xFile.prototype.mkDir = function(path, basePath){
   if (typeof Android != "undefined"){
      Android.xFileMkDir(path,basePath || "");
   }
   else{
      var q = "opt=file&action=mkdir" +
              "&path=" + encodeURIComponent(path) +
              "&bpath=" + encodeURIComponent(basePath || "");
      this.getRemoteInterface(q);
   }
}

xFile.prototype.getExtStoragePath = function(){
   if (typeof Android != "undefined"){
      return Android.xGetExternalStoragePath();
   }
   else{
      var q = "opt=file&action=getextpath";
      resObj = this.getRemoteInterface(q);
      return resObj.extpath;
   }
}

xFile.prototype.close = function(){
   if (typeof Android != "undefined"){
      Android.xFileClose(this.fileHandle);
   }
   else{
      var q = "opt=file&action=closefile" +
              "&handle=" + this.fileHandle;
      this.getRemoteInterface(q);
   }
}

xFile.prototype.deleteFile = function(){
   if (typeof Android != "undefined"){
      Android.xFileDelete(this.fileHandle);
   }
   else{
      var q = "opt=file&action=deletefile" +
              "&handle=" + this.fileHandle;
      this.getRemoteInterface(q);
   }
}

xFile.prototype.read = function(){
   var data;

   if (typeof Android != "undefined"){
      var data = Android.xFileRead(this.fileHandle);
      return data;
   }
   else{
      var q = "opt=file&action=fileread" +
              "&handle=" + this.fileHandle;
      data = this.rawRemoteInterface(q);
      return data;
   }
}

xFile.prototype.write = function(data,append){
   var ap;

   if (append)
      ap = "true";
   else
      ap = "false";
   if (typeof Android != "undefined"){
      Android.xFileWrite(this.fileHandle,data,ap);
   }
   else{
      var q = "opt=file&action=filewrite" +
              "&append=" + ap +
              "&handle=" + this.fileHandle;
      this.postRemoteInterface(q,data);
   }
}

/*          Export File Interface         */

function xExportFile(){
   var handle;

   xInterface.call();
}

xExportFile.prototype = new xInterface();

xExportFile.prototype.set = function(mime,fname,data){
   var resObj;
   var q = "opt=export&action=set&mime=" + encodeURIComponent(mime) + "&fname=" + encodeURIComponent(fname);

   resObj = this.postRemoteInterface(q,data);
   this.handle = resObj.handle;
   return this.handle;
}

xExportFile.prototype.get = function(){
   var form = document.createElement("form");

   if (typeof Android != "undefined")
      form.action = this.baseURL + "opt=export&action=getwv&handle=" + this.handle;
   else
      form.action = this.baseURL + "opt=export&action=get&handle=" + this.handle;
   form.method = "POST";
   document.body.appendChild(form);
   form.submit();
   document.body.removeChild(form);
}

/* Export Project */



function xExportProject(proj){
   xInterface.call(this);
   this.project = proj;
}

xExportProject.prototype = new xInterface();

xExportProject.prototype.get = function(){
   var form = document.createElement("form");
   form.action = this.baseURL + "opt=exportproject&action=export&project=" + this.project;
   form.method = "POST";
   document.body.appendChild(form);
   form.submit();
   document.body.removeChild(form);
}

/* Import Project */

function xImportProject(){
   xInterface.call(this);
}

xImportProject.prototype = new xInterface();

xImportProject.prototype.get = function(){
   if (typeof Android != "undefined"){
      Android.xSelectImportProjectFile();
   }
   else{
   }
}


/*           Dialog Interface             */

function xAlertDialog(title,msg){
   if (typeof Android != "undefined"){
      Android.xAlertDialog(title,msg);
   }
   else{
      alert(title + "\n" + msg);
   }
}

/*          Run user app Interface      */

function xRunUserApp(title,app,debug){
   var url;
   if (typeof Android != "undefined"){
      url = "http://localhost:8123/system/launcher.html?app=" + encodeURIComponent(app);
      Android.xRunUrl(title,url,debug);
   }
   else{
      url = "/system/launcher.html?app=" + app;
      window.open(url,"_blank");
   }
}

/*          HTTP Interface          */

function xHTTP(){
   xInterface.call(this);
}

xHTTP.prototype = new xInterface();

xHTTP.prototype.get = function(url){
   var data;

   if (typeof Android != "undefined"){
      var data = Android.xHTTPGet(url);
      return data;
   }
   else{
      var q = "opt=http&action=get" +
              "&url=" + encodeURIComponent(url);
      data = this.rawRemoteInterface(q);
      return data;
   }
}

xHTTP.prototype.post = function(url,pdata){
   var data;

   if (typeof Android != "undefined"){
      var data = Android.xHTTPPost(url,pdata);
      return data;
   }
   else{
      var q = "opt=http&action=get" +
              "&url=" + encodeURIComponent(url);
      data = this.rawPostRemoteInterface(q,pdata);
      return data;
   }
}

/*          Close App             */

function xCloseApp(){
   var url;
   if (typeof Android != "undefined"){
      Android.xFinish();
   }
   else{
      window.close();
   }
}



/*          Error Log Interface          */

function xGetLogCat(level){
   if (typeof Android != "undefined"){
      return Android.xGetLogCat(level);
   }
   return "";
}

function xGetLogCatFormated(clss,level){
   if (typeof Android != "undefined"){
      return Android.xGetLogCatFormated(clss,level);
   }
   return "";
}

function xClearLogCat(){
   if (typeof Android != "undefined"){
      return Android.xClearLogCat();
   }
}

/*         Functions                    */

function xGetURLParameter(name) {
  return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null
}

Number.prototype.formatMoney = function(c, d, t){
var n = this,
    c = isNaN(c = Math.abs(c)) ? 2 : c,
    d = d == undefined ? "." : d,
    t = t == undefined ? "," : t,
    s = n < 0 ? "-" : "",
    i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "",
    j = (j = i.length) > 3 ? j % 3 : 0;
   return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
 };
;
