/*  Copyright 2014: Xavier Llamas Rolland                      */
/*                                                             */
/*  This software distributed under the GPLv3 License          */
/*  Updated for Bootstrap 5.3.8                               */
/*                                                             */
////////////////////////////////////////////////////////////////



/* xbScript Classes - Bootstrap 5 augmented xScript classes */


/* xbLink */

function xbLink(label,href,clss){
   xLink.call(this,label,href,"btn " + (clss || "btn-outline-primary"));
}

xbLink.prototype = new xLink();

/* xbStringInput */

function xbStringInput(label,name,clss,wclss){
   xInput.call(this,clss || "form-control","mb-3 " + (wclss || ""));
   this.iname = name;
   this.node = document.createElement("div");
   this.node.id = this.id + "_w";
   this.node.className = this.wclss;
   var l = "<label class='form-label fw-bold' for='" + this.id + "'>" + label + "</label>";
   var i = "<input type='text" +
           "' id='" + this.id +
           "' name='" + name +
           "' class='" + this.clss +
           "'>";
   this.node.innerHTML = l + i;
}

xbStringInput.prototype = new xInput();

xbStringInput.prototype.setError = function(e){
   if (e)
      this.node.classList.add("has-validation");
   else
      this.node.classList.remove("has-validation");
   return this;
}

/* xbNumberInput */

function xbNumberInput(label,name,clss,wclss){
   xbStringInput.call(this,label,name,clss,wclss);
   this.setType("number");
}

xbNumberInput.prototype = new xbStringInput();

/* xbEmailInput */

function xbEmailInput(label,name,clss,wclss){
   xbStringInput.call(this,label,name,clss,wclss);
   this.setType("email");
}

xbEmailInput.prototype = new xbStringInput();

/* xbTelInput */

function xbTelInput(label,name,clss,wclss){
   xbStringInput.call(this,label,name,clss,wclss);
   this.setType("tel");
}

xbTelInput.prototype = new xbStringInput();

/* xbDateInput */

function xbDateInput(label,name,clss,wclss){
   xbStringInput.call(this,label,name,clss,wclss);
   this.setType("date");
}

xbDateInput.prototype = new xbStringInput();

/* xbRangeInput */

function xbRangeInput(label,name,clss,wclss){
   xbStringInput.call(this,label,name,clss,wclss);
   this.setType("range");
}

xbRangeInput.prototype = new xbStringInput();

/* xbPasswordInput */

function xbPasswordInput(label,name,clss,wclss){
   xbStringInput.call(this,label,name,clss,wclss);
   this.setType("password");
}

xbPasswordInput.prototype = new xbStringInput();

/* xbColorPicker */

function xbColorPicker(label,name,clss,wclss){
   xbStringInput.call(this,label,name,"form-control form-control-color " + (clss || ""),wclss);
   this.setType("color");
}

xbColorPicker.prototype = new xbStringInput();

/* xbFileInput */

function xbFileInput(label,name,clss,wclss){
   xbStringInput.call(this,label,name,clss || "_",wclss);
   this.setType("file");
}

xbFileInput.prototype = new xbStringInput();


/* xbMultiFileInput */

function xbMultiFileInput(label,name,clss,wclss){
   xbStringInput.call(this,label,name,clss || "_",wclss);
   this.setType("file");
   this.inode = this.node.getElementsByTagName("input")[0];
   this.inode.setAttribute("multiple","");
   this.fileList = document.createElement("ol");
   this.node.append(this.fileList);
   var mf = this;
   this.inode.addEventListener("change",function(evnt){mf.updateFileList()});
}

xbMultiFileInput.prototype = new xbStringInput();

xbMultiFileInput.prototype.updateFileList = function(){
  this.fileList.innerHTML = "";
  for (var i = 0; i < this.inode.files.length; i++){
    var e = document.createElement("li");
    e.innerHTML = this.inode.files[i].name;
    this.fileList.append(e);
  }
}

/* xbTextAreaInput */

function xbTextAreaInput(label,name,rows,clss,wclss){
   xInput.call(this,clss || "form-control","mb-3 " + (wclss || ""));
   this.iname = name;
   this.node = document.createElement("div");
   this.node.id = this.id + "_w";
   this.node.className = this.wclss;
   var l = "<label class='form-label fw-bold' for='" + name + "'>" + label + "</label>";
   var i = "<textarea" +
           " id='" + this.id +
           "' name='" + name +
           "' class='" + this.clss +
           "' rows='" + rows +
           "'></textarea>";
   this.node.innerHTML = l + i;
}

xbTextAreaInput.prototype = new xInput();

xbTextAreaInput.prototype.setFocus = function(){
   this.node.getElementsByTagName("textarea")[0].focus();
   return this;
}

xbTextAreaInput.prototype.setSelected = function(){
   this.node.getElementsByTagName("textarea")[0].select();
   return this;
}

xbTextAreaInput.prototype.setValue = function(v){
   this.node.getElementsByTagName("textarea")[0].value = v;
   return this;
}

xbTextAreaInput.prototype.getValue = function(){
   return this.node.getElementsByTagName("textarea")[0].value;
}

xbTextAreaInput.prototype.setPlaceholder = function(p){
   this.node.getElementsByTagName("textarea")[0].placeholder = p;
   return this;
}

xbTextAreaInput.prototype.setError = function(e){
   if (e)
      this.node.classList.add("has-validation");
   else
      this.node.classList.remove("has-validation");
   return this;
}

xbTextAreaInput.prototype.setReadOnly = function(r){
   this.node.getElementsByTagName("textarea")[0].readOnly = r;
   return this;
}

xbTextAreaInput.prototype.setDisabled = function(d){
   this.node.getElementsByTagName("textarea")[0].disabled = d;
   return this;
}

xbTextAreaInput.prototype.setName = function(name){
   this.iname = name;
   this.node.getElementsByTagName("textarea")[0].setAttribute("name",name);
   this.node.getElementsByTagName("label")[0].setAttribute("for",name);
   return this;
}

/* xbCheckBox */

function xbCheckBox(label,name,clss,wclss){
   xInput.call(this,clss || "form-check-input","form-check " + (wclss || ""));
   this.iname = name;
   this.node = document.createElement("div");
   this.node.id = this.id + "_w";
   this.node.className = this.wclss;
   var i = "<input type='checkbox" +
           "' id='" + this.id +
           "' name='" + name +
           "' class='" + this.clss +
           "'>" +
           "<label class='form-check-label' for='" + this.id + "'>" + label + "</label>";
   this.node.innerHTML = i;
}

xbCheckBox.prototype = new xInput();

xbCheckBox.prototype.setChecked = function(c){
   this.node.getElementsByTagName("input")[0].checked = c;
   return this;
}

xbCheckBox.prototype.getValue = function(){
   return this.node.getElementsByTagName("input")[0].checked;
}

xbCheckBox.prototype.setError = function(e){
   if (e)
      this.node.classList.add("has-validation");
   else
      this.node.classList.remove("has-validation");
   return this;
}

/* xbRadioBtnGrp */

function xbRadioBtnGrp(clss){
  xRadioBtnGrp.call(this,clss || "");
}

xbRadioBtnGrp.prototype = new xRadioBtnGrp();

/* xbRadioBtn */

function xbRadioBtn(label,name,clss){
   xRadioBtn.call(this,label,name,clss || "form-check-input","form-check");
}

xbRadioBtn.prototype = new xRadioBtn();

xbRadioBtn.prototype.setDisabled = function(d){
   this.node.getElementsByTagName("input")[0].disabled = d;
   var lbl = this.node.getElementsByTagName("label")[0];
   if (lbl){
      lbl.style.textDecoration = d ? "line-through" : "";
      lbl.style.opacity = d ? "0.5" : "";
   }
   return this;
}


/* xbSelect */

function xbSelect(label,sname,clss,wclss){
   xInput.call(this,clss || "form-select","mb-3 " + (wclss || ""));
   this.iname = sname;
   this.node = document.createElement("div");
   this.node.id = this.id + "_w";
   this.node.className = this.wclss;
   var l = "<label class='form-label fw-bold' for='" + sname + "'>" + label + "</label>";
   var s = "<select id='" + this.id + "' name='" + sname + "' class='" + this.clss + "'>";
   s += "</select>";
   this.node.innerHTML = l + s;
}

xbSelect.prototype = new xInput();

xbSelect.prototype.setFocus = function(){
   this.node.getElementsByTagName("select")[0].focus();
   return this;
}

xbSelect.prototype.setSelected = function(){
   this.node.getElementsByTagName("select")[0].select();
   return this;
}

xbSelect.prototype.addOption = function(label,value){
   var n = this.node.getElementsByTagName("select")[0];
   opt = document.createElement("option");
   opt.text = label;
   opt.value = value;
   n.appendChild(opt);
   return this;
}

xbSelect.prototype.addOptions = function(options){
   var n = this.node.getElementsByTagName("select")[0];
   var opt;
   for(var i = 0; i < options.length; i++){
      opt = document.createElement("option");
      opt.text = options[i].label;
      opt.value = options[i].value;
      n.appendChild(opt);
   }
   return this;
}

xbSelect.prototype.setSelected = function(s){
   var n = this.node.getElementsByTagName("select")[0];
   for (var i = 0; i < n.options.length; i++){
     if (s == n.options[i].value){
        n.selectedIndex = i;
        break;
     }
   }
   return this;
}

xbSelect.prototype.clear = function(){
   var n = this.node.getElementsByTagName("select")[0];
   n.selected.index = -1;
   return this;
}

xbSelect.prototype.setValue = function(v){
   this.setSelected(v);
   return this;
}

xbSelect.prototype.getValue = function(){
   return this.node.getElementsByTagName("select")[0].value;
}

xbSelect.prototype.setError = function(e){
   if (e)
      this.node.classList.add("has-validation");
   else
      this.node.classList.remove("has-validation");
   return this;
}

xbSelect.prototype.setReadOnly = function(r){
   return this;
}

xbSelect.prototype.setDisabled = function(d){
   this.node.getElementsByTagName("select")[0].disabled = d;
   return this;
}

xbSelect.prototype.setName = function(name){
   this.iname = name;
   this.node.getElementsByTagName("select")[0].setAttribute("name",name);
   this.node.getElementsByTagName("label")[0].setAttribute("for",name);
   return this;
}

xbSelect.prototype.clearOptions = function(){
   var n = this.node.getElementsByTagName("select")[0];
   while(n.firstChild)
      n.removeChild(n.firstChild);
   return this;
}

/* xbMultiSelect */

function xbMultiSelect(label,sname,clss,wclss){
   xbSelect.call(this,label,sname,clss,wclss);
   this.node.getElementsByTagName("select")[0].setAttribute("multiple","");
}

xbMultiSelect.prototype = new xbSelect();

xbMultiSelect.prototype.getValues = function(){
   var values = [];
   var n = this.node.getElementsByTagName("select")[0];
   for (var i = 0; i < n.options.length; i++){
      if (n.options[i].selected)
         values.push(n.options[i].value);
   }
   return values;
}

function xbDateTimePicker(label,name,noManual,icon,clss,wclss){
   xInput.call(this,clss || "form-control","mb-3 " + (wclss || ""));
   this.format = "yyyy-MM-dd HH:mm"; // Tempus Dominus 6 usa este formato
   this.icon = (icon || "fa-solid fa-calendar fa-fw");
   this.mindate = null;
   this.iname = name;
   this.tempusPicker = null; // Instancia de Tempus Dominus
   
   this.node = document.createElement("div");
   this.node.id = this.id + "_w";
   this.node.className = this.wclss;
      
   var l = "<label class='form-label fw-bold' for='" + name + "'>" + label + "</label>";
   var i = "<div class='input-group' id='" + this.id + "_ig" + "' data-td-target-input='nearest' data-td-target-toggle='nearest'>" +
           "<input type='text" +
           "' id='" + this.id +
           "' name='" + name +
           "' class='" + this.clss +
           "' data-td-target-input='nearest'" + (noManual ? " readonly" : "") + ">" +
           "<span class='input-group-text' data-td-icon-next='fa-solid fa-chevron-right'>" +
           "<i class='" + this.icon + "'></i>" +
           "</span>" +
           "</div>";
   this.node.innerHTML = l + i;
}

xbDateTimePicker.prototype = new xInput();

xbDateTimePicker.prototype.setError = function(e){
   if (e)
      this.node.classList.add("has-validation");
   else
      this.node.classList.remove("has-validation");
   return this;
}

xbDateTimePicker.prototype.setMinDate = function(date){
   this.mindate = date;
   if (this.tempusPicker){
      this.tempusPicker.minDate = date;
   }
   return this;
}

xbDateTimePicker.prototype.setMaxDate = function(date){
   this.maxdate = date;
   if (this.tempusPicker){
      this.tempusPicker.maxDate = date;
   }
   return this;
}

xbDateTimePicker.prototype.setDisabledDates = function(dateRanges){
   var dates = [];
   for (var i = 0; i < dateRanges.length; i++){
      var d = new Date(dateRanges[i].fecha_ini + "T00:00:00");
      var end = new Date(dateRanges[i].fecha_fin + "T00:00:00");
      while (d <= end){
         dates.push(new Date(d));
         d.setDate(d.getDate() + 1);
      }
   }
   this.disableddates = dates;
   if (this.tempusPicker){
      this.tempusPicker.updateOptions({restrictions: {disabledDates: dates}});
   }
   return this;
}

xbDateTimePicker.prototype.getValue = function(){
   /*
   if (this.tempusPicker && this.tempusPicker.viewDate){
      return this.tempusPicker.viewDate;
   }
   */
   return this.node.querySelector("input").value;
}

xbDateTimePicker.prototype.setValue = function(value){
   if (this.tempusPicker){
      this.tempusPicker.viewDate = value;
   }
   else{
      this.node.querySelector("input").value = value;
   }
   return this;
}

xbDateTimePicker.prototype.run = function(){
   var options = {
      localization: {
         locale: 'es',
         format: this.format,
         hourCycle: 'h24'
      },
      display: {
         icons: {
            type: 'icons',
            time: 'fa-solid fa-clock',
            date: 'fa-solid fa-calendar',
            up: 'fa-solid fa-arrow-up',
            down: 'fa-solid fa-arrow-down',
            previous: 'fa-solid fa-chevron-left',
            next: 'fa-solid fa-chevron-right',
            today: 'fa-solid fa-calendar-check',
            clear: 'fa-solid fa-trash',
            close: 'fa-solid fa-xmark'
         },
         sideBySide: false,
         calendarWeeks: false,
         viewMode: 'calendar',
         keepOpen: false,
         inline: false,
         theme: 'light'
      },
      meta: {
         timeZone: 'UTC',
         useUTC: true
      }
   };

   // Aplicar formato según el tipo de picker
   if (this.format){
      options.localization.format = this.format;
   }

   // Aplicar minDate si existe
   if (this.mindate){
      options.restrictions = options.restrictions || {};
      options.restrictions.minDate = this.mindate;
   }

   // Aplicar maxDate si existe
   if (this.maxdate){
      options.restrictions = options.restrictions || {};
      options.restrictions.maxDate = this.maxdate;
   }

   // Aplicar fechas deshabilitadas si existen
   if (this.disableddates){
      options.restrictions = options.restrictions || {};
      options.restrictions.disabledDates = this.disableddates;
   }

   try {
      // Inicializar Tempus Dominus
      var element = document.getElementById(this.id);
      this.tempusPicker = new tempusDominus.TempusDominus(element, options);
      var tp = this.tempusPicker;
      var div = document.getElementById(this.id + "_ig");
      var span = div.querySelectorAll("span");
      span[0].addEventListener("click", function(e){
            tp.show();
            e.preventDefault();
            e.stopPropagation();
         });
   }
   catch(e){
      console.error("Error inicializando Tempus Dominus: " + e);
   }

   return this;
}

xbDateTimePicker.prototype.destroy = function(){
   if (this.tempusPicker){
      this.tempusPicker.dispose();
      this.tempusPicker = null;
   }
   return this;
}

/* xbDatePicker */

function xbDatePicker(label,name,noManual,icon,clss,wclss){
   xbDateTimePicker.call(this,label,name,noManual,icon,clss,wclss);
   this.format = "yyyy-MM-dd"; // Tempus Dominus 6 usa este formato
}

xbDatePicker.prototype = new xbDateTimePicker();

/* xbTimePicker */

function xbTimePicker(label,name,noManual,icon,clss,wclss){
   xbDateTimePicker.call(this,label,name,noManual,(icon || "fa-solid fa-clock fa-fw"),clss,wclss);
   this.format = "HH:mm"; // Tempus Dominus 6 usa este formato
}

xbTimePicker.prototype = new xbDateTimePicker();


/* xbForm */

function xbForm(clss){
  xMultiElement.call(this,clss || "");
  this.node = document.createElement("form");
  this.node.id = this.id;
  this.node.className = this.clss;
}

xbForm.prototype = new xMultiElement();

xbForm.prototype.getFormData = function(){
   var fields = new Object();

   function deepGetFormData(e){
      for (var i = 0; i < e.elements.length; i++){
         if (typeof e.elements[i].elements !== "undefined")
            deepGetFormData(e.elements[i]);
         if (typeof e.elements[i].element !== "undefined"){
            if (typeof e.elements[i].element.getValue !=="undefined"){
               fields[e.elements[i].element.getName()] = e.elements[i].element.getValue();
            }
         }
         if (typeof e.elements[i].getValue !== "undefined"){
            fields[e.elements[i].getName()] = e.elements[i].getValue();
         }
      }
   }

   deepGetFormData(this);
   return fields;
}

xbForm.prototype.validateForm = function(){
   var val = true;

   function deepValidate(e){
      if (typeof e.elements == "undefined")
         return;
      for (var i = 0; i < e.elements.length; i++){
         deepValidate(e.elements[i]);
         if (typeof e.elements[i].getValue !== "undefined"){
            if (!e.elements[i].validate()){
               val = false;
               e.elements[i].setError(true);
            }
            else
               e.elements[i].setError(false);
         }
      }
   }

   deepValidate(this);
   return val;
}

/* xbButton */

function xbButton(label,clss){
   xButton.call(this,label,"btn " + (clss || "btn-primary"));
}

xbButton.prototype = new xButton()

/* xbButtonIcon */

function xbButtonIcon(label,icon,right,clss){
   var nlabel = "<i class='" + icon + "'></i>";
   if (right)
      xButton.call(this,label + " " + nlabel,"btn " + (clss || "btn-primary"));
   else
      xButton.call(this,nlabel + " " + label,"btn " + (clss || "btn-primary"));
}

xbButtonIcon.prototype = new xButton();

/* xbButtonDropdown */

function xbButtonDropdown(label,icon,clss,wclss,dclss){
   xSection.call(this,"dropdown " + ("" || wclss));
   icon = icon || "";
   var btnHtml = label;
   if (icon) btnHtml += " <i class='" + icon + "'></i>";
   this.button = new xbButton(btnHtml,"dropdown-toggle " + (clss || "btn-primary"));
   this.button.node.setAttribute("data-bs-toggle","dropdown");
   this.button.node.setAttribute("aria-expanded","false");
   this.list = new xList("dropdown-menu " + (dclss || ""));
   this.addElement(this.button)
       .addElement(this.list);
}

xbButtonDropdown.prototype = new xSection();

xbButtonDropdown.prototype.addItem = function(item){
   this.list.addElement(item);
   return this;
}

/* xbButtonDropdownItem */

function xbButtonDropdownItem(label,f,clss){
   xLink.call(this,label,"#",clss || "dropdown-item");
   this.bindFunction(f);
}

xbButtonDropdownItem.prototype = new xLink();

/* xbButtonGroup */

function xbButtonGroup(clss){
   xSection.call(this,"btn-group " + (clss || ""));
   this.node.setAttribute("role","group");
}

xbButtonGroup.prototype = new xSection();

xbButtonGroup.prototype.addButton = function(btn){
   this.addElement(btn);
   return this;
}

/* xbButtonGroupVertical */

function xbButtonGroupVertical(clss){
   xbButtonGroup.call(this,"btn-group-vertical " + (clss || ""));
}

xbButtonGroupVertical.prototype = new xbButtonGroup();

/* xbImage */

function xbImage(src,alt,clss){
   if (typeof clss == "undefined")
      clss = "";
   xImage.call(this,src,alt,clss);
}

xbImage.prototype = new xImage();

/* xTextBox */

function xbTextBox(text, clss){
   xTextBox.call(this,text,clss);
}

xbTextBox.prototype = new xTextBox();

/* xbPara */

function xbPara(text, clss){
   if (typeof clss == "undefined")
      clss = "";
   xPara.call(this,text,clss);
}

xbPara.prototype = new xPara();

/* xbAlert         */

function xbAlert(clss){
   xSection.call(this,"alert " + (clss || "alert-info"));
   this.node.setAttribute("role","alert");
}

xbAlert.prototype = new xSection();


/* xbProgressBar */

function xbProgressBar(bmin, bmax, clss){
   xSection.call(this,"progress");
   this.bar = new xSection("progress-bar " + (clss || ""));
   this.bar.node.setAttribute("role","progressbar");
   this.bar.node.setAttribute("aria-valuenow",0);
   this.bar.node.setAttribute("aria-valuemin",bmin);
   this.bar.node.setAttribute("aria-valuemax",bmax);
   this.bar.node.style.width = "0%";
   this.addElement(this.bar);
}

xbProgressBar.prototype = new xSection();

xbProgressBar.prototype.setProgress = function(v,txt){
   this.bar.node.setAttribute("aria-valuenow",v);
   this.bar.node.style.width = v + "%";
   if (txt)
      this.bar.node.innerHTML = txt;
   return this;
}

/* xbJumbotron */

function xbJumbotron(){
   xSection.call(this,"p-5 mb-4 bg-body-secondary rounded-lg m-3");
}

xbJumbotron.prototype = new xSection();

/* xbLayout */

function xbLayout(rows,cols,widths,clss){
   xLayout.call(this,rows,cols,widths,clss);
}

xbLayout.prototype = new xLayout();

/* xbPanel */

function xbPanel(clss){
   xPanel.call(this,clss || "");
}

xbPanel.prototype = new xPanel();

/* xbTitlePanel */

function xbTitlePanel(title, clss){
   xSection.call(this,"card " + (clss || ""));
   var h = "<div class='card-header'>" + title + "</div>";
   var b = "<div class='card-body'></div>";
   this.node.innerHTML = h + b;
}

xbTitlePanel.prototype = new xSection();

xbTitlePanel.prototype.setTitle = function(title){
   var t = this.node.getElementsByTagName("div")[0];
      t.innerHTML = title;
   return this;
}

xbTitlePanel.prototype.addElement =  function(e){
   var d = this.node.getElementsByTagName("div")[1];
   this.elements.push(e);
   d.appendChild(e.node);
   e.setParent(this);
   return this;
}

xbTitlePanel.prototype.clear = function(){
   var d = this.node.getElementsByTagName("div")[1];
   d.innerHTML = "";
   this.removeAllElements();
   return this;
}

/* xbTable */

function xbTable(clss){
   xTable.call(this,"table " + (clss || ""));
}

xbTable.prototype = new xTable();

/* xbElementsTable */

function xbElementsTable(clss){
   xElementsTable.call(this,"table " + (clss || ""));
}

xbElementsTable.prototype = new xElementsTable();

/* xbTabs */

function xbTabs(clss){
   xSection.call(this,"");

   // Unique ID for this tab set
   this._id = "xbt_" + Math.random().toString(36).slice(2,8);

   // Nav tabs — desktop only (d-none d-lg-flex hides on mobile)
   this.navNode = document.createElement("ul");
   this.navNode.className = "nav nav-tabs d-none d-lg-flex " + (clss || "");
   this.navNode.setAttribute("role","tablist");
   this.node.appendChild(this.navNode);

   // Accordion — single content host for all panes.
   // On desktop: CSS hides headers and shows only the active body as a plain panel.
   // On mobile:  renders as a standard Bootstrap accordion.
   this.accordionNode = document.createElement("div");
   this.accordionNode.className = "accordion xb-accordion";
   this.accordionNode.id = this._id;
   this.node.appendChild(this.accordionNode);

   this.elements = [];
   this.tabs = [];
}

xbTabs.prototype = new xSection();

xbTabs.prototype.addPane = function(title,pane){
   var self = this;
   var idx  = this.tabs.length;
   var accCollapseId = "acc_" + pane.id;

   // --- Nav tab item (desktop) ---
   var li = document.createElement("li");
   li.className = "nav-item";
   li.setAttribute("role","presentation");

   var a = document.createElement("a");
   a.className = "nav-link";
   a.href = "#";
   a.id = pane.id + "_tab";
   a.setAttribute("role","tab");
   a.setAttribute("aria-controls",pane.id);
   a.setAttribute("aria-selected","false");
   a.innerHTML = title;
   a.addEventListener("click",function(e){
      e.preventDefault();
      self.activatePane(idx);
   });

   li.appendChild(a);
   this.navNode.appendChild(li);

   // --- Accordion item (mobile selector + content host on desktop) ---
   var accItem = document.createElement("div");
   accItem.className = "accordion-item";

   var accHeader = document.createElement("h2");
   accHeader.className = "accordion-header";

   var accBtn = document.createElement("button");
   accBtn.type = "button";
   accBtn.className = "accordion-button collapsed";
   accBtn.innerHTML = title;
   accBtn.addEventListener("click",function(){
      self.activatePane(idx);
   });
   accHeader.appendChild(accBtn);
   accItem.appendChild(accHeader);

   var accCollapse = document.createElement("div");
   accCollapse.id = accCollapseId;
   accCollapse.className = "accordion-collapse collapse";

   var accBody = document.createElement("div");
   accBody.className = "accordion-body p-0";

   // pane.node is the single source of content — lives inside accordion-body
   accBody.appendChild(pane.node);
   accCollapse.appendChild(accBody);
   accItem.appendChild(accCollapse);
   this.accordionNode.appendChild(accItem);

   this.elements.push(pane);
   this.tabs.push({li:li, a:a, pane:pane, accBtn:accBtn, accCollapse:accCollapse});

   return this;
}

/* Restored for compatibility with apps written against the Bootstrap 3
   library. That version was broken — it indexed this.elements with an
   undeclared "i" and removed the wrong node — so this is the behaviour it
   documented rather than the behaviour it had. xbTabs now renders each pane
   twice (a tab on wide screens, an accordion item on narrow ones), so both
   representations have to go. */

xbTabs.prototype.removePane = function(index){
   var t = this.tabs[index];
   if (!t)
      return this;
   if (t.li && t.li.parentNode)
      t.li.parentNode.removeChild(t.li);
   if (t.accCollapse && t.accCollapse.parentNode){
      var accItem = t.accCollapse.parentNode;
      if (accItem.parentNode)
         accItem.parentNode.removeChild(accItem);
   }
   var inx = this.elements.indexOf(t.pane);
   if (inx >= 0)
      this.elements.splice(inx,1);
   this.tabs.splice(index,1);
   return this;
}

xbTabs.prototype.activatePane = function(index){
   for (var i = 0; i < this.tabs.length; i++){
      var t = this.tabs[i];
      if (i == index){
         t.a.classList.add("active");
         t.a.setAttribute("aria-selected","true");
         t.accBtn.classList.remove("collapsed");
         t.accBtn.setAttribute("aria-expanded","true");
         t.accCollapse.classList.add("show");
      } else {
         t.a.classList.remove("active");
         t.a.setAttribute("aria-selected","false");
         t.accBtn.classList.add("collapsed");
         t.accBtn.setAttribute("aria-expanded","false");
         t.accCollapse.classList.remove("show");
      }
   }
   return this;
}

xbTabs.prototype.setPaneTitle = function(index,title){
   if (this.tabs[index]){
      this.tabs[index].a.innerHTML = title;
      this.tabs[index].accBtn.innerHTML = title;
   }
   return this;
}

/* xbTabPane */

function xbTabPane(clss){
   xSection.call(this,"" + (clss || ""));
}

xbTabPane.prototype = new xSection();

/* xbNavBar */

function xbNavBar(title,clss,lclss){
   xSection.call(this,"navbar navbar-expand-lg bg-body-tertiary " + (clss || ""));
   this.node.setAttribute("data-bs-theme","light");

   var cont = document.createElement("div");
   cont.className = "container-fluid";

   var brand = document.createElement("a");
   brand.className = "navbar-brand";
   brand.href = "#";
   brand.innerHTML = title;

   // Hamburger — placed BEFORE the brand so it lands at the far left on
   // mobile. Bootstrap's navbar-expand-lg hides it on desktop automatically.
   //
   // It drives whichever navigation the app actually built. xbSideBar creates
   // #sidebar-nav and carries only a close button, so it depends on this
   // toggler to open; an app that instead puts its items straight on the
   // navbar (the IDE and the Example app both do) has no sidebar, and without
   // the collapse below its menu would stack down the page with a dead
   // hamburger beside it. Resolving the target on click rather than through a
   // static data-bs-target lets one button serve both.
   var btn = document.createElement("button");
   btn.className = "navbar-toggler me-2";
   btn.setAttribute("type","button");
   btn.setAttribute("aria-expanded","false");
   btn.setAttribute("aria-label","Toggle navigation");
   btn.innerHTML = "<span class='navbar-toggler-icon'></span>";

   var collapse = document.createElement("div");
   collapse.className = "collapse navbar-collapse";
   collapse.id = this.id + "_nav";

   this.navList = document.createElement("ul");
   this.navList.className = "navbar-nav ms-auto " + (lclss || "");
   collapse.appendChild(this.navList);

   btn.setAttribute("aria-controls",collapse.id);
   btn.onclick = function(){
      var side = document.getElementById("sidebar-nav");
      if (side)
         bootstrap.Offcanvas.getOrCreateInstance(side).toggle();
      else
         bootstrap.Collapse.getOrCreateInstance(collapse).toggle();
   };

   cont.appendChild(btn);       // far left on mobile
   cont.appendChild(brand);
   cont.appendChild(collapse);  // ms-auto pushes the list to the far right
   this.node.appendChild(cont);
}

xbNavBar.prototype = new xSection();

xbNavBar.prototype.addItem = function(item){
   var li = document.createElement("li");
   li.className = "nav-item";
   li.appendChild(item.node);
   this.navList.appendChild(li);
   this.elements.push(item);
   return this;
}

/* Restored for compatibility with apps written against the Bootstrap 3
   library. xbNavBarDropdown already builds its own <li class="nav-item
   dropdown"> with the toggle anchor inside, so unlike the Bootstrap 3 version
   this only has to append it and record it. */

xbNavBar.prototype.addDropdown = function(dd){
   this.navList.appendChild(dd.node);
   this.elements.push(dd);
   return this;
}

xbNavBar.prototype.getNavItem = function(index){
   return this.elements[index];
}

xbNavBar.prototype.setTitle = function(title){
   var brand = this.node.querySelector(".navbar-brand");
   if (brand) brand.innerHTML = title;
   return this;
}



/* xbNavBarDropdown */

function xbNavBarDropdown(title,clss){
   xSection.call(this,"");
   this.title = title;
   
   this.node.className = "nav-item dropdown";
   var a = document.createElement("a");
   a.className = "nav-link dropdown-toggle";
   a.href = "#";
   a.setAttribute("data-bs-toggle","dropdown");
   a.setAttribute("aria-expanded","false");
   a.innerHTML = title;
   
   this.list = document.createElement("ul");
   this.list.className = "dropdown-menu " + (clss || "");
   
   this.node.appendChild(a);
   this.node.appendChild(this.list);
}

xbNavBarDropdown.prototype = new xSection();

xbNavBarDropdown.prototype.addItem = function(item){
   var li = document.createElement("li");
   li.appendChild(item.node);
   this.list.appendChild(li);
   this.elements.push(item);
   return this;
}

xbNavBarDropdown.prototype.getToggle = function(){
   return this.node.querySelector("a.dropdown-toggle");
}

/* Restored: the IDE wraps its dropdown titles in an <h4>. */

xbNavBarDropdown.prototype.addTitleWrapper = function(w){
   this.titleWrapper = w;
   var a = this.getToggle();
   if (a)
      a.innerHTML = "<" + w + ">" + this.title + "</" + w + ">";
   return this;
}

/* Restored: the IDE greys whole menus out depending on whether a project or
   file is open. Bootstrap 5 marks a nav link disabled with a class on the
   link itself rather than on the wrapping <li>, and the dropdown only opens
   while data-bs-toggle is present. */

xbNavBarDropdown.prototype.disabled = function(d){
   var a = this.getToggle();
   if (a){
      if (d){
         a.classList.add("disabled");
         a.setAttribute("aria-disabled","true");
         a.removeAttribute("data-bs-toggle");
      }
      else{
         a.classList.remove("disabled");
         a.removeAttribute("aria-disabled");
         a.setAttribute("data-bs-toggle","dropdown");
      }
   }
   for (var i = 0; i < this.elements.length; i++)
      if (typeof this.elements[i].disabled == "function")
         this.elements[i].disabled(d);
   return this;
}

xbNavBarDropdown.prototype.addDivider = function(){
   var li = document.createElement("li");
   li.innerHTML = "<hr class='dropdown-divider'>";
   this.list.appendChild(li);
   return this;
}

/* xbNavBarItem */

function xbNavBarItem(label,clss){
   xLink.call(this,label,"#","nav-link");
}

xbNavBarItem.prototype = new xLink();

xbNavBarItem.prototype.bindFunction = function(f){
   this.clickf = f;
   this.node.onclick = f;
   return this;
}

/* Restored, as a Bootstrap 5 .nav-link.disabled rather than a disabled <li>. */

xbNavBarItem.prototype.disabled = function(d){
   if (d){
      this.node.classList.add("disabled");
      this.node.setAttribute("aria-disabled","true");
      this.node.onclick = null;
   }
   else{
      this.node.classList.remove("disabled");
      this.node.removeAttribute("aria-disabled");
      this.node.onclick = this.clickf || null;
   }
   return this;
}

/* xbSideBar - Bootstrap 5 */

function xbSideBar(clss){
   // offcanvas-lg (NO base "offcanvas" class): drawer on mobile (< lg),
   // normal in-flow element on desktop (≥ lg). Adding the base "offcanvas"
   // class would apply width:auto!important / visibility:visible!important
   // unconditionally, breaking both mobile hide and desktop width.
   xSection.call(this,"offcanvas-lg offcanvas-start sidebar-nav " + (clss || ""));
   this.node.setAttribute("role","navigation");
   this.node.setAttribute("tabindex","-1");
   this.node.id = "sidebar-nav";
   this.node.setAttribute("aria-labelledby","sidebarLabel");

   // Header — Bootstrap hides this automatically on desktop (≥ lg)
   var header = document.createElement("div");
   header.className = "offcanvas-header";

   var titleEl = document.createElement("h5");
   titleEl.className = "offcanvas-title";
   titleEl.id = "sidebarLabel";
   titleEl.textContent = "Menú";

   var closeBtn = document.createElement("button");
   closeBtn.type = "button";
   closeBtn.className = "btn-close";
   closeBtn.setAttribute("data-bs-dismiss","offcanvas");
   closeBtn.setAttribute("data-bs-target","#sidebar-nav");
   closeBtn.setAttribute("aria-label","Cerrar");

   header.appendChild(titleEl);
   header.appendChild(closeBtn);
   this.node.appendChild(header);

   // Offcanvas body — scrollable, holds the nav list
   var offBody = document.createElement("div");
   offBody.className = "offcanvas-body p-0";
   this.node.appendChild(offBody);

   // Lista de navegación
   this.navList = new xList("nav flex-column");
   this.navList.node.id = "side-menu";
   this.navList.node.setAttribute("role","tablist");
   offBody.appendChild(this.navList.node);

   // Auto-close offcanvas on mobile when a nav link is clicked.
   // offcanvas-lg is only active as a drawer below the lg breakpoint (992px);
   // on desktop it is a normal in-flow element so we do nothing there.
   var sideNavNode = this.node;
   offBody.addEventListener("click", function(e){
      var link = e.target.closest("a.nav-link");
      if (!link) return;
      // Skip dropdown toggles — they only expand/collapse sub-menus
      if (link.classList.contains("dropdown-toggle")) return;
      if (window.innerWidth >= 992) return;
      var oc = bootstrap.Offcanvas.getInstance(sideNavNode);
      if (oc) oc.hide();
   });
}

xbSideBar.prototype = new xSection();

xbSideBar.prototype.addItem = function(item){
   // Configurar el item como elemento de navegación
   item.node.classList.add("nav-item");
   if (item.node.tagName === "A"){
      item.node.classList.add("nav-link");
   }
   this.navList.addElement(item);
   return this;
}

xbSideBar.prototype.addDropdown = function(label, dropdown, clss){
   // Crear el botón/enlace para el dropdown
   var toggleBtn = document.createElement("a");
   toggleBtn.className = "nav-link dropdown-toggle";
   toggleBtn.href = "#";
   toggleBtn.setAttribute("data-bs-toggle", "collapse");
   toggleBtn.setAttribute("data-bs-target", "#" + dropdown.node.id);
   toggleBtn.setAttribute("role", "button");
   toggleBtn.setAttribute("aria-expanded", "false");
   toggleBtn.setAttribute("aria-controls", dropdown.node.id);
   toggleBtn.innerHTML = label;
   toggleBtn.onclick = function(e){
      e.preventDefault();
      return false;
   }
   
   var li = document.createElement("li");
   li.className = "nav-item";
   li.appendChild(toggleBtn);
   
   // Agregar el dropdown
   dropdown.node.classList.add("collapse");
   li.appendChild(dropdown.node);
   
   this.navList.node.appendChild(li);
   return this;
}

xbSideBar.prototype.show = function(){
   this.node.style.display = "block";
   return this;
}

xbSideBar.prototype.hide = function(){
   this.node.style.display = "none";
   return this;
}

/* xbSideBarDropdown - Bootstrap 5 */

function xbSideBarDropdown(clss){
   xSection.call(this,"nav flex-column ps-3 " + (clss || ""));
   this.node.classList.add("collapse");
}

xbSideBarDropdown.prototype = new xSection();

xbSideBarDropdown.prototype.addItem = function(item){
   item.node.classList.add("nav-item");
   if (item.node.tagName === "A"){
      item.node.classList.add("nav-link");
   }
   this.addElement(item);
   return this;
}

xbSideBarDropdown.prototype.setId = function(id){
   this.node.id = id;
   return this;
}

/* xbSideBarItem - Item para el sidebar */

function xbSideBarItem(label, href, icon, clss){
   xLink.call(this, label, href || "#", "nav-link " + (clss || ""));
   this.node.classList.add("nav-item");
   
   if (icon){
      var iconEl = document.createElement("i");
      iconEl.className = icon;
      iconEl.style.marginRight = "8px";
      this.node.insertBefore(iconEl, this.node.firstChild);
   }
}

xbSideBarItem.prototype = new xLink();

xbSideBarItem.prototype.setActive = function(active){
   if (active){
      this.node.classList.add("active");
   }
   else{
      this.node.classList.remove("active");
   }
   return this;
}


/* xbModal */

function xbModal(title,clss,dlg_clss,staticBackdrop){
   xSection.call(this,"modal fade " + (clss || ""));
   this.node.setAttribute("tabindex","-1");
   this.node.setAttribute("aria-hidden","true");
   this.node.id = this.id;
   this.staticBackdrop = staticBackdrop !== false;

   this.dialog = new xSection("modal-dialog " + (dlg_clss || ""));
   this.content = new xSection("modal-content");
   
   this.header = new xSection("modal-header");
   var closeBtn = document.createElement("button");
   closeBtn.type = "button";
   closeBtn.className = "btn-close";
   closeBtn.setAttribute("data-bs-dismiss","modal");
   closeBtn.setAttribute("aria-label","Close");
   
   var titleEl = document.createElement("h1");
   titleEl.className = "modal-title fs-5";
   titleEl.innerHTML = title;
   
   this.header.node.appendChild(titleEl);
   this.header.node.appendChild(closeBtn);
   
   this.body = new xSection("modal-body");
   this.footer = new xSection("modal-footer");
   
   this.content.addElement(this.header)
              .addElement(this.body)
              .addElement(this.footer);
   
   this.dialog.addElement(this.content);
   this.addElement(this.dialog);
   this.setToTop();
}

xbModal.prototype = new xSection();

xbModal.prototype.addToFooter = function(element){
   this.footer.addElement(element);
   return this;
}

xbModal.prototype.addToBody = function(element){
   this.body.addElement(element);
   return this;
}

xbModal.prototype.addCloseButton = function(label,clss){
   var cbtn = new xbButton(label,clss || "btn-secondary");
   cbtn.node.setAttribute("data-bs-dismiss","modal");
   this.footer.addElement(cbtn);
   return this;
}

xbModal.prototype.show = function(){
   var modal = new bootstrap.Modal(this.node,{backdrop: this.staticBackdrop ? "static" : true});
   modal.show();
   return this;
}

xbModal.prototype.hide = function(){
   var modal = bootstrap.Modal.getInstance(this.node);
   if (modal) modal.hide();
   return this;
}

/* Restored without jQuery, which the Bootstrap 3 version used to bind the
   hidden.bs.modal event. */

xbModal.prototype.setAutoRemove = function(autoremove){
   var modal = this;
   if (this.autoRemoveHandler){
      this.node.removeEventListener("hidden.bs.modal",this.autoRemoveHandler);
      this.autoRemoveHandler = null;
   }
   if (autoremove){
      this.autoRemoveHandler = function(){modal.remove()};
      this.node.addEventListener("hidden.bs.modal",this.autoRemoveHandler);
   }
   return this;
}

xbModal.prototype.remove = function(){
   this.hide();
   this.removeNode();
   if (this.parent)
      this.parent.removeElement(this);
   return this;
}

/* xbModalOpenButton */

function xbModalOpenButton(label,modal,clss){
   xbButton.call(this,label,clss || "btn-primary");
   this.node.setAttribute("data-bs-toggle","modal");
   this.node.setAttribute("data-bs-target",modal.getHashId());
}

xbModalOpenButton.prototype = new xbButton();

/* xbListGroup */

function xbListGroup(clss){
   xSection.call(this,"list-group " + (clss || ""));
}

xbListGroup.prototype = new xSection();

xbListGroup.prototype.addItem = function(item){
   this.addElement(item);
   return this;
}

/* xbListGroupItem */

function xbListGroupItem(label,clss){
   xLink.call(this,label,"#","list-group-item list-group-item-action " + (clss || ""));
}

xbListGroupItem.prototype = new xLink();


/* Not checked by AI */


/* xbMediaList */

function xbMediaList(clss){
   xMultiHtml.call(this,"ul","media-list " + (clss || ""));
}

xbMediaList.prototype = new xMultiHtml();

/* xbMediaItem */

function xbMediaItem(heading,src,alt,clss,iclss){
   xMultiHtml.call(this,"li","media");
   this.media = new xSection(clss || "media-left");
   this.a = new xLink("","#");
   this.img = new xImage(src,alt,"media-object " + (iclss || ""));
   this.body = new xSection("media-body");
   this.body.addElement(new xHtml("h4",heading,"media-heading"));
   this.a.addElement(this.img);
   this.media.addElement(this.a);
   this.addElement(this.media)
       .addElement(this.body);
}

xbMediaItem.prototype = new xMultiHtml();

xbMediaItem.prototype.addToBody = function(element){
   this.body.addElement(element);
   return this;
}

xbMediaItem.prototype.bindFunction = function(f){
   this.a.bindFunction(f);
}



/* xbTheme     */

function xbTheme(label,ct){
   var myself = this;
   this.themes =
            [{label: "aCelery", value: "acelery"},
             {label: "Cerulean", value: "cerulean"},
             {label: "Cosmo", value: "cosmo"},
             {label: "Cyborg", value: "cyborg"},
             {label: "Darkly", value: "darkly"},
             {label: "Default", value: "default"},
             {label: "Flatly", value: "flatly"},
             {label: "Journal", value: "journal"},
             {label: "Lumen", value: "lumen"},
             {label: "Paper", value: "paper"},
             {label: "Readable", value: "readable"},
             {label: "Sandstone", value: "sandstone"},
             {label: "Simplex", value: "simplex"},
             {label: "Slate", value: "slate"},
             {label: "Spacelab", value: "spacelab"},
             {label: "Superhero", value: "superhero"},
             {label: "United", value: "united"},
             {label: "Yeti", value: "yeti"}];
   this.currTheme = ct || "acelery";
   xbSelect.call(this,label);
   this.addOptions(this.themes);
   this.bindToEvent("change",function(){myself.setTheme(myself.getValue())});
   this.setSelected(this.currTheme);
}

xbTheme.prototype = new xbSelect();

xbTheme.prototype.setTheme = function(th){
   var link = document.createElement("link");
       link.id = "xbtheme";
       link.type = "text/css";
       link.rel = "stylesheet";
       link.href = "/tools/css/bootstrap_themes/" + th.toLowerCase() + "/bootstrap.min.css";
   var head = document.getElementsByTagName("head")[0];
   var plink = document.getElementById("xbtheme");
   if (plink)
      head.removeChild(plink);
   head.appendChild(link);
   this.currTheme = th;
   if (reqCssFiles.length > 0)
      LazyLoad.css(reqCssFiles,function(){});
}

/*  xbCarousel  */

function xbCarousel(clss){
   xSection.call(this,"carousel slide " + (clss || ""));
   this.inx = 0;
   this.node.dataset.ride = "carousel";
   this.indicator = new xMultiHtml("ol","carousel-indicators");
   this.slidewrap = new xSection("carousel-inner");
   this.slidewrap.node.setAttribute("role","listbox");
   this.addElement(this.indicator)
       .addElement(this.slidewrap);

   this.leftctl = new xLink("",this.getHashId(),"carousel-control-prev");
   this.leftctl.node.setAttribute("data-bs-slide","prev");
   this.leftctl.node.setAttribute("data-bs-target",this.getHashId());
   this.leftctl.node.setAttribute("role","button");
   var lc = new xSpan("","carousel-control-prev-icon");
   lc.node.setAttribute("aria-hidden","true");
   this.leftctl.addElement(lc);

   this.rightctl = new xLink("",this.getHashId(),"carousel-control-next");
   this.rightctl.node.setAttribute("data-bs-slide","next");
   this.rightctl.node.setAttribute("data-bs-target",this.getHashId());
   this.rightctl.node.setAttribute("role","button");
   var rc = new xSpan("","carousel-control-next-icon");
   rc.node.setAttribute("aria-hidden","true");
   this.rightctl.addElement(rc);

   this.addElement(this.leftctl)
       .addElement(this.rightctl);
}

xbCarousel.prototype = new xSection();

xbCarousel.prototype.addSlide = function(slide){
   var clss = "";
   if (this.inx == 0){
      clss = "active";
      slide.node.className = "item active";
   }
   this.slidewrap.addElement(slide);
   var ind = new xHtml("li","",clss);
   ind.node.dataset.target = this.getHashId();
   ind.node.setAttribute("data-bs-slide-to", this.inx);
   this.indicator.addElement(ind);
   this.inx++;
}


/* xbSlide */

function xbSlide(imgsrc,caption,imgclss){
   xSection.call(this,"item");
   this.image = new xImage(imgsrc,"",imgclss);
   this.caption = new xSection("carousel-caption");
   if (caption)
      this.caption.addElement(caption);
   this.addElement(this.image)
       .addElement(this.caption);
}

xbSlide.prototype = new xSection();
;

