var db, topLayout, myModal;

function initDB(){
   db = new xSQL();
   db.openDB("xtest.db");
   db.sqlExec("create table if not exists person (mname string, email string, grp string)");
   db.sqlExec("create table if not exists person_tel (person integer, tel string, type string)");

}

function tabsTest(){
   var myTabs = new xbTabs();
   var pane1 = new xbTabPane();
   var pane2 = new xbTabPane();
   var pane3 = new xbTabPane();
   
   myTabs.addPane("Pane 1", pane1)
         .addPane("Pane 2", pane2)
         .addPane("Pane 3", pane3)
         .activatePane(1);
         
   pane1.addElement(new xbPara("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin et erat et metus auctor cursus. Ut congue facilisis velit sit amet dapibus"));
   pane2.addElement(new xbPara("Nam pellentesque porta odio, eu auctor felis viverra eget. Aenean tortor ligula, ornare quis tristique in, fermentum nec elit. Lorem ipsum dolor sit amet"));
   pane3.addElement(new xbPara("Nullam et orci consequat, feugiat nisi in, consectetur mauris. Aenean nec imperdiet augue. Etiam placerat neque lectus, vel volutpat justo dapibus sed"));
   var e;
   if (e = topLayout.getElement(1,0))
      e.remove();
   topLayout.addElement(myTabs,1,0);
}

function widgetTest(){
   var panel = new xbTitlePanel("Widgets");
   
   var btnGroup = new xbButtonGroup()
                      .addElement(new xbButton("Button","btn-primary"))
                      .addElement(new xbButtonIcon("Icon","fa-solid fa-asterisk"))
                      .addElement(new xbButtonDropdown("Dropdown")
                                      .addItem(new xbButtonDropdownItem("Item 1",null))
                                      .addItem(new xbButtonDropdownItem("Item 2",null))
                                      .addItem(new xbButtonDropdownItem("Item 3",null)));
   panel.addElement(new xbImage("/user/Example/Redtwitter_icon_48x48.png","Red Twitter"))
        .addElement(new xbTheme("Select Theme"))
        .addElement(new xbStringInput("Input","inp"))
        .addElement(new xbSelect("Select","sel")
                        .addOption("Option 1","1")
                        .addOption("Option 2","2")
                        .addOption("Option 3","3"))
        .addElement(btnGroup);                
                        
   var e;
   if (e = topLayout.getElement(1,0))
      e.remove();
   topLayout.addElement(panel,1,0);
}

function jsonNews(){
   var jsonfeed = new xHTTP().get("http://ajax.googleapis.com/ajax/services/feed/load?v=1.0&num=8&q=http%3A%2F%2Fnews.google.com%2Fnews%3Foutput%3Drss");
   var list = new xbListGroup();
   var data = JSON.parse(jsonfeed);
   for (var i = 0; ((i < data.responseData.feed.entries.length) && (i < 10)); i++){
      var ent = data.responseData.feed.entries[i];
      var item = new xbListGroupItem()
                     .addElement(new xMultiHtml("h3")
                                    .addElement(new xbPara(ent.title,"text-info")))
              .addElement(new xPara(ent.contentSnippet));
      list.addElement(item);
   }
   var e;
   if (e = topLayout.getElement(1,0))
      e.remove();
   topLayout.addElement(list,1,0);
}

function dirExport(){
   var resObj;
   var data = "";
   var myEf = new xExportFile();
   
   db.sqlSelect("select a.rowid, a.*, b.rowid, b.* from person as a, person_tel as b where b.person = a.rowid order by a.mname");
   while (resObj = db.getNextRow()){
      var first = true;
      for(fld in resObj){
         if (!first)
            data += ',';
         first = false;
         data += '"' + resObj[fld] + '"';
      }
      data += '\r\n';
   }
   myEf.set("text/csv","directory.csv",data);
   myEf.get();
}

function showModal(){
   myModal = new xbModal("aCelery Modal");
   myModal.addCloseButton("Close","btn-primary");
   myModal.addToBody(new xbPara("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin et erat et metus auctor cursus. Ut congue facilisis velit sit amet dapibus"));
   myModal.show();
}

function dirMaint(dbl){
   var person = new xbTableMaint(db,"Directory","person")
                 .addField(new xbField("string","Name","mname",true,true)
                               .addValidator(new xbNotEmptyValidator()))
                 .addField(new xbField("email","Email","email",false,true)
                               .addValidator(new xbEmailValidator()))
                 .addField(new xbListField("string","Group","grp",false,true)
                               .addOption("Work","w")
                               .addOption("Friends","f")
                               .addOption("Family","m"));
   if (dbl == "2"){
      var person_tel = new xbTableMaint(db,"Telephones","person_tel")
                           .addField(new xbField("number","Person","person",false,false))
                           .addField(new xbField("tel","Telephone","tel",true,false)
                                         .addValidator(new xbTelValidator()))
                           .addField(new xbListField("string","Type","type",true,false)
                                         .addOption("Work","w")
                                         .addOption("Home","h")
                                         .addOption("Mobile","m"));
      person.addLinkedTable(person_tel,"person");
   }
   var e;
   if (e = topLayout.getElement(1,0))
      e.remove();
   topLayout.addElement(person,1,0);
   person.run();
}

function exit(){
   xCloseApp();
}

function showMenu(){
   var nav, dir;
   
   nav = new xbNavBar("aCelery","acelery_navbar");
   dir = new xbNavBarDropdown("Directory");
   dir.addItem(new xbNavBarItem("CRUD Single")
                    .bindFunction(function(){dirMaint("1")}));
   dir.addItem(new xbNavBarItem("CRUD Linked")
                    .bindFunction(function(){dirMaint("2")}));
   dir.addItem(new xbNavBarItem("Export")
                    .bindFunction(dirExport));
   nav.addDropdown(dir);
   nav.addItem(new xbNavBarItem("Tabs")
                   .bindFunction(tabsTest));
   nav.addItem(new xbNavBarItem("Widgets")
                   .bindFunction(widgetTest));
   nav.addItem(new xbNavBarItem("News")
                   .bindFunction(jsonNews));
   nav.addItem(new xbNavBarItem("Modal")
                   .bindFunction(showModal));
   nav.addItem(new xbNavBarItem("Exit")
                   .bindFunction(exit));
   topLayout = new xbLayout(2,1)
                  .addElement(nav,0,0)
                  .setToTop();
}

/* The entry point. launcher.html imports this file as a module and calls the
   default export; acelery_app.json names the file (§3.2).

   Everything above stays module-scoped rather than global, which works
   unchanged because xScript binds function *references* — .bindFunction(f)
   assigns node.onclick = f — rather than building handler strings that would
   need to resolve a global name.

   The xScript globals this app still uses (xSQL, xbNavBar, …) come from the
   classic <script> tags in launcher.html. Phase 4d rewrites this app onto
   acelery/ui.js, where it will import them instead. */

export default function main(){
   initDB();
   showMenu();
}
