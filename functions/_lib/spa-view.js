/* Helper compartido por functions/why.js y functions/long-sleeve-kits.js.
   Esas rutas sirven el mismo index.html que la portada y el JS (app.js/info.js)
   cambia de vista ~120 ms despues de cargar. Para que el HTML que recibe
   Google ya tenga el texto propio de la ruta (y no el de la portada), la
   Function deja la pagina en el MISMO estado que dejara el JS: oculta las
   secciones de la portada y muestra la de la ruta. El JS luego aplica
   exactamente esos mismos estilos, asi que el diseno y el funcionamiento no
   cambian. Prefijado con "_" para que Pages no lo trate como ruta. */

// Secciones que solo se ven en la portada (= _HOMEPAGE_ONLY_SECTION_IDS de app.js + #landing).
export const HOME_ONLY_IDS = ["landing", "holyGrails", "footballGiants", "longSleeveKits", "advancedSearch", "landingFooter"];

// Pone display:<value> en el atributo style del elemento, respetando el resto del style.
export function setDisplay(el, value) {
  const style = (el.getAttribute("style") || "")
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s && !/^display\s*:/i.test(s));
  style.push("display:" + value);
  el.setAttribute("style", style.join(";"));
}

// Registra en el HTMLRewriter los cambios de visibilidad: oculta la portada y
// aplica `show` ({id: valorDisplay}).
export function applyView(rewriter, show) {
  for (const id of HOME_ONLY_IDS) {
    rewriter.on("#" + id, { element(el) { setDisplay(el, "none"); } });
  }
  for (const [id, value] of Object.entries(show)) {
    rewriter.on("#" + id, { element(el) { setDisplay(el, value); } });
  }
  return rewriter;
}
