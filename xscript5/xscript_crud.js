/*  Copyright 2014: Xavier Llamas Rolland                      */
/*                                                             */
/*  This software distributed under the GPLv3 License          */
/*                                                             */
////////////////////////////////////////////////////////////////




/* xbValidator */

function xbValidator(){
}

xbValidator.prototype.validate = function(value){
   return true;
}

/* xbNotEmptyValidator */

function xbNotEmptyValidator(){
   xbValidator.call(this);
}

xbNotEmptyValidator.prototype = new xbValidator();

xbNotEmptyValidator.prototype.validate = function(value){
   return (value != "");
}

/* xbEmailValidator */

function xbEmailValidator(){
   xbValidator.call(this);
}

xbEmailValidator.prototype = new xbValidator();

xbEmailValidator.prototype.validate = function(value){
   var re = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,6}$/;

   return re.test(value);
}

/* xbTelValidator */

function xbTelValidator(){
   xbValidator.call(this);
}

xbTelValidator.prototype = new xbValidator();

xbTelValidator.prototype.validate = function(value){
   var re = /^[-+.() 0-9]+$/;

   return re.test(value);
}

/* xbNotZeroValidator */

function xbNotZeroValidator(){
   xbValidator.call(this);
}

xbNotZeroValidator.prototype = new xbValidator();

xbNotZeroValidator.prototype.validate = function(value){
   return (value != 0);
}

/* xbField      */

function xbField(t,tit,name,il,is){
   this.type = t;
   this.title = tit;
   this.fname = name;
   this.inlist = il;
   this.insearch = is;
   this.input = null;
   this.sqlquoted = true;
   this.range = false;
   this.readonly = false;
   this.validators = [];

   if ((t == "number" ) || (t == "money"))
      this.sqlquoted = false;
   if ((t == "number" ) || (t == "money") || (t == "date"))
      this.range = true;
}

xbField.prototype.getTitle = function(){
   return this.title;
}

xbField.prototype.getName = function(){
   return this.fname;
}

xbField.prototype.setReadOnly = function(r){
   this.readonly = r;
   return this;
}

xbField.prototype.format = function(v){

   if (this.type == "number"){
      return new xbPara(v,"text-right");
   }
   else
   if (this.type == "money"){
      v = v.formatMoney(2,".",",");
      return new xbPara(v,"text-right");
   }
   else
      return new xbPara(v,"text-left");

}

xbField.prototype.setValue = function(v){
   this.input.setValue(v);
   return this;
}

xbField.prototype.clear = function(){
   this.setValue("");
   return this;
}

xbField.prototype.getInput = function(){
   if (this.type == "string"){
      this.input = new xbStringInput(this.title,this.fname);
   }
   else
   if (this.type == "number"){
      this.input = new xbNumberInput(this.title,this.fname);
   }
   else
   if (this.type == "money"){
      this.input = new xbNumberInput(this.title,this.fname);
   }
   else
   if (this.type == "date"){
      this.input = new xbDateInput(this.title,this.fname);
   }
   else
   if (this.type == "email"){
      this.input = new xbEmailInput(this.title,this.fname);
   }
   else
   if (this.type == "tel"){
      this.input = new xbTelInput(this.title,this.fname);
   }
   else
      this.input = new xbStringInput(this.title,this.fname);

   this.input.setReadOnly(this.readonly)
             .setPlaceholder(this.title);
   return this.input;
}

xbField.prototype.getValue = function(){
   return this.input.getValue();
}

xbField.prototype.addValidator = function(validator){
   this.validators.push(validator);
   return this;
}

xbField.prototype.validate = function(){
   var result = true;
   var r;
   var value = this.getValue();

   for (var i = 0; i < this.validators.length; i++){
      r = this.validators[i].validate(value);
      if (r)
         this.input.setError(false);
      else
         this.input.setError(true);
      result = result && r;
   }

   return result;
}

/*   xbTextAreaField     */

function xbTextAreaField(tit,name,rows,inl,ins){
   xbField.call(this,"textarea",tit,name,inl,ins);
   this.input = new xbTextAreaInput(this.title,this.fname,rows)
                    .setPlaceholder(this.title);
}

xbTextAreaField.prototype = new xbField();

xbTextAreaField.prototype.getInput = function(){
   this.input.setReadOnly(this.readonly);
   return this.input;
}

/*   xbCheckboxField     */

function xbCheckboxField(tit,name,onval,offval,inl,ins){
   xbField.call(this,"checkbox",tit,name,inl,ins);
   this.onvalue = onval;
   this.offvalue = offval;
   this.input = new xbCheckBox(this.title,this.fname);
}

xbCheckboxField.prototype = new xbField();

xbCheckboxField.prototype.getInput = function(){
   this.input.setReadOnly(this.readonly);
   return this.input;
}

xbCheckboxField.prototype.getValue = function(){
   if (this.input.getValue())
      return this.onvalue;
   else
      return this.offvalue;
}

xbCheckboxField.prototype.setValue = function(v){
   if (v == this.onvalue)
      this.input.setChecked(true);
   else
      this.input.setChecked(false);
   return this;
}

xbCheckboxField.prototype.format = function(v){
   return new xbPara(v,"text-left");
}

xbCheckboxField.prototype.clear = function(){
   this.setValue(this.offvalue);
   return this;
}

/* xbListField */

function xbListField(t,tit,name,inl,ins){
   xbField.call(this,t,tit,name,inl,ins);
   this.range = false;
   this.input = new xbSelect(this.title,this.fname);
   this.options = [];
}

xbListField.prototype = new xbField();

xbListField.prototype.getInput = function(){
   this.input.setReadOnly(this.readonly);
   return this.input;
}

xbListField.prototype.addOption = function(l,v){
   this.input.addOption(l,v);
   this.options.push({label: l, value: v});
   return this;
}

xbListField.prototype.addOptions = function(opt){
   this.input.addOptions(opt);
   this.options = opt;
   return this;
}

xbListField.prototype.format = function(v){
   var l = "";

   for (var i = 0; i < this.options.length; i++){
      if (this.options[i].value == v){
         l = this.options[i].label;
         break;
      }
   }
   return new xbPara(l,"text-left");
}

xbListField.prototype.clear = function(){
   this.input.clear();
   return this;
}

/* xbTableListField */

function xbTableListField(db,tit,name,table,fld,inl,ins){
  xbListField.call(this,"number",tit,name,inl,ins);
  var row;
  var q = "select rowid," + fld + " from " + table + " order by " + fld;
  if (db.sqlSelect(q) == -1)
     return;
  while (row = db.getNextRow()){
     this.addOption(row[fld],row.rowid);
  }
  db.closeCursor();
}

xbTableListField.prototype = new xbListField();

/* xbTableMaint */

function xbTableMaint(xdb,tit,tab){
  this.slaveMode = false;
  this.db = xdb;
  this.title = tit;
  this.table = tab;
  this.fields = [];
  this.record = new Object();
  this.maxrow = 20;
  this.restrict = "";
  this.firstid = 0;
  this.lastid = 0;
  this.linkedTables = [];

  xbTitlePanel.call(this,"");
}

xbTableMaint.prototype = new xbTitlePanel();

xbTableMaint.prototype.addField = function(f){
   this.fields.push(f);
   return this;
}

xbTableMaint.prototype.clearRestrict = function(){
   this.restrict = "";
   return this;
}

xbTableMaint.prototype.list = function(fid,lid){
   var myself = this;
   var first = true;
   var rest = "";
   var row, f;
   var btnSize = "";
   var firstid = 0;
   var lastid = 0;
   var last = 9007199254740992;
   var q;

   function showRec(id){
      return function(){myself.show(id)}
   }

   if (this.restrict != "")
      rest = " and " + this.restrict;

   if (this.slaveMode){
      q = "select rowid,* from " + this.table + " where " + this.linkFld + " = " + this.linkId + " order by rowid";
   }
   else{
      q = "select rowid,* from " + this.table + " where ";
      if (fid == 0)
         q += "rowid >= " + lid + rest + " order by rowid limit " + this.maxrow;
      else
         q += "rowid <= " + fid + rest + " order by rowid desc limit " + this.maxrow;
   }

   if (this.db.sqlSelect(q) == -1)
      return;
   this.clear();
   if (this.slaveMode)
      this.setTitle(this.title);
   else
      this.setTitle(this.title + " - " + "List");
   var table = new xbElementsTable();
   var headings = [];
   if (this.slaveMode)
      headings.push(new xText("Details"));
   else
      headings.push(new xText("Id"));
   for (var i = 0; i <this.fields.length; i++ ){
      if (this.fields[i].inlist)
         if (!this.slaveMode || (this.fields[i].getName() != this.linkFld))
            headings.push(new xText(this.fields[i].getTitle()));
   }
   table.addHeadings(headings);
   if (fid == 0){
      while (row = this.db.getNextRow()){
         if (first)
            firstid = row.rowid;
         first = false;
         if (this.slaveMode){
            var btn = new xbButtonIcon("","glyphicon-info-sign",false,"btn-primary")
                          .bindFunction(showRec(row.rowid));
         }
         else{
            var btn = new xbButton(row.rowid,"btn-primary")
                          .bindFunction(showRec(row.rowid));
         }
         var rlist = [btn];
         for (var i = 0; i < this.fields.length; i++){
            if (this.fields[i].inlist){
               if (!this.slaveMode || (this.fields[i].getName() != this.linkFld))
                  rlist.push(this.fields[i].format(row[this.fields[i].getName()]));
            }
         }
         table.addRow(rlist);
      }
   }
   else{
      this.db.gotoLastRow();
      while (row = this.db.getPrevRow()){
         if (first)
            lastid = row.rowid;
         first = false;
         var btn = new xbButton(row.rowid,"btn-primary")
                       .bindFunction(showRec(row.rowid));
         var rlist = [btn];
         for (var i = 0; i < this.fields.length; i++){
            if (this.fields[i].inlist){
               rlist.push(this.fields[i].format(row[this.fields[i].getName()]));
            }
         }
         table.addRow(rlist);
      }
   }
   if (row)
      firstid = row.rowid;
   this.db.closeCursor();
   this.addElement(table);
   if (!this.slaveMode){
      if (window.innerWidth < 768)
         btnSize = "btn-group-sm";
      if (window.innerWidth < 500)
         btnSize = "btn-group-xs";
   }
   var newBtn = new xbButton("New","btn-primary")
                    .bindFunction(function(){myself.empty()});
   var btnGrp = new xbButtonGroup(btnSize)
                    .addButton(newBtn);
   if (!this.slaveMode){
      var firstBtn = new xbButton("First")
                        .bindFunction(function(){myself.list(0,0)});
      var prevBtn = new xbButton("Prev.")
                        .bindFunction(function(){myself.list(firstid,0)});
      var nextBtn = new xbButton("Next")
                        .bindFunction(function(){myself.list(0,lastid)});
      var lastBtn = new xbButton("Last")
                        .bindFunction(function(){myself.list(last,0)});
      var searchBtn;
      if (this.restrict == "")
         searchBtn = new xbButton("Search")
                         .bindFunction(function(){myself.find()});
      else
         searchBtn = new xbButton("Clear Search")
                         .bindFunction(function(){myself.clearRestrict(); myself.list(0,0)});

      btnGrp.addButton(firstBtn)
            .addButton(prevBtn)
            .addButton(nextBtn)
            .addButton(lastBtn)
            .addButton(searchBtn);
   }

   var center = new xMultiHtml("center")
                    .addElement(btnGrp);
   this.addElement(center);
   return this;
}

xbTableMaint.prototype.show = function(id){
   var myself = this;
   var q = "select rowid,* from " + this.table + " where rowid = " + id;
   var v,t;
   if (this.db.sqlSelect(q) == -1)
      return;
   this.record = this.db.getNextRow();
   this.db.closeCursor();
   this.clear();
   if (!this.slaveMode)
      this.setTitle(this.title + " - " + "Record");
   var stable = new xbElementsTable();
   for (var i = 0; i < this.fields.length; i++){
      if (!this.slaveMode || (this.fields[i].getName() != this.linkFld)){
         v = this.fields[i].format(this.record[this.fields[i].getName()]);
         t = new xHtml("b",this.fields[i].getTitle());
         stable.addRow([t,v]);
      }
   }
   this.addElement(stable);
   var btnGrp = new xbButtonGroup();
   var editBtn = new xbButton("Edit","btn-primary")
                     .bindFunction(function(){myself.edit(id)});
   var deleteBtn = new xbButton("Delete")
                       .bindFunction(function(){myself.del(id)});
   var cancelBtn = new xbButton("Ok")
                       .bindFunction(function(){myself.list(0,0)});
   btnGrp.addButton(editBtn)
         .addButton(deleteBtn)
         .addButton(cancelBtn);
   var specialActions = this.specialActionsMenu(id);
   if (specialActions.length > 0){
      var saDropdown = new xbButtonDropdown("Special ");
      for (var i = 0; i < specialActions.length; i++){
         saDropdown.addItem(new xbButtonDropdownItem(specialActions[i].label,specialActions[i].bind));
      }
      btnGrp.addButton(saDropdown);
   }
   var center = new xMultiHtml("center")
                    .addElement(btnGrp);
   this.addElement(center);
   for(var i = 0; i < this.linkedTables.length; i++){
      this.linkedTables[i].table.setSlaveParams(this.linkedTables[i].linkFld,id);
      this.addElement(new xHtml("br"));
      this.addElement(this.linkedTables[i].table);
      this.linkedTables[i].table.run();
   }
   return this;
}

xbTableMaint.prototype.find = function(){
   var myself = this;
   this.clear();
   if (!this.slaveMode)
      this.setTitle(this.title + " - " + "Search");
   var stable = new xbElementsTable();
   for (var i = 0; i < this.fields.length; i++){
      if (this.fields[i].insearch){
         var c = new xbCheckBox("",this.fields[i].getName() + "_x");
         var s = new xSection();
         var s1 = this.fields[i].getInput();
         s1.setName(this.fields[i].getName() + "_s1");
         s.addElement(s1);
         if (this.fields[i].range){
            var s2 = this.fields[i].getInput();
            s2.setName(this.fields[i].getName() + "_s2");
            s.addElement(new xText(" - "))
             .addElement(s2);
         }
         stable.addRow([c,s]);
      }
   }
   this.addElement(stable);
   var btnGrp = new xbButtonGroup();
   var searchBtn = new xbButton("Search","btn-primary")
                     .bindFunction(function(){myself.findResult()});
   var cancelBtn = new xbButton("List")
                       .bindFunction(function(){myself.list(0,0)});
   btnGrp.addButton(searchBtn)
         .addButton(cancelBtn);
   var center = new xMultiHtml("center")
                    .addElement(btnGrp);
   this.addElement(center);
   return this;
}

xbTableMaint.prototype.findResult = function(){
   var check, in1, in2, v1, fld;
   var q = "";
   var v2 = "";
   var first = true;
   for (var i = 0; i < this.fields.length; i++){
      fld = this.fields[i];
      if (fld.insearch){
         check = document.getElementsByName(fld.getName() + "_x")[0];
         if (check.checked){
            if (!first)
               q += " and ";
            first = false;
            in1 = document.getElementsByName(fld.getName() + "_s1")[0];
            v1 = in1.value.trim();
            if (fld.range){
               in2 = document.getElementsByName(fld.getName() + "_s2")[0];
               v2 = in2.value.trim();
            }
            if (v2 == ""){
               if (fld.sqlquoted){
                  if (fld.type == "date")
                     q += "(" + fld.getName() + " = '" + v1 + "')"
                  else
                     q += "(" + fld.getName() + " like '" + v1 + "%')";
               }
               else {
                  q += "(" + fld.getName() + " = " + v1 + ")";
               }
            }
            else{
               if (fld.sqlquoted){
                  q += "(" + fld.getName() + " >= '" + v1 + "' and " + fld.getName + " <= '" + v2 + "')";
               }
               else{
                  q += "(" + fld.getName() + " >= " + v1 + " and " + fld.getName + " <= " + v2 + ")";
               }
            }
         }
      }
   }
   this.restrict = q;
   this.list(0,0);
}

xbTableMaint.prototype.empty = function(){
   var myself = this;
   this.clear();
   if (!this.slaveMode)
      this.setTitle(this.title + " - " + "New");
   var form = new xSection();
   for (var i = 0; i < this.fields.length; i++){
      if (!this.slaveMode || (this.fields[i].getName() != this.linkFld))
         form.addElement(this.fields[i].getInput());
   }
   var btnGrp = new xbButtonGroup();
   var editBtn = new xbButton("Save","btn-primary")
                     .bindFunction(function(){myself.insert()});
   var cancelBtn = new xbButton("Cancel")
                       .bindFunction(function(){myself.list(0,0)});
   btnGrp.addButton(editBtn)
         .addButton(cancelBtn);
   var center = new xMultiHtml("center")
                    .addElement(btnGrp);
   form.addElement(center);
   this.addElement(form);
   return this;
}

xbTableMaint.prototype.readForm = function(){
   for (var i = 0; i < this.fields.length; i++){
      if (!this.slaveMode || (this.fields[i].getName() != this.linkFld))
         this.record[this.fields[i].getName()] = this.fields[i].getValue().trim();
   }
   if (this.slaveMode){
      this.record[this.linkFld] = this.linkId;
   }
}

xbTableMaint.prototype.validateFields = function(){
   var result = true;
   var r;

   for (var i = 0; i < this.fields.length; i++){
      if (!this.slaveMode || (this.fields[i].getName() != this.linkFld)){
         r = this.fields[i].validate();
         result = result && r;
      }
   }
   if (!result)
      xAlertDialog(this.title,"Correct fields with error!");
   return result;
}

xbTableMaint.prototype.insert = function(){
   this.readForm();
   if (!this.validateFields() || !this.validateForm())
      return;
   this.preNew();
   var q = "insert into " + this.table + "(";
   var first = true;
   for (var i = 0; i < this.fields.length; i++){
      if (!first){
         q += ",";
      }
      first = false;
      q += this.fields[i].getName();
   }
   q += ") values (";
   first = true;
   for (var i = 0; i < this.fields.length; i++){
      if (!first){
         q += ",";
      }
      first = false;
      if (this.fields[i].sqlquoted)
         q += "'" + this.record[this.fields[i].getName()] + "'";
      else
         q += this.record[this.fields[i].getName()];
   }
   q += ")";
   var id = this.db.sqlInsert(q);
   this.postNew(id);
   this.show(id);
}

xbTableMaint.prototype.edit = function(id){
   var myself = this;
   this.clear();
   if (!this.slaveMode)
      this.setTitle(this.title + " - " + "Edit");
   var form = new xSection();
   for (var i = 0; i < this.fields.length; i++){
      if (!this.slaveMode || (this.fields[i].getName() != this.linkFld)){
         form.addElement(this.fields[i].getInput());
         this.fields[i].setValue(this.record[this.fields[i].getName()]);
      }
   }
   var btnGrp = new xbButtonGroup();
   var editBtn = new xbButton("Save","btn-primary")
                     .bindFunction(function(){myself.save(id)});
   var cancelBtn = new xbButton("Cancel")
                       .bindFunction(function(){myself.show(id)});
   btnGrp.addButton(editBtn)
         .addButton(cancelBtn);
   var center = new xMultiHtml("center")
                    .addElement(btnGrp);
   form.addElement(center);
   this.addElement(form);
   return this;
}

xbTableMaint.prototype.save = function(id){
   this.readForm();
   if (!this.validateFields() || !this.validateForm())
      return;
   this.preEdit(id);
   var q = "update " + this.table + " set ";
   var first = true;
   for (var i = 0; i < this.fields.length; i++){
      if (!first){
         q += ",";
      }
      first = false;
      q += this.fields[i].getName() + " = ";
      if (this.fields[i].sqlquoted)
         q += "'" + this.record[this.fields[i].getName()] + "'";
      else
         q += this.record[this.fields[i].getName()];
   }
   q += " where rowid = " + id;
   this.db.sqlExec(q);
   this.postEdit(id);
   this.show(id);
}

xbTableMaint.prototype.del = function(id){
   if (confirm("Delete Record?")){
      this.preDelete(id);
      var q = "delete from " + this.table + " where rowid = " + id;
      this.db.sqlExec(q);
      this.postDelete(id);
      this.list(0,0);
   }
}

xbTableMaint.prototype.setSlaveParams = function(lf,lid){
   this.slaveMode = true;
   this.linkFld = lf;
   this.linkId = lid;
   return this;
}

xbTableMaint.prototype.addLinkedTable = function(tab,lf){
   this.linkedTables.push({table: tab, linkFld: lf});
}

xbTableMaint.prototype.run = function(){
   this.list(0,0);
   return this;
}


/*      Redefine for advanced functionality         */

xbTableMaint.prototype.validateForm = function(){
   return true;  /* input data in this.record */
}

xbTableMaint.prototype.preNew = function(){            /* called before generating insert query, data in this.record */
}

xbTableMaint.prototype.postNew = function(id){         /* called after sql insert, id is new id assigned on insert */
}

xbTableMaint.prototype.preEdit = function(id){         /* called before generating update query, data in this.record */
}

xbTableMaint.prototype.postEdit = function(id){        /* called after sql update */
}

xbTableMaint.prototype.preDelete = function(id){         /* called before generating delete query */
}

xbTableMaint.prototype.postDelete = function(id){        /* called after sql delete */
}

xbTableMaint.prototype.specialActionsMenu = function(id){
   return [];  /* return array of objects {label: "mylabel", bind: function(){}} */
}
;
