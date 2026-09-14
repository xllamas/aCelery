import { getText, postText } from "./bridge.js";
function get(url) {
  return getText({ opt: "http", action: "get", url });
}
function post(url, data) {
  return postText({ opt: "http", action: "post", url }, data);
}
async function getJson(url) {
  return JSON.parse(await get(url));
}
export {
  get,
  getJson,
  post
};
//# sourceMappingURL=http.js.map
