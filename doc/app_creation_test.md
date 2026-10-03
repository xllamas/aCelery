## aCelery app creation tests

### Claude

Requested Anthropic's Claude Opus 5 model to create an aCelery app with this prompt:

`Using the aCelery MCP create an aCelery app that will manage my cooking recipes. Each recipe should show as a tabbed view with tabs for ingredients, procedure, photos, notes and source. Ingredients, procedure and notes should contain a text box for free text, photos should allow adding photos from the camera or gallery and source a field for an URL . There should be a table of categories; recipes should have their name and category. On the main screen there should be controls to browse, search and view recipes, add new recipes and update the categories table`

Claude Desktop on Pro plan created, ran and tested a fully funcional aCelery app in arround 4 minutes.

### DeepSeek

Requested DeepSeek's deepseek-V4.1-flash model on the Jan harness to create an aCelery app with this prompt:

`Using the aCelery MCP create an aCelery app that will keep track of the books I’ve read. Each book should show the standard bibliographical data, a text box field for notes and a cover photograph . There should be a table of categories; books should be linked to a category. On the main screen there should be controls to browse, search and view books, add new books and update the categories table. When creating a book there should be an option to obtain all the fields including the cover photo using the openlibrary.org free API using the ISBN of the book`

DeepSeek created, ran and tested a fully functional aCelery app using 7,113,434 tokens (6,672,896 input cache hit, 341,743 input cache miss, 98,795 output), at an off-peak cost of US$ 0.13

DeepSeek did look at the Recipes app and closely modeled the Books app on it, but the Books app does have the added complexity of accessing an external API
